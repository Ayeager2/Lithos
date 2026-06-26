// Building system. canBuild() reports eligibility; performBuild() does the work.
// Reducer dispatches BUILD; this file owns the actual logic.

import { getBuilding, getAllBuildings } from "../content/buildings.js";
import { totalWater, spendWater } from "../content/resources.js";
import {
  decayForAction,
  initialStats,
  survivalActive,
  boostStats,
} from "./survival.js";
import { gainXp } from "./skills.js";

// Returns { ok: bool, reason: string }.
export function canBuild(state, buildingId) {
  const building = getBuilding(buildingId);
  if (!building) return { ok: false, reason: "Unknown building." };

  if (state.run.built?.[buildingId]) {
    return { ok: false, reason: "Already built." };
  }

  if (building.requires) {
    if (building.requires.rockAwakened && !state.run.rockAwakened) {
      return { ok: false, reason: "The stone must awaken first." };
    }
    if (
      building.requires.researched &&
      !state.run.researched?.[building.requires.researched]
    ) {
      return { ok: false, reason: "You haven't listened for this yet." };
    }
    if (
      building.requires.hasBuilding &&
      !state.run.built?.[building.requires.hasBuilding]
    ) {
      return { ok: false, reason: "Something must come before this." };
    }
  }

  for (const [res, qty] of Object.entries(building.cost || {})) {
    // "water" is a virtual key — sums across the water tier ladder.
    // See content/resources.js totalWater/spendWater.
    if (res === "water") {
      if (totalWater(state.run.inventory) < qty) {
        return { ok: false, reason: "Not enough resources." };
      }
      continue;
    }
    if ((state.run.inventory[res] || 0) < qty) {
      return { ok: false, reason: "Not enough resources." };
    }
  }

  return { ok: true };
}

// Returns { run, persistent, events }.
export function performBuild(state, buildingId) {
  const building = getBuilding(buildingId);
  if (!building) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "buildFail", message: "Unknown building." }],
    };
  }

  const check = canBuild(state, buildingId);
  if (!check.ok) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "buildFail", message: check.reason }],
    };
  }

  // Spend resources. Virtual "water" cost drains lowest tier first.
  let inventory = { ...state.run.inventory };
  for (const [res, qty] of Object.entries(building.cost)) {
    if (res === "water") {
      inventory = spendWater(inventory, qty);
      continue;
    }
    inventory[res] = (inventory[res] || 0) - qty;
  }

  // Mark built
  const built = { ...(state.run.built || {}), [buildingId]: { at: Date.now() } };

  let run = { ...state.run, inventory, built };

  // Lifetime build counters.
  const persistent = {
    ...state.persistent,
    lifetimeStats: { ...state.persistent.lifetimeStats },
  };
  if (buildingId === "hut") {
    persistent.lifetimeStats.hutsBuilt =
      (persistent.lifetimeStats.hutsBuilt || 0) + 1;
  }
  if (buildingId === "firepit") {
    persistent.lifetimeStats.firepitsBuilt =
      (persistent.lifetimeStats.firepitsBuilt || 0) + 1;
  }

  const events = [{ kind: "build", message: building.onBuiltMessage }];
  if (building.whisperOnBuilt) {
    events.push({ kind: "whisper", message: building.whisperOnBuilt });
  }

  // Special activation: building the hut activates survival mechanics.
  // Initialize stats here (they default to a "fresh" state but we want the
  // documented startValues to take effect at activation).
  if (buildingId === "hut") {
    run.stats = initialStats();
    events.push({
      kind: "whisper",
      message:
        "The stone whispers: you have a body. Hunger. Thirst. The slow press of weariness. Care for yourself, that you may care for the world.",
    });
  }

  // Survival decay for performing the build action itself.
  if (survivalActive({ ...state, run })) {
    run = { ...run, stats: decayForAction(run.stats || {}, "Build") };
    // Building something is a meaningful achievement — boost resolve and sanity.
    run = {
      ...run,
      stats: boostStats(run.stats, { happiness: +5, sanity: +3 }),
    };
  }

  // Skill XP — Building earns the most XP per action of any skill (builds
  // are rare). Scaled by tier so later structures teach more.
  const xpGain = (building.tier || 1) * 8;
  const xpResult = gainXp(run, "building", xpGain);
  run = { ...run, skills: xpResult.skills };
  events.push(...xpResult.events);

  return { run, persistent, events };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree-view visibility helpers. See BUGS.md #005.
