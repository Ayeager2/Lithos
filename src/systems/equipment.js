// Equipment system — equipped weapon/armor slot management.
//
// Task #32 (Combat Phase 1): foundation only — slot state, equip/unequip
// reducer routing, lookup helpers. NO combat resolution here (#33) and
// NO stat-modulation-from-equipped (#47). This is pure plumbing for
// downstream phases to read.
//
// See ERA_PLAN.md "Combat + Weapons + Specialized Skills" for the full
// arc design + locked decisions.
//
// ─── Slot layout (locked AskUserQuestion 2026-05) ──────────────────────
//
// MAIN VISIBLE (8 slots):
//   handLeft, handRight  — melee. Dual-wield possible. Two-handed weapons
//                          consume BOTH (we mark `twoHandedHeldIn` on the
//                          off-slot when a two-handed weapon is equipped
//                          so the player sees the slot is busy).
//   ranged               — bow / throwing. Lives on the back when not drawn.
//   head, chest, leggings, boots, gloves — body armor slots.
//
// ACCESSORIES TRAY (13 slots, all start null, UI hides until expanded):
//   rings[0..9]          — 10 ring slots, 5 per hand. Each carries a small
//                          passive bonus or enchant.
//   back                 — cloak / cape / over-armor (separate from Ranged
//                          which is the bow slot).
//   overArmor            — outer layer beyond chest (plate, robes).
//   talisman             — passive utility slot. Content TBD.
//
// ─── State shape ──────────────────────────────────────────────────────
//
// run.equipped = {
//   handLeft: null | { id, level, xp, enchants },
//   handRight: null | { id, level, xp, enchants } | { twoHandedHeldIn: "handLeft" },
//   ranged: null | { id, level, xp, enchants },
//   head, chest, leggings, boots, gloves: null | { id, level, xp, enchants },
//   rings: [10 entries, each null or { id, level, xp, enchants }],
//   back, overArmor, talisman: null | { id, level, xp, enchants },
// }
//
// Equipped instances carry weapon level + XP + enchants — those fields
// stay zero-valued in Phase 1 since the systems that read them (#33, #37)
// haven't shipped yet. Durability continues to live in `run.toolDurability`
// (keyed by the tool/weapon id) — this keeps Phase 1 compatible with the
// existing applyToolWear flow.

import { getTool, getAllTools } from "../content/tools.js";
import { getWeapon, getAllWeapons } from "../content/weapons.js";
import { getArmor, getAllArmor } from "../content/armor.js";

// Slot constants — exported so UI + dev helpers don't typo-key the state.
export const SLOTS = {
  HAND_LEFT: "handLeft",
  HAND_RIGHT: "handRight",
  RANGED: "ranged",
  HEAD: "head",
  CHEST: "chest",
  LEGGINGS: "leggings",
  BOOTS: "boots",
  GLOVES: "gloves",
  BACK: "back",
  OVER_ARMOR: "overArmor",
  TALISMAN: "talisman",
};

export const HAND_SLOTS = [SLOTS.HAND_LEFT, SLOTS.HAND_RIGHT];
export const RING_COUNT = 10;

// Fresh-run default equipped state. All slots null; rings array of 10
// nulls so React renders all 10 boxes when the tray is expanded.
export function freshEquipped() {
  return {
    [SLOTS.HAND_LEFT]: null,
    [SLOTS.HAND_RIGHT]: null,
    [SLOTS.RANGED]: null,
    [SLOTS.HEAD]: null,
    [SLOTS.CHEST]: null,
    [SLOTS.LEGGINGS]: null,
    [SLOTS.BOOTS]: null,
    [SLOTS.GLOVES]: null,
    rings: Array(RING_COUNT).fill(null),
    [SLOTS.BACK]: null,
    [SLOTS.OVER_ARMOR]: null,
    [SLOTS.TALISMAN]: null,
  };
}

// ─── Equippable item lookup ────────────────────────────────────────────
//
// An "equippable" is any item with weaponStats (or future armorStats).
// Dual-use tools (Stone Axe, Bone Knife, Bow, Fragment Knife) and pure
// weapons (Wooden Club, Stone Spear, Stone Mace) all qualify.
//
// Lookup tries weapons first (pure intent), then tools (dual-use).

