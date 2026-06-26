// Hunting system. Reducer dispatches HUNT; this file owns the logic.

import { HUNT_TABLE, HUNT_CONFIG } from "../content/huntTable.js";
import { RESOURCES } from "../content/resources.js";
import { getToolEffects } from "../content/tools.js";
import { getBonus, gainXp, getSkillState } from "./skills.js";
import { getSpdCooldownMult } from "./character.js";
import { applyToolWear } from "./crafting.js";
import { clampToCap } from "./storage.js";
import { getPrey } from "../content/prey.js";
import { stampEtchingOnce, isFirstStamp } from "./etchings.js";
import {
  decayForAction,
  survivalActive,
  applyEffect,
} from "./survival.js";
import { pickWeighted, randInt } from "../util/rng.js";

export function getHuntCooldownMs(state) {
  let ms = HUNT_CONFIG.baseCooldownMs;
  ms -= getBonus(state.run, "huntCooldownReduction");
  const toolEff = getToolEffects(state.run);
  ms -= toolEff.huntCooldownReduction || 0;
  // SPD multiplier (#47) — applies after building/skill/tool reductions.
  ms = Math.round(ms * getSpdCooldownMult(state));
  return Math.max(HUNT_CONFIG.minCooldownMs, ms);
}

export function canHunt(state) {
  const toolEff = getToolEffects(state.run);
  if (!toolEff.unlocksAction?.hunt) {
    return { ok: false, reason: "You have nothing to hunt with.", msRemaining: 0 };
  }
  if (survivalActive(state)) {
    const stats = state.run.stats || {};
    if ((stats.energy ?? 100) <= HUNT_CONFIG.minEnergyToHunt) {
      return { ok: false, reason: "Too tired.", msRemaining: 0 };
    }
  }
  const lastAt = state.run.lastHuntAt || 0;
  if (lastAt > 0) {
    const cooldownMs = getHuntCooldownMs(state);
    const elapsed = Date.now() - lastAt;
    if (elapsed < cooldownMs) {
      return {
        ok: false,
        reason: "Catching your breath…",
        msRemaining: cooldownMs - elapsed,
      };
    }
  }
  return { ok: true, msRemaining: 0 };
}

function buildHuntTable(state) {
  const birdBonus =
    getBonus(state.run, "huntBirdWeightBonus") +
    (getToolEffects(state.run).huntBetterBirds || 0);
  const nothingReduction = getBonus(state.run, "huntNothingWeightReduction");

  return HUNT_TABLE.base.map((row) => {
    let weight = row.weight;
    if (row.tag === "bird") weight += birdBonus;
    else if (row.tag === "graze") weight += birdBonus * 0.4;
    else if (row.tag === "nothing") weight = Math.max(2, weight - nothingReduction);
    return { ...row, weight: Math.max(1, weight) };
  });
}

