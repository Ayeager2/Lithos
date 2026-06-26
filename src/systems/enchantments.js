// Weapon enchantments system (#37 / #170).
//
// Distinct from runes: permanent, study-gated, per-weapon-tier slot
// counts (separate budget from rune imbues). Applied at the Stone Altar.
//
// State shape on run:
//   run.enchantments = { [weaponId]: { [enchantId]: { appliedAt } } }
//
// Combat math reads aggregated enchantment effects via combat.js's
// getEffectiveImbueEffects — same effect schema as runes, so no separate
// pipeline.

import { getEnchantment, getAllEnchantments } from "../content/enchantments.js";
import { getWeapon } from "../content/weapons.js";
import { getTool } from "../content/tools.js";
import { STUDIES, STUDY_PATHS } from "../content/studies.js";
import { gainXp } from "./skills.js";
import { stampEtchingOnce, isFirstStamp } from "./etchings.js";

function lookupWeapon(weaponId) {
  return getWeapon(weaponId) || getTool(weaponId) || null;
}

// Slot caps mirror rune-imbue caps but apply separately. Primitive
// weapons can carry 1 enchantment; bronze 2; iron 2; arcane 3.
const SLOTS_BY_CATEGORY = {
  primitive: 1,
  bronze: 2,
  iron: 2,
  arcane: 3,
};
export function getMaxEnchantmentSlots(weapon) {
  if (!weapon) return 0;
  if (typeof weapon.maxEnchantmentSlots === "number") return weapon.maxEnchantmentSlots;
  return SLOTS_BY_CATEGORY[weapon.category] ?? 1;
}

export function getEnchantmentUsage(state, weaponId) {
  const map = state.run?.enchantments?.[weaponId];
  if (!map) return 0;
  return Object.keys(map).length;
}

// Returns the list of enchantments currently bound to a weapon.
export function getWeaponEnchantments(state, weaponId) {
  const map = state.run?.enchantments?.[weaponId];
  if (!map) return [];
  const out = [];
  for (const eid of Object.keys(map)) {
    const def = getEnchantment(eid);
    if (def?.effect) out.push({ id: eid, def, effect: def.effect });
  }
  return out;
}

// Was the prerequisite study completed?
function studyDone(state, sid) {
  return !!state.run.studiesCompleted?.[sid];
}

// Alignment gate satisfied?
function alignmentMet(state, gate) {
  if (!gate) return true;
  const a = state.run.alignment || {};
  for (const [k, v] of Object.entries(gate)) {
    if ((a[k] || 0) < v) return false;
  }
  return true;
}

export function canEnchant(state, weaponId, enchantId) {
  const weapon = lookupWeapon(weaponId);
  if (!weapon || !weapon.weaponStats) return { ok: false, reason: "That's not a weapon." };
  const def = getEnchantment(enchantId);
  if (!def) return { ok: false, reason: "Unknown enchantment." };
  if ((state.run.inventory?.[weaponId] || 0) <= 0) {
    return { ok: false, reason: "You don't own that weapon." };
  }
  // Study prereq (#177 — show the study name + path for context).
  const sid = def.requires?.studied;
  if (sid && !studyDone(state, sid)) {
    const studyDef = STUDIES[sid];
    const studyName = studyDef?.name || sid;
    const pathName = STUDY_PATHS[studyDef?.path]?.name || def.path;
    return { ok: false,
      reason: `Requires completing the "${studyName}" study (${pathName} path).` };
  }
  // Alignment prereq (#177 — show the threshold + current value).
  const gate = def.requires?.alignment;
  if (gate && !alignmentMet(state, gate)) {
    const a = state.run.alignment || {};
    const parts = Object.entries(gate)
      .map(([k, v]) => `${v} ${k} (have ${a[k] || 0})`)
      .join(", ");
    return { ok: false, reason: `Requires alignment: ${parts}.` };
  }
  // Stone Altar (and Era 3) required to enchant.
  if (!state.run.built?.stoneAltar) {
    return { ok: false, reason: "You need the Stone Altar to enchant." };
  }
  // Already applied?
  if (state.run.enchantments?.[weaponId]?.[enchantId]) {
    return { ok: false, reason: "Already enchanted with that mark." };
  }
  // Slot cap.
  const used = getEnchantmentUsage(state, weaponId);
  const max = getMaxEnchantmentSlots(weapon);
  if (used >= max) {
    return { ok: false, reason: `No enchant slots (${used}/${max}). Enchantments are permanent — choose carefully.` };
  }
  // Cost check.
  const cost = def.cost || {};
  if ((state.run.inventory?.fragments || 0) < (cost.fragments || 0)) {
    return { ok: false, reason: `Need ${cost.fragments} Arcane Shards.` };
  }
  if ((state.run.stats?.spirit || 0) < (cost.spirit || 0)) {
    return { ok: false, reason: `Need ${cost.spirit} Spirit (have ${Math.floor(state.run.stats?.spirit || 0)}).` };
  }
  return { ok: true };
}

export function performEnchant(state, weaponId, enchantId) {
  const check = canEnchant(state, weaponId, enchantId);
  if (!check.ok) {
    return { run: state.run, persistent: state.persistent,
      events: [{ kind: "craftFail", message: check.reason }] };
  }
  const def = getEnchantment(enchantId);
  const weapon = lookupWeapon(weaponId);
  const cost = def.cost || {};

  // Spend cost.
  const inventory = { ...state.run.inventory };
  inventory.fragments = (inventory.fragments || 0) - (cost.fragments || 0);
  const stats = { ...(state.run.stats || {}) };
  stats.spirit = Math.max(0, (stats.spirit || 0) - (cost.spirit || 0));

  // Apply enchantment.
  const enchantments = { ...(state.run.enchantments || {}) };
  const onWeapon = { ...(enchantments[weaponId] || {}) };
  onWeapon[enchantId] = { appliedAt: Date.now() };
  enchantments[weaponId] = onWeapon;

  let run = { ...state.run, inventory, stats, enchantments };

  // Runesmithing XP — enchanting is the deeper expression of the same
  // craft, so reuse the skill.
  const xp = gainXp(run, "runesmithing", 20);
  run = { ...run, skills: xp.skills };

  // #176 — first enchant ever stamps an etching.
  let persistent = state.persistent;
  const fid = "craft:enchant:first";
  const events = [{ kind: "craft",
    message: `🪬 You etch the ${def.name} into the ${weapon.name}. It will not come off. ${def.effect.label}.` },
    ...xp.events];
  if (isFirstStamp(persistent, fid)) {
    persistent = stampEtchingOnce(persistent, fid, `First enchant etched (${def.name})`);
    events.push({
      kind: "milestone",
      message: `🕯️ An etching appears on the Altar: First enchant etched.`,
    });
  }

  return { run, persistent, events };
}
