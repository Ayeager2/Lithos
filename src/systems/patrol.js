// Patrol — the combat loop (#66).
//
// One click → one fight against an era-appropriate mob, weighted by the
// mob's `encounterChance`. Resolves through systems/combat.js
// (same passive multi-round path as routine threats). Drops materialize
// from the mob's `drops` table; coin rolls per coin tier. Combat XP
// flows through systems/skills.js gainXp.
//
// Knowledge-gated bosses (see content/bosses.js getBossesAvailable) get
// folded into the roll table at low weight once their requirements are
// met. The BossFightModal opens for those; everything else resolves
// passively in the log.

import { getMob, getMobsForEra } from "../content/mobs.js";
import { getTinkerItem } from "../content/tinker.js";
import { resolveFight, getEffectiveWeapon, getCombatSkillForWeapon } from "./combat.js";
import { getActiveCompanionBonus } from "./companions.js";
import { stampEtchingOnce, isFirstStamp } from "./etchings.js";
import { gainXp, getSkillState } from "./skills.js";
import { getSpdCooldownMult } from "./character.js";
import { computeEra } from "./era.js";
import { randInt } from "../util/rng.js";
import { getBoss, getAllBosses, getBossesAvailable } from "../content/bosses.js";

// Base cooldown — drops with combat-skill level the same way Hunt does.
const PATROL_COOLDOWN_MS = 12_000;
const PATROL_COOLDOWN_FLOOR_MS = 4_000;

export function getPatrolCooldownMs(state) {
  // Use the highest-level combat skill the player has — every combat
  // skill counts equally toward how quickly you recover from a fight.
  const skills = state.run.skills || {};
  const lvl = Math.max(
    skills.swordplay?.level || 0,
    skills.archery?.level || 0,
    skills.magicCombat?.level || 0,
  );
  const reduction = lvl * 300;
  // SPD multiplier (#47) — every +1 SPD shaves 2% off the cooldown.
  const base = Math.max(PATROL_COOLDOWN_FLOOR_MS, PATROL_COOLDOWN_MS - reduction);
  const ms = Math.round(base * getSpdCooldownMult(state));
  return Math.max(PATROL_COOLDOWN_FLOOR_MS, ms);
}

export function canPatrol(state, now = Date.now()) {
  // Era 0 has nothing to patrol — the player hasn't even found the rock.
  const era = computeEra(state);
  if (era < 1) return { ok: false, reason: "There is nothing yet to fight." };

  const weapon = getEffectiveWeapon(state.run);
  if (!weapon || weapon.id === "_fists") {
    return { ok: false, reason: "Equip a weapon before you go looking." };
  }

  const last = state.run.lastPatrolAt || 0;
  const cd = getPatrolCooldownMs(state);
  if (now - last < cd) {
    const remain = Math.ceil((cd - (now - last)) / 1000);
    return { ok: false, reason: `Catch your breath — ${remain}s.` };
  }

  // Mob pool must contain at least one entry for this era.
  const pool = getMobsForEra(era);
  if (pool.length === 0) return { ok: false, reason: "Nothing prowls here yet." };

  return { ok: true };
}

// ─── Roll table builder ───────────────────────────────────────────────
// Mobs for the current era, weighted by encounterChance. Available bosses
// also enter the pool at low weight (BOSS_WEIGHT) — they're shown as a
// rare patrol roll, opening the BossFightModal instead of resolving
// passively.
const BOSS_WEIGHT = 0.05;

function buildRollTable(state) {
  const era = computeEra(state);
  const mobs = getMobsForEra(era);
  const entries = mobs.map((m) => ({
    kind: "mob",
    id: m.id,
    weight: m.encounterChance || 0.5,
  }));

  // Knowledge-gated bosses — only added when getBossesAvailable returns them.
  const bosses = getBossesAvailable(state);
  for (const b of bosses) {
    // Skip bosses already defeated in this run (avoid grinding the same
    // boss back-to-back — they re-enter the pool only across runs).
    if (state.run.mobsDefeated?.[b.id]) continue;
    entries.push({ kind: "boss", id: b.id, weight: BOSS_WEIGHT });
  }
  return entries;
}