function describeDrop(result, qty) {
  if (result.kind === "nothing") {
    const lines = [
      "The flock scatters. You stand still and breathe.",
      "You stalked. You waited. The birds knew.",
      "Empty hands. The hunt was a lesson, not a meal.",
      "Almost. A wing-beat past your fingers.",
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
  if (result.id === "food") {
    return `🪱 You flushed up grubs from the underbrush — +${qty} grub${
      qty !== 1 ? "s" : ""
    }. Better than nothing.`;
  }
  if (result.id === "bird_meat") {
    return `🍗 You took a bird. +${qty} bird meat — the first warm thing in a long time.`;
  }
  if (result.id === "feathers" && result.tag === "graze") {
    return `🪶 You clipped one — feathers, no meat. +${qty} feather${
      qty !== 1 ? "s" : ""
    }.`;
  }
  if (result.id === "feathers") {
    return `🪶 +${qty} feather${qty !== 1 ? "s" : ""} — torn from the kill.`;
  }
  const res = RESOURCES[result.id];
  return `${res?.icon || ""} +${qty} ${res?.name || result.id}.`;
}

export function performHunt(state, opts = {}, now = Date.now(), rng = Math.random) {
  // Backward-compat: caller may pass (state, rng) with no opts.
  if (typeof opts === "function") { rng = opts; opts = {}; }
  if (typeof opts === "number") { rng = now; now = opts; opts = {}; }
  const targetPreyId = opts.preyId || null;

  // Prey-targeted hunt (#79) — bypass the abstract hunt-table roll and
  // resolve the specific prey from content/prey.js. Drops come from the
  // prey's drop table; failure is rolled against prey.difficulty.
  if (targetPreyId) {
    return performTargetedHunt(state, targetPreyId, now, rng);
  }

  const check = canHunt(state);
  if (!check.ok) {
    if (check.msRemaining > 0) {
      return { run: state.run, persistent: state.persistent, events: [] };
    }
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "huntFail", message: check.reason }],
    };
  }

  let run = {
    ...state.run,
    inventory: { ...state.run.inventory },
    gathered: { ...(state.run.gathered || {}) },
    lastHuntAt: Date.now(),
  };
  const persistent = state.persistent;

  const events = [];
  events.push({ kind: "hunt", message: "🏹 You move into the brush." });

  const table = buildHuntTable(state);
  const result = pickWeighted(rng, table);

  let xpGain = 1;
  let bonusThirst = 0;

  if (result.kind === "resource") {
    const [lo, hi] = result.qty;
    const baseQty = randInt(rng, lo, hi);
    const toolEff = getToolEffects(state.run);
    const huntYieldBonus =
      (toolEff.huntYieldBonus || 0) + getBonus(state.run, "huntYieldBonus");
    const qty = Math.max(1, Math.round(baseQty + huntYieldBonus));
    run.inventory[result.id] = (run.inventory[result.id] || 0) + qty;
    run.gathered[result.id] = (run.gathered[result.id] || 0) + qty;

    events.push({ kind: "hunt", message: describeDrop(result, qty) });

    if (result.tag === "bird") xpGain += 3;
    else if (result.tag === "graze") xpGain += 2;
    else if (result.tag === "grub") xpGain += 1;

    if (result.tag === "bird") {
      bonusThirst += HUNT_CONFIG.bonusThirstOnBird;
    }
  } else {
    events.push({ kind: "hunt", message: describeDrop(result, 0) });
    xpGain = 1;
  }

  if (survivalActive({ ...state, run })) {
    let stats = decayForAction(run.stats || {}, "Hunt");
    if (bonusThirst > 0) {
      stats = applyEffect(stats, { thirst: +bonusThirst });
    }
    run = { ...run, stats };
  }

  const xpResult = gainXp(run, "hunting", xpGain);
  run = { ...run, skills: xpResult.skills };
  events.push(...xpResult.events);

  const wear = applyToolWear(run, "hunt");
  run = wear.run;
  events.push(...wear.events);

  // Clamp to cap.
  const clamped = clampToCap(run.inventory, { ...state, run }, state.run.inventory);
  run = { ...run, inventory: clamped.inventory };
  for (const [id, lost] of Object.entries(clamped.overflow)) {
    if (lost > 0) {
      events.push({
        kind: "actionFail",
        message: `📦 ${lost} ${id} wasted — nowhere to put it.`,
      });
    }
  }

  // Pest dispersal: hunting can scare off the bird flock.
  if (run.activePests?.birdFlock?.until > Date.now()) {
    let dispersalChance = 0.20;
    if (result.tag === "bird") dispersalChance = 0.55;
    else if (result.tag === "graze") dispersalChance = 0.40;
    else if (result.tag === "grub") dispersalChance = 0.10;
    if (rng() < dispersalChance) {
      const pests = { ...run.activePests };
      delete pests.birdFlock;
      run = { ...run, activePests: pests };
      events.push({
        kind: "event_good",
        message: "🦅 The flock breaks. They scatter into the dust. The garden is safe again.",
      });
    }
  }

  return { run, persistent, events };
}

export function getHuntStatus(state) {
  const toolEff = getToolEffects(state.run);
  const owned = !!toolEff.unlocksAction?.hunt;
  const { level } = getSkillState(state.run, "hunting");
  return {
    owned,
    level,
    cooldownMs: getHuntCooldownMs(state),
    ready: canHunt(state).ok,
  };
}

// ─── Targeted prey hunt (#79) ────────────────────────────────────────
// Click a HuntingView card → resolve that specific prey. Drops come from
// the prey def. Butchering skill scales drop chance + qty (mirrors mobs).
function getButcheringBonuses(run) {
  const { level } = getSkillState(run, "butchering");
  return {
    chanceBonus: Math.min(0.20, level * 0.01),
    qtyMult: 1 + Math.min(1.0, level * 0.05),
  };
}

