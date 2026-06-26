// Defense helpers — shared between threats.js (one-shot resolution) and
// combat.js (multi-round fight loop). Extracted into its own file to
// break the cycle that would form if both imported from each other.
//
// `defense` here is the SETTLEMENT defense stat — from buildings (Stone
// Walls etc.) and research (Vigilance, Hidden Stores). It applies to:
//   • Food stolen in raid-style threats (resolveThreat in threats.js)
//   • HP damage reduction in combat (combat.js — until Task #39 splits
//     personal `armor` from settlement `defense`)
//
// `foodStealReduction` is the raid-specific food-protection stat. Only
// the one-shot threats use it today.

import { getResearch } from "../content/research.js";
import { getActiveCompanionBonus } from "./companions.js";
import { getBuilding } from "../content/buildings.js";

export function getDefense(state) {
  let def = 0;
  for (const id of Object.keys(state.run.researched || {})) {
    const r = getResearch(id);
    if (r?.effect?.defense) def += r.effect.defense;
  }
  for (const id of Object.keys(state.run.built || {})) {
    const b = getBuilding(id);
    if (b?.effect?.defense) def += b.effect.defense;
  }
  // #202 — active companion contributes to settlement defense.
  const compBonus = getActiveCompanionBonus(state);
  if (compBonus.defense) def += compBonus.defense;
  return def;
}

export function getFoodStealReduction(state) {
  let red = 0;
  for (const id of Object.keys(state.run.researched || {})) {
    const r = getResearch(id);
    if (r?.effect?.foodStealReduction) red += r.effect.foodStealReduction;
  }
  for (const id of Object.keys(state.run.built || {})) {
    const b = getBuilding(id);
    if (b?.effect?.foodStealReduction) red += b.effect.foodStealReduction;
  }
  return red;
}


// #191 — Settlement raid loss calculation. Punishing by default.
//
// Base raid sweep = 90% of inventory (excluding weapons/tools).
// • Pre-Watchtower defensive buildings shave the base by 4% per def point.
// • Watchtower is the critical hinge: without it, nothing else really
//   matters; with it, the remaining loss is multiplied by 0.35 (× a
//   further army-strength reduction).
// • Army strength = weapons in inventory + Watchtower garrison × 3.
//   Each army point reduces the Watchtower multiplier by 4% (floor 0.15).
//
// Floor: a raid always takes at least 5% — there's no perfect defense.

import { getAllTools, getTool } from "../content/tools.js";
import { getAllWeapons } from "../content/weapons.js";

const BASE_RAID_FRAC = 0.9;
const PER_DEF_REDUCTION = 0.04;
const WATCHTOWER_MULT = 0.35;
const PER_ARMY_REDUCTION = 0.04;
const ARMY_MULT_FLOOR = 0.15;
const RAID_LOSS_FLOOR = 0.05;
const RAID_LOSS_CEIL = 0.95;

// Returns "army points" — currently weapons in inventory + Watchtower-
// staffed villagers × 3. Only meaningful when Watchtower is built.
export function getArmyStrength(state) {
  const inv = state.run?.inventory || {};
  let pts = 0;
  // Weapons in inventory — anything from weapons.js or tools.js with weaponStats.
  const isWeapon = (id) => {
    const w = getAllWeapons().find((x) => x.id === id);
    if (w?.weaponStats) return true;
    const t = getTool(id);
    if (t?.weaponStats) return true;
    return false;
  };
  for (const id of Object.keys(inv)) {
    if (isWeapon(id)) pts += inv[id] || 0;
  }
  // Watchtower garrison — read directly from run.assignments (avoid
  // circular import with town.js getAssignments).
  const guards = state.run?.assignments?.watchtower?.locked;
  if (typeof guards === "number") pts += guards * 3;
  return pts;
}

export function getRaidLossFraction(state, baseFrac = BASE_RAID_FRAC) {
  let frac = baseFrac;
  const built = state.run?.built || {};

  // Pre-Watchtower defensive shavings. Watchtower itself excluded — its
  // contribution is the critical multiplier below, not additive.
  for (const id of Object.keys(built)) {
    if (id === "watchtower") continue;
    const b = getBuilding(id);
    const def = b?.effect?.defense || 0;
    if (def > 0) frac -= PER_DEF_REDUCTION * def;
  }

  // Watchtower hinge — the critical defender. Without it, nothing
  // protects the stockpile.
  if (built.watchtower) {
    const army = getArmyStrength(state);
    const mult = Math.max(ARMY_MULT_FLOOR, WATCHTOWER_MULT * (1 - army * PER_ARMY_REDUCTION));
    frac *= Math.max(ARMY_MULT_FLOOR, mult);
  }
  return Math.max(RAID_LOSS_FLOOR, Math.min(RAID_LOSS_CEIL, frac));
}

// Returns the set of inventory ids the sweep should SKIP (weapons,
// tools — anything the player actively uses for combat or crafting).
export function getRaidProtectedKeys(state) {
  const protectedSet = new Set();
  for (const t of getAllTools()) {
    if (t.weaponStats || t.category === "tool" || t.category === "consumable" || t.category === "arcane") {
      protectedSet.add(t.id);
    }
  }
  for (const w of getAllWeapons()) {
    if (w.weaponStats) protectedSet.add(w.id);
  }
  return protectedSet;
}