function pickFromTable(table, rng = Math.random) {
  const total = table.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const e of table) {
    if (r < e.weight) return e;
    r -= e.weight;
  }
  return table[table.length - 1];
}

// Roll a drop table — each entry { resource, qty:number|[min,max], chance }.
// Butchering skill (#70) bumps chance + qty:
//   chance bonus: +0.01 per level, cap +0.20
//   qty bonus:    +0.05 per level, cap +1.0 (additive multiplier)
function getButcheringBonuses(run) {
  const { level } = getSkillState(run, "butchering");
  return {
    chanceBonus: Math.min(0.20, level * 0.01),
    qtyMult: 1 + Math.min(1.0, level * 0.05),
  };
}

function rollDrops(drops, inventory, run, rng = Math.random) {
  if (!Array.isArray(drops)) return { inventory, parts: [] };
  const { chanceBonus, qtyMult } = getButcheringBonuses(run || {});
  // #203 — companion rune drop bonus (Pet Crow / Spirit Familiar).
  const compBonus = getActiveCompanionBonus({ run });
  const runeBonus = compBonus.runeChanceBonus || 0;
  const next = { ...inventory };
  const parts = [];
  for (const d of drops) {
    // Rune drops (anything ending in "Rune") get the companion bonus.
    const isRune = typeof d.resource === "string" && d.resource.endsWith("Rune");
    const effChance = Math.min(1, (d.chance ?? 1) + chanceBonus + (isRune ? runeBonus : 0));
    if (rng() >= effChance) continue;
    const baseQty = Array.isArray(d.qty)
      ? randInt(rng, d.qty[0], d.qty[1])
      : (d.qty || 1);
    const qty = Math.max(1, Math.floor(baseQty * qtyMult));
    if (qty <= 0) continue;
    next[d.resource] = (next[d.resource] || 0) + qty;
    parts.push(`+${qty} ${d.resource}`);
  }
  return { inventory: next, parts };
}

// ─── Hints for locked bosses ─────────────────────────────────────────
// When a boss is close but locked, we drop an atmospheric "you sense
// something larger" line into the log so the player feels the gate.
const LOCKED_BOSS_HINTS = [
  "🌫️ You hear something larger moving past, then quiet. You are not ready for what made that sound.",
  "🌫️ A shape too big watches from the edge of the patrol. It does not come closer. It does not leave.",
  "🌫️ Tracks. Bigger than they should be. You follow them a while and then choose not to.",
];

// ─── Main entry ──────────────────────────────────────────────────────