function rollPreyDrops(prey, inventory, run, rng) {
  if (!Array.isArray(prey.drops)) return { inventory, parts: [] };
  const { chanceBonus, qtyMult } = getButcheringBonuses(run);
  // #175 — grub-eating birds key off the carrionFlock pest. When the
  // pest is active, their drop chance bumps and they roll a bonus
  // grubs drop (the same flock that's eating your garden is feeding
  // these birds, so they're fat and easy to catch).
  const birdFlockActive =
    !!prey.feedsOnGrubs &&
    (run.activePests?.birdFlock?.until || 0) > Date.now();
  const pestChanceBonus = birdFlockActive ? 0.15 : 0;
  const next = { ...inventory };
  const parts = [];
  for (const d of prey.drops) {
    const effChance = Math.min(1, (d.chance ?? 1) + chanceBonus + pestChanceBonus);
    if (rng() >= effChance) continue;
    const baseQty = Array.isArray(d.qty)
      ? randInt(rng, d.qty[0], d.qty[1])
      : (d.qty || 1);
    const qty = Math.max(1, Math.floor(baseQty * qtyMult));
    if (qty <= 0) continue;
    next[d.resource] = (next[d.resource] || 0) + qty;
    parts.push(`+${qty} ${d.resource}`);
  }
  // #175 grub-bonus drop. Conditional on pest + feedsOnGrubs. Drops
  // 1–2 grubs (resource id "food") with 50% chance. Standalone roll.
  if (birdFlockActive && rng() < 0.5) {
    const bonusQty = Math.max(1, Math.floor((1 + Math.floor(rng() * 2)) * qtyMult));
    next.food = (next.food || 0) + bonusQty;
    parts.push(`+${bonusQty} food (flock bonus)`);
  }
  return { inventory: next, parts };
}

function performTargetedHunt(state, preyId, now, rng) {
  const prey = getPrey(preyId);
  if (!prey) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "That prey is not here." }],
    };
  }

  // Gate: still need the hunt tool + cooldown check.
  const check = canHunt(state);
  if (!check.ok) {
    if (check.msRemaining > 0) {
      return { run: state.run, persistent: state.persistent, events: [] };
    }
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "huntFail", message: check.reason }],
    };
  }

  let run = {
    ...state.run,
    inventory: { ...state.run.inventory },
    gathered: { ...(state.run.gathered || {}) },
    preyDefeated: { ...(state.run.preyDefeated || {}) },
    lastHuntAt: now,
  };
  const events = [];

  // Opener line.
  const opener = prey.huntFlavor?.opener?.[Math.floor(rng() * (prey.huntFlavor.opener.length || 1))]
    || `${prey.icon} You start your stalk.`;
  events.push({ kind: "hunt", message: opener });

  const fail = rng() < (prey.difficulty || 0.4);
  if (fail) {
    const failLine = prey.huntFlavor?.fail?.[Math.floor(rng() * (prey.huntFlavor.fail.length || 1))]
      || `${prey.icon} You lost it.`;
    events.push({ kind: "hunt", message: failLine });
    const xpRes = gainXp(run, "hunting", 1);
    run = { ...run, skills: xpRes.skills };
    events.push(...xpRes.events);
    return { run, persistent: state.persistent, events };
  }

  // Success: roll drops + apply status hit if defined.
  const { inventory, parts } = rollPreyDrops(prey, run.inventory, run, rng);
  run.inventory = inventory;
  for (const [resId, qty] of Object.entries(inventory)) {
    if ((state.run.inventory[resId] || 0) < qty) {
      run.gathered[resId] = (run.gathered[resId] || 0) +
        (qty - (state.run.inventory[resId] || 0));
    }
  }
  run.preyDefeated[prey.id] = (run.preyDefeated[prey.id] || 0) + 1;

  const successLine = prey.huntFlavor?.success?.[Math.floor(rng() * (prey.huntFlavor.success.length || 1))]
    || `${prey.icon} The prey falls.`;
  events.push({ kind: "hunt", message: successLine });
  if (parts.length > 0) {
    events.push({ kind: "resource", message: `🎒 ${parts.join(", ")}` });
  }

  // XP from prey def (override), default to hp/4 if missing.
  const xpGain = prey.xp || 2;
  const xpRes = gainXp(run, "hunting", xpGain);
  run = { ...run, skills: xpRes.skills };
  events.push(...xpRes.events);

  // Butchering XP — small flat per kill, since drop tables drive it.
  const butcherXp = gainXp(run, "butchering", Math.max(1, Math.floor(xpGain / 2)));
  run = { ...run, skills: butcherXp.skills };
  events.push(...butcherXp.events);

  // Tool wear on the bow/snare.
  const wear = applyToolWear(run, "hunt");
  run = wear.run;
  events.push(...wear.events);

  // Inventory clamp.
  const clamped = clampToCap(run.inventory, { ...state, run }, state.run.inventory);
  run = { ...run, inventory: clamped.inventory };
  for (const [id, lost] of Object.entries(clamped.overflow)) {
    if (lost > 0) {
      events.push({
        kind: "actionFail",
        message: `📦 ${lost} ${id} wasted — nowhere to put it.`,
      });
    }
  }

  // #176 — first hunt of a prey species stamps an altar etching.
  let persistent = state.persistent;
  const firstId = `prey:${prey.id}:first`;
  if (isFirstStamp(persistent, firstId)) {
    persistent = stampEtchingOnce(persistent, firstId, `First ${prey.name} hunted`);
    events.push({
      kind: "milestone",
      message: `🕯️ An etching appears on the Altar: First ${prey.name} hunted.`,
    });
  }

  return { run, persistent, events };
}
