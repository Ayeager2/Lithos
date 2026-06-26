// Thievery system (#180). Mugs an NPC; loot rolls from the target's
// discipline-aligned table; alignment shifts toward evil; failure
// returns HP/sanity damage.
//
// Skill bonuses (declared in content/skills.js):
//   thievery.successBonus  → +1% mug success per level (cap +0.25)
//   thievery.lootChanceBonus → +1% per loot line chance (cap +0.20)
//
// DEX also contributes via getStatCombatBonuses (acc-style). We use a
// simple linear: thieverySuccess += DEX_bonus * 0.5.

import { getMugTarget } from "../content/mugTargets.js";
import { gainXp, getSkillState } from "./skills.js";
import { clampToCap } from "./storage.js";
import { applyEffect } from "./survival.js";
import { randInt } from "../util/rng.js";
import { stampEtchingOnce, isFirstStamp } from "./etchings.js";

function pickLine(arr, rng) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(rng() * arr.length)];
}

function getThieveryBonuses(run) {
  const { level } = getSkillState(run, "thievery");
  return {
    successBonus: Math.min(0.25, level * 0.01),
    lootChanceBonus: Math.min(0.20, level * 0.01),
  };
}

// Threshold gate — Thievery only starts mattering once the player has
// learned the skill via the first successful mug (or via the dev panel).
// Always available content-wise; no research required.
export function canMug(state, targetId) {
  const target = getMugTarget(targetId);
  if (!target) return { ok: false, reason: "Unknown target." };
  const era = state.run?.era ?? 0;
  if ((target.era || 1) > era) {
    return { ok: false, reason: `Not in this era yet (need era ${target.era}).` };
  }
  return { ok: true };
}

function rollLoot(target, inventory, run, rng) {
  const { lootChanceBonus } = getThieveryBonuses(run);
  const next = { ...inventory };
  const parts = [];
  for (const l of target.loot || []) {
    const effChance = Math.min(1, (l.chance ?? 1) + lootChanceBonus);
    if (rng() >= effChance) continue;
    const baseQty = Array.isArray(l.qty)
      ? randInt(rng, l.qty[0], l.qty[1])
      : (l.qty || 1);
    if (baseQty <= 0) continue;
    next[l.resource] = (next[l.resource] || 0) + baseQty;
    parts.push(`+${baseQty} ${l.resource}`);
  }
  return { inventory: next, parts };
}

export function performMug(state, targetId, rng = Math.random) {
  const check = canMug(state, targetId);
  if (!check.ok) {
    return { run: state.run, persistent: state.persistent,
      events: [{ kind: "actionFail", message: check.reason }] };
  }
  const target = getMugTarget(targetId);
  let run = state.run;
  let persistent = state.persistent;
  const events = [];

  // Opening flavor line.
  const opener = pickLine(target.flavor?.opener, rng) || `🗡️ You set up on a ${target.name}.`;
  events.push({ kind: "thievery", message: opener });

  // Success roll. baseSuccess = 1 - difficulty.
  const baseSuccess = 1 - (target.difficulty ?? 0.4);
  const { successBonus } = getThieveryBonuses(run);
  const effSuccess = Math.max(0.05, Math.min(0.95, baseSuccess + successBonus));
  const success = rng() < effSuccess;

  if (success) {
    // Loot.
    const lootRes = rollLoot(target, run.inventory || {}, run, rng);
    run = { ...run, inventory: lootRes.inventory };
    if (lootRes.parts.length > 0) {
      events.push({ kind: "drop", message: `🎒 You took: ${lootRes.parts.join(", ")}.` });
    }

    // Clamp to caps.
    const clamped = clampToCap(run.inventory, { ...state, run }, state.run.inventory);
    run = { ...run, inventory: clamped.inventory };
    for (const [id, lost] of Object.entries(clamped.overflow || {})) {
      if (lost > 0) {
        events.push({
          kind: "actionFail",
          message: `📦 ${lost} ${id} dropped — pack was full.`,
        });
      }
    }

    // Alignment shift toward evil. Capped at 100.
    const evilGain = target.alignmentEvil || 1;
    const alignment = { ...(run.alignment || {}) };
    alignment.evil = Math.min(100, (alignment.evil || 0) + evilGain);
    run = { ...run, alignment };

    // Success flavor.
    const line = pickLine(target.flavor?.success, rng) || `🗡️ You take what they had.`;
    events.push({ kind: "thievery", message: line });

    // Thievery XP.
    const xpRes = gainXp(run, "thievery", target.xp || 2);
    run = xpRes.run ? xpRes.run : { ...run, skills: xpRes.skills };
    events.push(...xpRes.events);

    // Stamp etching on first mug of this target.
    const fid = `mug:${target.id}:first`;
    if (isFirstStamp(persistent, fid)) {
      persistent = stampEtchingOnce(persistent, fid, `First ${target.name} mugged`);
      events.push({
        kind: "milestone",
        message: `🕯️ An etching appears on the Altar: First ${target.name} mugged.`,
      });
    }

    // Tally per-run for stat tracking.
    const mugsLanded = { ...(run.mugsLanded || {}) };
    mugsLanded[target.id] = (mugsLanded[target.id] || 0) + 1;
    run = { ...run, mugsLanded };
  } else {
    // Failure penalty.
    const pen = target.failPenalty || {};
    if (pen.hp) run = applyEffect(run, { hp: pen.hp });
    if (pen.sanity) run = applyEffect(run, { sanity: pen.sanity });
    const line = pickLine(target.flavor?.fail, rng) || `🗡️ The mark turned. You ran.`;
    events.push({ kind: "thievery", message: line });

    // Small XP for the attempt — half the success XP.
    const xpRes = gainXp(run, "thievery", Math.max(1, Math.floor((target.xp || 2) / 2)));
    run = xpRes.run ? xpRes.run : { ...run, skills: xpRes.skills };
    events.push(...xpRes.events);
  }

  return { run, persistent, events };
}
