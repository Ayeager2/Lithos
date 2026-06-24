// Runesmithing system (#132) — imbue runes onto weapons.
//
// Imbue applies a rune's effect to a weapon-type. Per-weapon-type (not
// per-instance) keeps the model simple — all your Iron Greatswords
// share the same imbue set. Each rune slot is unique: you can stack
// different runes on the same weapon, but you can't double-apply the
// same rune to the same weapon.
//
// Combat math (systems/combat.js) reads weaponImbues to apply on-hit
// effects (HP return, Spirit return, echo strikes, damage bonus,
// sanity cost, durability skip chance).

import { getResource } from "../content/resources.js";
import { getWeapon } from "../content/weapons.js";
import { getTool } from "../content/tools.js";
import { gainXp } from "./skills.js";

// Look up a weapon by id — checks both pure weapons AND dual-use tools.
function lookupWeapon(weaponId) {
  return getWeapon(weaponId) || getTool(weaponId) || null;
}

// Enchant slots (#138). Weapon category determines how many runes can
// be bound simultaneously. Better materials hold more sigils. Per-weapon
// override `maxEnchantSlots` wins over the category default.
const SLOTS_BY_CATEGORY = {
  primitive: 1,
  bronze: 2,
  iron: 3,
  arcane: 4,
};
export function getMaxEnchantSlots(weapon) {
  if (!weapon) return 0;
  if (typeof weapon.maxEnchantSlots === "number") return weapon.maxEnchantSlots;
  return SLOTS_BY_CATEGORY[weapon.category] ?? 1;
}

// Count of currently-bound runes for a weapon.
export function getEnchantSlotUsage(state, weaponId) {
  const map = state.run?.weaponImbues?.[weaponId];
  if (!map) return 0;
  return Object.keys(map).length;
}

export function canImbueWeapon(state, weaponId, runeId) {
  const weapon = lookupWeapon(weaponId);
  if (!weapon || !weapon.weaponStats) {
    return { ok: false, reason: "That's not a weapon." };
  }
  const rune = getResource(runeId);
  if (!rune?.imbueEffect) {
    return { ok: false, reason: "That's not an imbue-able rune." };
  }
  if ((state.run.inventory?.[weaponId] || 0) <= 0) {
    return { ok: false, reason: "You don't own that weapon." };
  }
  if ((state.run.inventory?.[runeId] || 0) <= 0) {
    return { ok: false, reason: "You don't have that rune." };
  }
  // Already imbued with this rune?
  if (state.run.weaponImbues?.[weaponId]?.[runeId]) {
    return { ok: false, reason: "Already imbued with that rune." };
  }
  // #138 — enchant-slot cap. Per-weapon-category limit on bound runes.
  const used = getEnchantSlotUsage(state, weaponId);
  const max = getMaxEnchantSlots(weapon);
  if (used >= max) {
    return { ok: false, reason: `No enchant slots left (${used}/${max}). Remove a rune first.` };
  }
  return { ok: true };
}

// Returns the list of currently-applied rune effects on a weapon. Used
// by combat math + UI.
export function getWeaponImbues(state, weaponId) {
  const map = state.run.weaponImbues?.[weaponId];
  if (!map) return [];
  const out = [];
  for (const runeId of Object.keys(map)) {
    const rune = getResource(runeId);
    if (rune?.imbueEffect) {
      out.push({ runeId, rune, effect: rune.imbueEffect });
    }
  }
  return out;
}

export function performImbueWeapon(state, weaponId, runeId) {
  const check = canImbueWeapon(state, weaponId, runeId);
  if (!check.ok) {
    return { run: state.run, persistent: state.persistent,
      events: [{ kind: "craftFail", message: check.reason }] };
  }

  const weapon = lookupWeapon(weaponId);
  const rune = getResource(runeId);

  // Consume one rune.
  const inventory = { ...state.run.inventory };
  inventory[runeId] = (inventory[runeId] || 0) - 1;
  if (inventory[runeId] <= 0) delete inventory[runeId];

  // Apply the imbue.
  const weaponImbues = { ...(state.run.weaponImbues || {}) };
  const existing = { ...(weaponImbues[weaponId] || {}) };
  existing[runeId] = { appliedAt: Date.now() };
  weaponImbues[weaponId] = existing;

  let run = { ...state.run, inventory, weaponImbues };

  // Grant Runesmithing XP — imbue is the artistic act, not the carve.
  const xp = gainXp(run, "runesmithing", 8);
  run = { ...run, skills: xp.skills };

  const events = [
    { kind: "craft",
      message: `🪬 You bind the ${rune.name} to the ${weapon.name}. ${rune.imbueEffect.label}.` },
    ...xp.events,
  ];

  return { run, persistent: state.persistent, events };
}