export function getEquippable(id) {
  return getWeapon(id) || getTool(id) || getArmor(id) || null;
}

export function getAllEquippables() {
  return [...getAllWeapons(), ...getAllTools(), ...getAllArmor()];
}

// True if this item def can be equipped at all (has weaponStats or
// armorStats — armor support comes in Phase 5 #36).
export function isEquippable(def) {
  if (!def) return false;
  if (def.weaponStats) return true;
  if (def.armorStats) return true; // future
  return false;
}

// Which slot does this item belong in? Reads weaponStats.type. Phase 1
// supports "melee" (either hand), "ranged" (the ranged slot), and
// "two-handed" (both hands).
export function getValidSlotsFor(def) {
  if (!isEquippable(def)) return [];
  if (def.armorStats?.slot) {
    return [def.armorStats.slot];
  }
  const wt = def.weaponStats || {};
  const t = wt.type || def.type;
  if (t === "ranged") return [SLOTS.RANGED];
  if (t === "two-handed") return [SLOTS.HAND_LEFT, SLOTS.HAND_RIGHT];
  if (t === "melee") return [SLOTS.HAND_LEFT, SLOTS.HAND_RIGHT];
  return [];
}

// ─── Gating ────────────────────────────────────────────────────────────

export function canEquip(state, id, targetSlot) {
  const def = getEquippable(id);
  if (!def) return { ok: false, reason: "Unknown item." };
  if (!isEquippable(def)) return { ok: false, reason: "Not equippable." };

  // The item has to be in inventory (you can't equip what you don't have).
  // Stackable potions / consumables don't get equipped — those use the
  // existing USE_TOOL flow.
  if ((state.run.inventory?.[id] || 0) <= 0) {
    return { ok: false, reason: "You don't own one." };
  }
  if (def.consumable) {
    return { ok: false, reason: "Consumables aren't equipped." };
  }

  const valid = getValidSlotsFor(def);
  if (valid.length === 0) {
    return { ok: false, reason: "No valid slot." };
  }
  if (targetSlot && !valid.includes(targetSlot)) {
    return { ok: false, reason: "Wrong slot for this item." };
  }
  return { ok: true };
}

// ─── Mutations ─────────────────────────────────────────────────────────
//
// performEquip(state, id, targetSlot?)
//   • targetSlot omitted → pick the first empty valid slot, or the first
//     valid slot if all are full (overwrite policy: just slot 0)
//   • For two-handed weapons: occupies handLeft, marks handRight as
//     `twoHandedHeldIn: "handLeft"` so the off-hand visually shows busy.
//   • Existing item in slot is REPLACED (just unequipped — stays in
//     inventory since the dual-use items live there). For dedicated
//     weapons it works the same: equipping the second Wooden Club after
//     the first is in handLeft puts the second in handRight.

function makeInstance(id) {
  return { id, level: 1, xp: 0, enchants: [] };
}

export function performEquip(state, id, targetSlot) {
  const check = canEquip(state, id, targetSlot);
  if (!check.ok) {
    return {
      run: state.run,
      events: [{ kind: "actionFail", message: check.reason }],
    };
  }
  const def = getEquippable(id);
  const valid = getValidSlotsFor(def);
  const equipped = state.run.equipped || freshEquipped();

  // Auto-pick slot if none specified — first empty, else first valid.
  let slot = targetSlot;
  if (!slot) {
    slot = valid.find((s) => !equipped[s]) || valid[0];
  }

  let next = { ...equipped };

  // Two-handed: both hands. If anything was in either hand, unequip both.
  if (def.weaponStats?.type === "two-handed") {
    next[SLOTS.HAND_LEFT] = makeInstance(id);
    next[SLOTS.HAND_RIGHT] = { twoHandedHeldIn: SLOTS.HAND_LEFT };
  } else {
    // If the target slot currently holds a two-handed weapon, clear both.
    const cur = equipped[slot];
    if (cur?.twoHandedHeldIn) {
      next[cur.twoHandedHeldIn] = null;
    } else if (equipped[SLOTS.HAND_LEFT]?.twoHandedHeldIn === slot) {
      // Off-hand of a two-handed — clear the main hand.
      next[SLOTS.HAND_LEFT] = null;
    }
    next[slot] = makeInstance(id);
  }

  return {
    run: { ...state.run, equipped: next },
    events: [{ kind: "consume", message: `⚔️ ${def.name} equipped.` }],
  };
}

