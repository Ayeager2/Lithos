// Boss-fight resolution — commit phase only (#40).
//
// The BossFightModal runs the turn-based fight client-side using the
// rollPlayerAttack / rollFoeAttack helpers from combat.js. Spells and
// items the player triggers during a fight dispatch the normal
// CAST_SPELL / USE_TOOL actions (real spirit/fragments/inventory cost,
// real cooldowns), so by the time we get here the only thing left to
// commit is:
//   • damage the foe inflicted on the player (hp / sanity / spirit deltas)
//   • victory bookkeeping — defeatReward, firstDefeatLog, etching, XP
//   • defeat bookkeeping — death-debuff cascade (no run reset)
//   • flee bookkeeping — damage applied, no rewards
//
// Boss content lives in content/bosses.js. See ERA_PLAN.md "Combat +
// Weapons + Specialized Skills" → "Boss fights".

import { getBoss } from "../content/bosses.js";
import { applyEffect } from "./survival.js";
import { applyDeathDebuff } from "./death.js";
import { gainXp } from "./skills.js";
import { getCombatXpForVictory, getCombatSkillForWeapon, getEffectiveWeapon } from "./combat.js";
import { applyToolWear } from "./crafting.js";

// Apply accumulated damage from a boss fight to run.stats. `damage` is
// a plain { hp, sanity, spirit } map of NON-NEGATIVE numbers (the totals
// the foe inflicted before death-debuff scaling). Healing applied during
// the fight has already mutated state through CAST_SPELL / USE_TOOL, so
// we only subtract here.
function subtractDamage(run, damage) {
  const stats = applyEffect(run.stats || {}, {
    hp: -(damage.hp || 0),
    sanity: -(damage.sanity || 0),
    spirit: -(damage.spirit || 0),
  });
  return { ...run, stats };
}

function grantDefeatReward(run, reward) {
  if (!reward) return { run, events: [] };
  const events = [];
  let next = run;
  if (reward.inventory) {
    const inv = { ...(next.inventory || {}) };
    const parts = [];
    for (const [id, qty] of Object.entries(reward.inventory)) {
      inv[id] = (inv[id] || 0) + qty;
      parts.push(`${qty} ${id}`);
    }
    next = { ...next, inventory: inv };
    if (parts.length > 0) {
      events.push({
        kind: "boss_reward",
        message: `🎒 Spoils: ${parts.join(", ")}.`,
      });
    }
  }
  return { run: next, events };
}

function stampEtching(persistent, etchingId, label) {
  if (!etchingId) return persistent;
  if (persistent.altarEtchings?.[etchingId]) return persistent;
  return {
    ...persistent,
    altarEtchings: {
      ...(persistent.altarEtchings || {}),
      [etchingId]: { stampedAt: Date.now(), label },
    },
  };
}

// Main entry. Payload shape:
//   { bossId, outcome: "victory"|"defeat"|"flee",
//     damage: { hp, sanity, spirit } }
//
// Returns { run, persistent, events } in the system convention.
export function performBossFightEnd(state, payload) {
  const { bossId, outcome, damage = {} } = payload || {};
  const boss = getBoss(bossId);
  if (!boss) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "warn", message: "Unknown boss." }],
    };
  }

  let run = subtractDamage(state.run, damage);
  let persistent = state.persistent;
  const events = [];

  if (outcome === "victory") {
    const reward = grantDefeatReward(run, boss.defeatReward);
    run = reward.run;
    events.push(...reward.events);

    // #138 — rolled rune drops on victory. Each entry is
    // { resource, chance (0..1), qty } — chance independent per entry.
    if (Array.isArray(boss.runeDrops)) {
      const inventory = { ...(run.inventory || {}) };
      let droppedAny = false;
      const dropMsgs = [];
      for (const drop of boss.runeDrops) {
        if (Math.random() < drop.chance) {
          const qty = Array.isArray(drop.qty)
            ? drop.qty[0] + Math.floor(Math.random() * (drop.qty[1] - drop.qty[0] + 1))
            : (drop.qty || 1);
          inventory[drop.resource] = (inventory[drop.resource] || 0) + qty;
          droppedAny = true;
          dropMsgs.push(`${drop.resource} ×${qty}`);
        }
      }
      if (droppedAny) {
        run = { ...run, inventory };
        events.push({ kind: "drop", message: `🪬 The body bleeds runes: ${dropMsgs.join(", ")}.` });
      }
    }

    // Combat-skill XP (mirrors resolveFight()).
    const weapon = getEffectiveWeapon(run);
    const skillId = getCombatSkillForWeapon(weapon);
    if (skillId) {
      const xp = getCombatXpForVictory(boss);
      const xpResult = gainXp(run, skillId, xp);
      run = { ...run, skills: xpResult.skills };
      events.push(...xpResult.events);
    }

    // First-defeat narrative + etching (one-shot, persistent).
    const already = persistent.bossesDefeated?.[bossId];
    if (!already) {
      persistent = {
        ...persistent,
        bossesDefeated: {
          ...(persistent.bossesDefeated || {}),
          [bossId]: { defeatedAt: Date.now() },
        },
      };
      if (boss.firstDefeatLog) {
        events.push({ kind: "boss_victory", message: boss.firstDefeatLog });
      }
      persistent = stampEtching(persistent, boss.etching, `Defeated ${boss.name}`);
    } else {
      events.push({
        kind: "boss_victory",
        message: `🥇 ${boss.name} falls again. Same path, different day.`,
      });
      }

    // Boss combat counts as combat wear on the weapon.
    const wear = applyToolWear(run, "combat");
    run = wear.run;
    events.push(...wear.events);
  } else if (outcome === "defeat") {
    events.push({
      kind: "boss_defeat",
      message: `💀 ${boss.name} stands over you. You will wake elsewhere.`,
    });
    const dd = applyDeathDebuff(run);
    run = dd.run;
    events.push(...dd.events);
    // Boss combat still wears the weapon even on a loss.
    const wear = applyToolWear(run, "combat");
    run = wear.run;
    events.push(...wear.events);
  } else if (outcome === "flee") {
    events.push({
      kind: "boss_flee",
      message: `🏃 You break off from the ${boss.name}. The dust closes behind you.`,
    });
    const wear = applyToolWear(run, "combat");
    run = wear.run;
    events.push(...wear.events);
  }

  return { run, persistent, events };
}