//
//   getKnownBuildings(state)
//     Everything the player should *see* in the Buildings tree. Locked nodes
//     are included — those whose `researched` / `hasBuilding` requirements
//     aren't met. The only filter is `rockAwakened`: before the rock wakes,
//     buildings are entirely conceptually unknown (and the Buildings tab
//     hasn't appeared yet anyway).
//
//   getAvailableBuildings(state)
//     Buildings the player can *act on right now* — canBuild() returns ok
//     AND the building isn't already built. Used for affordance counts and
//     the notification badge on the Buildings tab. Excludes already-built
//     because those are no longer "actionable."
//
//   getVisibleBuildings(state) — DEPRECATED back-compat alias.
//     Kept for old callers (BuildingsPanel.jsx — currently orphaned). Maps
//     to getKnownBuildings so the trigger card's "total" count remains the
//     known total. New code should call getKnownBuildings or
//     getAvailableBuildings directly.
// ─────────────────────────────────────────────────────────────────────────────

export function getKnownBuildings(state) {
  return getAllBuildings().filter((b) => {
    if (state.run.built?.[b.id]) return true;
    if (b.requires?.rockAwakened && !state.run.rockAwakened) return false;
    // Everything past the rock-awaken gate is "known" — locked nodes show
    // up in the tree so the player can plan ahead.
    return true;
  });
}

export function getAvailableBuildings(state) {
  return getKnownBuildings(state).filter(
    (b) => !state.run.built?.[b.id] && canBuild(state, b.id).ok
  );
}

export function getVisibleBuildings(state) {
  return getKnownBuildings(state);
}

export function getBuildingBonuses(run) {
  let gatherBonus = 0;
  for (const id of Object.keys(run.built || {})) {
    const b = getBuilding(id);
    if (b?.effect?.gatherBonus) gatherBonus += b.effect.gatherBonus;
  }
  return { gatherBonus };
}


// ─── Building repair (#194) ─────────────────────────────────────────
// When raids destroy a building (#190/#191), it lands on
// run.destroyedBuildings = { [id]: { destroyedAt } }. The player can
// then rebuild at HALF the original cost — much faster than rebuilding
// from scratch (the foundation survives; only the structure needs
// replacing). Once repaired, the entry is removed from destroyedBuildings
// and re-added to run.built.

export function canRepair(state, buildingId) {
  const building = getBuilding(buildingId);
  if (!building) return { ok: false, reason: "Unknown building." };
  if (!state.run.destroyedBuildings?.[buildingId]) {
    return { ok: false, reason: "Nothing to repair." };
  }
  if (state.run.built?.[buildingId]) {
    return { ok: false, reason: "Already standing." };
  }
  // Half cost (rounded up so a 1-cost item still costs 1).
  const cost = building.cost || {};
  const inv = state.run.inventory || {};
  for (const [res, qty] of Object.entries(cost)) {
    const need = Math.max(1, Math.ceil(qty * 0.5));
    if (res === "water") {
      // Sum all water tiers.
      const total = (inv.water_stagnant || 0) + (inv.water_muddy || 0) + (inv.water_boiled || 0);
      if (total < need) return { ok: false, reason: `Need ${need} water.` };
    } else if ((inv[res] || 0) < need) {
      return { ok: false, reason: `Need ${need} ${res}.` };
    }
  }
  return { ok: true };
}

export function performRepair(state, buildingId) {
  const check = canRepair(state, buildingId);
  if (!check.ok) {
    return { run: state.run, persistent: state.persistent,
      events: [{ kind: "buildFail", message: check.reason }] };
  }
  const building = getBuilding(buildingId);
  let inventory = { ...(state.run.inventory || {}) };
  for (const [res, qty] of Object.entries(building.cost || {})) {
    const need = Math.max(1, Math.ceil(qty * 0.5));
    if (res === "water") {
      inventory = spendWater(inventory, need);
    } else {
      inventory[res] = (inventory[res] || 0) - need;
    }
  }
  const built = { ...(state.run.built || {}), [buildingId]: { at: Date.now(), repairedAt: Date.now() } };
  const destroyedBuildings = { ...(state.run.destroyedBuildings || {}) };
  delete destroyedBuildings[buildingId];
  const run = { ...state.run, inventory, built, destroyedBuildings };
  // #198 — first repair ever stamps an etching.
  let persistent = state.persistent;
  const events = [{ kind: "build", message: `🔨 The ${building.name} stands again — repaired at half cost.` }];
  if (isFirstStamp(persistent, "settlement:repair:first")) {
    persistent = stampEtchingOnce(persistent, "settlement:repair:first", `First building repaired (${building.name})`);
    events.push({ kind: "milestone", message: "🕯️ An etching appears on the Altar: First building repaired." });
  }
  return { run, persistent, events };
}