// #151 — Bless. Burn 1 rune + spend BLESS_SPIRIT_COST Spirit to apply
// its imbueEffect as a temporary buff for BLESS_DURATION_MS. Different
// from imbues (per-weapon permanent until removed) — blessings are
// time-limited and active no matter which weapon you're swinging.
const BLESS_SPIRIT_COST = 10;
const BLESS_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function getActiveBlessings(state) {
  const now = Date.now();
  const out = {};
  for (const [runeId, b] of Object.entries(state.run?.blessings || {})) {
    if (b.expiresAt > now) out[runeId] = b;
  }
  return out;
}

export function canBless(state, runeId) {
  const rune = getResource(runeId);
  if (!rune?.imbueEffect) return { ok: false, reason: "That's not a rune." };
  if ((state.run.inventory?.[runeId] || 0) <= 0) return { ok: false, reason: "You don't have that rune." };
  if ((state.run.stats?.spirit || 0) < BLESS_SPIRIT_COST) {
    return { ok: false, reason: `Need ${BLESS_SPIRIT_COST} Spirit (have ${Math.floor(state.run.stats?.spirit || 0)}).` };
  }
  if (state.run.blessings?.[runeId]?.expiresAt > Date.now()) {
    return { ok: false, reason: "Already blessed with that rune." };
  }
  return { ok: true };
}

export function performBless(state, runeId) {
  const check = canBless(state, runeId);
  if (!check.ok) {
    return { run: state.run, persistent: state.persistent,
      events: [{ kind: "craftFail", message: check.reason }] };
  }
  const rune = getResource(runeId);
  const inventory = { ...state.run.inventory };
  inventory[runeId] = (inventory[runeId] || 0) - 1;
  if (inventory[runeId] <= 0) delete inventory[runeId];
  const stats = { ...(state.run.stats || {}) };
  stats.spirit = Math.max(0, (stats.spirit || 0) - BLESS_SPIRIT_COST);
  const blessings = { ...(state.run.blessings || {}) };
  blessings[runeId] = { expiresAt: Date.now() + BLESS_DURATION_MS };
  let run = { ...state.run, inventory, stats, blessings };
  const xp = gainXp(run, "runesmithing", 4);
  run = { ...run, skills: xp.skills };
  return { run, persistent: state.persistent,
    events: [{ kind: "craft",
      message: `🕯️ The ${rune.name} burns. The blessing settles on you for 5 minutes. ${rune.imbueEffect.label}.` },
      ...xp.events] };
}

export function tickBlessings(run) {
  const now = Date.now();
  const blessings = run?.blessings || {};
  const keys = Object.keys(blessings);
  const live = {};
  let changed = false;
  const expired = [];
  for (const k of keys) {
    if (blessings[k].expiresAt > now) live[k] = blessings[k];
    else { changed = true; expired.push(k); }
  }
  if (!changed) return { run, events: [] };
  const events = expired.map((k) => {
    const r = getResource(k);
    return { kind: "info", message: `🕯️ The ${r?.name || k} blessing fades.` };
  });
  return { run: { ...run, blessings: live }, events };
}

export function performRemoveImbue(state, weaponId, runeId) {
  const map = state.run.weaponImbues?.[weaponId];
  if (!map || !map[runeId]) {
    return { run: state.run, persistent: state.persistent,
      events: [{ kind: "craftFail", message: "No such imbue to remove." }] };
  }
  const weapon = lookupWeapon(weaponId);
  const rune = getResource(runeId);
  const weaponImbues = { ...(state.run.weaponImbues || {}) };
  const existing = { ...(weaponImbues[weaponId] || {}) };
  delete existing[runeId];
  if (Object.keys(existing).length === 0) delete weaponImbues[weaponId];
  else weaponImbues[weaponId] = existing;
  const run = { ...state.run, weaponImbues };
  return { run, persistent: state.persistent,
    events: [{ kind: "craft",
      message: `🪬 The ${rune?.name || runeId} unbinds from the ${weapon?.name || weaponId}.` }] };
}