export function performPatrol(state, opts = {}, now = Date.now(), rng = Math.random) {
  // Backward-compat: caller passes (state, now, rng) without opts.
  if (typeof opts === "number") { rng = now || Math.random; now = opts; opts = {}; }
  const targetMobId = opts.mobId || null;
  const targetBossId = opts.bossId || null;

  const check = canPatrol(state, now);
  if (!check.ok) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: check.reason }],
    };
  }

  // Targeted click from a PatrolView card. Skip the roll table entirely.
  let pick;
  if (targetMobId) {
    const m = getMob(targetMobId);
    if (!m) {
      return {
        run: state.run,
        persistent: state.persistent,
        events: [{ kind: "actionFail", message: "That foe is not here." }],
      };
    }
    pick = { kind: "mob", id: targetMobId, weight: 1 };
  } else if (targetBossId) {
    const b = getBoss(targetBossId);
    if (!b) {
      return {
        run: state.run,
        persistent: state.persistent,
        events: [{ kind: "actionFail", message: "Unknown challenge." }],
      };
    }
    // Verify the boss is actually unlocked before letting them try it.
    const unlockedIds = new Set(getBossesAvailable(state).map((x) => x.id));
    if (!unlockedIds.has(targetBossId)) {
      return {
        run: state.run,
        persistent: state.persistent,
        events: [{ kind: "actionFail", message: "You are not ready." }],
      };
    }
    pick = { kind: "boss", id: targetBossId, weight: 1 };
  } else {
    const table = buildRollTable(state);
    pick = pickFromTable(table, rng);
  }

  if (!pick) {
    return {
      run: { ...state.run, lastPatrolAt: now },
      persistent: state.persistent,
      events: [{ kind: "patrol", message: "🌫️ A long, empty walk. Nothing comes." }],
    };
  }

  // Boss roll → return a "challenge" event that the UI surfaces by
  // auto-opening the BossFightModal. We bookmark the boss id on the run
  // so Shell can read it; the modal commits results through its own
  // BOSS_FIGHT_END flow (unchanged from #40).
  if (pick.kind === "boss") {
    const boss = getBoss(pick.id);
    return {
      run: {
        ...state.run,
        lastPatrolAt: now,
        patrolBossEncounter: pick.id,
      },
      persistent: state.persistent,
      events: [
        {
          kind: "patrol",
          message: `🩸 ${boss?.name || "Something massive"} steps out of the dust. Engagement begins.`,
        },
      ],
    };
  }

  // Regular mob fight — passive resolution.
  const mob = getMob(pick.id);
  if (!mob) {
    return {
      run: { ...state.run, lastPatrolAt: now },
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "The trail goes cold." }],
    };
  }

  // Opener line for atmosphere — most flavor comes from inside resolveFight.
  const events = [];
  events.push({
    kind: "patrol",
    message: `🗡️ You set out on patrol.`,
  });

  // #223 — apply queued tinker item (consumed by this encounter).
  let tinkerAutoWin = false;
  let tinkerEarlyState = state;
  const at = state.run.activeTinker;
  if (at) {
    if (at.useKind === "patrol-set" && at.effect?.autoWinChance && rng() < at.effect.autoWinChance) {
      tinkerAutoWin = true;
      events.push({ kind: "milestone", message: `🪤 Your trap caught the ${mob.name} before you arrived. Auto-win.` });
    } else if (at.useKind === "combat-throw") {
      events.push({ kind: "info", message: `🪛 You deploy your prepared ${getTinkerItem(at.id)?.name || at.id}.` });
    }
    tinkerEarlyState = { ...state, run: { ...state.run, activeTinker: null } };
  }

  // Auto-win path skips combat entirely.
  if (tinkerAutoWin) {
    let runAw = { ...tinkerEarlyState.run, lastPatrolAt: now };
    const mobsDefeatedAw = { ...(runAw.mobsDefeated || {}) };
    mobsDefeatedAw[mob.id] = (mobsDefeatedAw[mob.id] || 0) + 1;
    runAw = { ...runAw, mobsDefeated: mobsDefeatedAw };
    const dropAw = rollDrops(mob.drops, runAw.inventory || {}, runAw, rng);
    runAw = { ...runAw, inventory: dropAw.inventory };
    if (dropAw.parts.length > 0) {
      events.push({ kind: "drop", message: `🎒 Spoils: ${dropAw.parts.join(", ")}.` });
    }
    return { run: runAw, persistent: state.persistent, events };
  }

  // Resolve the fight.
  const result = resolveFight(tinkerEarlyState, mob, rng);
  let run = result.run;
  events.push(...result.events);

  // Stamp lastPatrolAt + tally kill count regardless of outcome (loss still
  // counts as an encounter even if not a kill — but we only increment kill
  // count on victory).
  run = { ...run, lastPatrolAt: now };

  if (result.outcome === "victory") {
    // Tally mob kill (lifetime, run-scoped — feeds boss gates).
    const mobsDefeated = { ...(run.mobsDefeated || {}) };
    const firstKill = (mobsDefeated[mob.id] || 0) === 0;
    mobsDefeated[mob.id] = (mobsDefeated[mob.id] || 0) + 1;
    run = { ...run, mobsDefeated };

    // #176 — first kill of a species stamps an etching.
    if (firstKill) {
      const fid = `mob:${mob.id}:first`;
      if (isFirstStamp(result.persistent || state.persistent, fid)) {
        const nextPers = stampEtchingOnce(result.persistent || state.persistent, fid, `First ${mob.name} slain`);
        result.persistent = nextPers;
        events.push({
          kind: "milestone",
          message: `🕯️ An etching appears on the Altar: First ${mob.name} slain.`,
        });
      }
    }

    // Drops.
    const dropResult = rollDrops(mob.drops, run.inventory || {}, run, rng);
    // Butchering XP — every kill teaches you to take more from the bone.
    const butch = gainXp(run, "butchering", Math.max(1, Math.floor((mob.combat?.hp || 4) / 6)));
    run = { ...run, skills: butch.skills };
    events.push(...butch.events);
    run = { ...run, inventory: dropResult.inventory };
    if (dropResult.parts.length > 0) {
      events.push({
        kind: "drop",
        message: `🎒 Spoils: ${dropResult.parts.join(", ")}.`,
      });
    }

    // #203 — companion weaponDropChance (Old Veteran). On victory, roll
    // for a bonus weapon item drop. Picks a random weapon the mob could
    // plausibly carry from common Era 1-2 weapons.
    const compBonusPatrol = getActiveCompanionBonus({ run });
    if (compBonusPatrol.weaponDropChance && rng() < compBonusPatrol.weaponDropChance) {
      const candidates = ["woodenClub", "boneKnife", "stoneAxe"];
      const pick = candidates[Math.floor(rng() * candidates.length)];
      run.inventory = { ...run.inventory, [pick]: (run.inventory[pick] || 0) + 1 };
      events.push({
        kind: "drop",
        // Read the weapon's display name (woodenClub → "Wooden Club" etc.).
        message: `🪖 Your companion picks up a ${pick.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())} from the field.`,
      });
    }

    // Custom mob XP override (mob.xp). Combat XP from resolveFight already
    // grants its baseline; we top up here if the mob authored a value.
    if (mob.xp) {
      const weapon = getEffectiveWeapon(run);
      const skillId = getCombatSkillForWeapon(weapon);
      if (skillId) {
        const extra = Math.max(0, mob.xp - 3); // baseline from resolveFight ≈ floor(hp/4) ≈ 3 for small mobs
        if (extra > 0) {
          const xp = gainXp(run, skillId, extra);
          run = { ...run, skills: xp.skills };
          events.push(...xp.events);
        }
      }
    }

    // Status application (venom, dysentery) — happens on the encounter
    // even after victory; the mob got a hit in.
    if (mob.appliesStatus && rng() < (mob.appliesStatus.chance ?? 0)) {
      const { id, durationMs } = mob.appliesStatus;
      const statuses = { ...(run.statuses || {}) };
      statuses[id] = { until: now + (durationMs || 0) };
      run = { ...run, statuses };
      events.push({
        kind: "status",
        message: `⚠️ You contracted ${id} during the fight.`,
      });
    }

    // Atmospheric hint — if there are locked bosses for this era, sometimes
    // drop a "something larger" line so the player feels the gate.
    if (rng() < 0.15) {
      const lockedBosses = getLockedBossesForEra(state).length;
      if (lockedBosses > 0) {
        events.push({
          kind: "patrol",
          message: LOCKED_BOSS_HINTS[
            Math.floor(rng() * LOCKED_BOSS_HINTS.length)
          ],
        });
      }
    }
  }

  // resolveFight only returns { run, events, outcome } (no persistent),
  // so fall back to the caller's persistent slice to avoid dropping it
  // through the auto-loop tick chain (which would crash App.jsx reading
  // state.persistent.unlockedMusic).
  return {
    run,
    persistent: result.persistent || state.persistent,
    events,
    outcome: result.outcome,
  };
}

function getLockedBossesForEra(state) {
  const era = computeEra(state);
  const available = getBossesAvailable(state);
  const availableIds = new Set(available.map((b) => b.id));
  return getAllBosses().filter((b) => b.era <= era && !availableIds.has(b.id));
}

export function getPatrolStatus(state, now = Date.now()) {
  const last = state.run.lastPatrolAt || 0;
  const cd = getPatrolCooldownMs(state);
  const remain = Math.max(0, cd - (now - last));
  return { cooldownMs: cd, remainMs: remain, ready: remain === 0 };
}
