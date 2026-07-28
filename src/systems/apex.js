// Apex events (#229) — Era 5 resolution.
//
// Each path has an apex event that resolves the run into Era 6 with an
// `eraArc` flag carried forward. Stamps the matching settlement etching.

import { stampEtchingOnce } from "./etchings.js";
import { APEX_EVENTS } from "../content/reckoning.js";

// Verify the player can fire their path's apex right now.
export function canFireApex(state) {
  const run = state.run;
  if (!run?.eraArc) return { ok: false, reason: "No Era 5 path chosen yet." };
  if (run.reckoningPhase !== "apex") return { ok: false, reason: "Reckoning has not reached the apex phase." };
  const def = APEX_EVENTS[run.eraArc];
  if (!def) return { ok: false, reason: "Unknown apex." };
  const req = def.requires || {};
  if (req.worldScoreMin && (run.worldScore || 0) < req.worldScoreMin) {
    return { ok: false, reason: `Requires worldScore >= ${req.worldScoreMin}.` };
  }
  if (req.alignmentEvilMin && (run.alignment?.evil || 0) < req.alignmentEvilMin) {
    return { ok: false, reason: `Requires alignment evil >= ${req.alignmentEvilMin}.` };
  }
  if (req.populationMin && (run.population || 0) < req.populationMin) {
    return { ok: false, reason: `Requires ${req.populationMin} villagers.` };
  }
  if (req.hasBuilding && !run.built?.[req.hasBuilding]) {
    return { ok: false, reason: `Requires building: ${req.hasBuilding}.` };
  }
  if (req.weaponMin) {
    // Sum any inventory item id ending with weapon-ish suffix; rough check.
    let weaponCount = 0;
    for (const [k, v] of Object.entries(run.inventory || {})) {
      if (typeof v !== "number" || v <= 0) continue;
      if (/(sword|club|axe|spear|bow|hammer|staff|dagger|crossbow|mace|halberd)$/i.test(k)) {
        weaponCount += v;
      }
    }
    if (weaponCount < req.weaponMin) {
      return { ok: false, reason: `Need ${req.weaponMin} weapons in inventory (have ${weaponCount}).` };
    }
  }
  // Ritual cost.
  for (const [r, q] of Object.entries(def.ritualCost || {})) {
    if ((run.inventory?.[r] || 0) < q) {
      return { ok: false, reason: `Need ${q} ${r}.` };
    }
  }
  return { ok: true };
}

export function performFireApex(state) {
  const check = canFireApex(state);
  if (!check.ok) {
    return { run: state.run, persistent: state.persistent, events: [{ kind: "actionFail", message: check.reason }] };
  }
  const run = state.run;
  const def = APEX_EVENTS[run.eraArc];
  const events = [{ kind: "milestone", message: def.onCompleteMessage }];

  // Burn ritual cost.
  const inventory = { ...(run.inventory || {}) };
  for (const [r, q] of Object.entries(def.ritualCost || {})) {
    inventory[r] = Math.max(0, (inventory[r] || 0) - q);
  }
  // Path-specific side effects.
  let stats = { ...(run.stats || {}) };
  let alignment = { ...(run.alignment || { good: 0, evil: 0 }) };
  let worldScore = run.worldScore || 0;
  let population = run.population || 0;
  if (run.eraArc === "communion") {
    population = Math.max(0, population - (def.villagerCost || 15));
    worldScore = 0;
    alignment.evil = Math.max(alignment.evil || 0, 40);
  } else if (run.eraArc === "defiance") {
    // 30% population loss.
    population = Math.max(0, Math.floor(population * 0.70));
  }

  // Stamp apex etching + cosmic memory reward.
  let persistent = stampEtchingOnce(state.persistent, `apex:${run.eraArc}`, `Apex (${run.eraArc}) completed`);
  inventory.cosmic_memory = (inventory.cosmic_memory || 0) + 1;

  return {
    run: {
      ...run,
      inventory,
      stats,
      alignment,
      worldScore,
      population,
      reckoningPhase: "complete",
      reckoningClock: null,
      activeHerald: null,
    },
    persistent,
    events,
  };
}