export function performUnequip(state, slot) {
  const equipped = state.run.equipped || freshEquipped();
  const cur = equipped[slot];
  if (!cur) {
    return {
      run: state.run,
      events: [{ kind: "actionFail", message: "Nothing to unequip there." }],
    };
  }

  let next = { ...equipped };

  // Two-handed pointer slot — unequipping the off-hand pointer clears
  // the main hand instance too.
  if (cur.twoHandedHeldIn) {
    next[cur.twoHandedHeldIn] = null;
    next[slot] = null;
    return {
      run: { ...state.run, equipped: next },
      events: [{ kind: "consume", message: `⚔️ Two-handed weapon unequipped.` }],
    };
  }

  // If the unequipped main hand holds a two-handed weapon, also clear
  // the off-hand pointer.
  if (cur.id) {
    const def = getEquippable(cur.id);
    if (def?.weaponStats?.type === "two-handed") {
      // Find which hand carries the pointer.
      for (const h of HAND_SLOTS) {
        if (h !== slot && equipped[h]?.twoHandedHeldIn === slot) {
          next[h] = null;
        }
      }
    }
  }

  next[slot] = null;
  return {
    run: { ...state.run, equipped: next },
    events: [{ kind: "consume", message: `⚔️ Unequipped.` }],
  };
}

// Ring helpers — rings live in an array on equipped.rings.
export function performEquipRing(state, id, ringIndex) {
  if (ringIndex < 0 || ringIndex >= RING_COUNT) {
    return {
      run: state.run,
      events: [{ kind: "actionFail", message: "Bad ring slot." }],
    };
  }
  const def = getEquippable(id);
  if (!def) {
    return {
      run: state.run,
      events: [{ kind: "actionFail", message: "Unknown ring." }],
    };
  }
  // Rings need their own armorStats.slot === "ring" once content lands.
  // For Phase 1 we accept anything tagged. Future-proof check left as a
  // comment for #45/#46 to enforce.
  const equipped = state.run.equipped || freshEquipped();
  const rings = [...(equipped.rings || Array(RING_COUNT).fill(null))];
  rings[ringIndex] = makeInstance(id);
  return {
    run: { ...state.run, equipped: { ...equipped, rings } },
    events: [{ kind: "consume", message: `💍 ${def.name} placed on ring ${ringIndex + 1}.` }],
  };
}

export function performUnequipRing(state, ringIndex) {
  const equipped = state.run.equipped || freshEquipped();
  const rings = [...(equipped.rings || Array(RING_COUNT).fill(null))];
  if (!rings[ringIndex]) {
    return {
      run: state.run,
      events: [{ kind: "actionFail", message: "No ring in that slot." }],
    };
  }
  rings[ringIndex] = null;
  return {
    run: { ...state.run, equipped: { ...equipped, rings } },
    events: [{ kind: "consume", message: `💍 Ring removed.` }],
  };
}

// ─── Read helpers (for #33 combat + #44 character page) ───────────────
//
// Returns the currently equipped melee weapon (prioritizes main-hand,
// falls back to off-hand). null if neither slot is filled or both hold
// pointers.

export function getEquippedMeleeDef(run) {
  const eq = run?.equipped;
  if (!eq) return null;
  const inst = eq[SLOTS.HAND_LEFT] || eq[SLOTS.HAND_RIGHT];
  if (!inst || inst.twoHandedHeldIn) return null;
  return getEquippable(inst.id);
}

export function getEquippedRangedDef(run) {
  const inst = run?.equipped?.[SLOTS.RANGED];
  if (!inst) return null;
  return getEquippable(inst.id);
}
