// Hunting system. Reducer dispatches HUNT; this file owns the logic.

import { HUNT_TABLE, HUNT_CONFIG } from "../content/huntTable.js";
import { RESOURCES } from "../content/resources.js";
import { getToolEffects } from "../content/tools.js";
import { getBonus, gainXp, getSkillState } from "./skills.js";
import { getSpdCooldownMult } from "./character.js";
import { applyToolWear } from "./crafting.js";
import { clampToCap } from "./storage.js";
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

export function performHunt(state, rng = Math.random) {
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
