// Tinker items (#211) — DATA, not code.
//
// 9 deployable combat/utility items spanning Era 2-4. Each:
//   • Hard-gates on `tinker > 0` skill (only Tinker can craft AND use).
//   • Synergy-weighted recipe — effective skill = tinker*1.0 + Σ(synergySkill*weight).
//   • Single-use consumable (combat) OR loop-bound (patrol).
//
// Schema:
//   id, name, icon, description, era
//   category: "tinker", discipline: "tinker"
//   useKind: "combat-throw" | "patrol-set" | "exit"   — what slot it fires in
//   effect: {
//     accDebuffOnEnemy?, autoWinChance?, counterDamage?, defenseIgnore?,
//     stunChance?, guaranteedCatch?, aoeDamage?, sanityCost?, blockRaidChance?,
//     emergencyExit?,
//   }
//   tinkerLevelRequired (hard floor — tinker XP source for crafting AND use)
//   synergySkills: [{ id, weight }]
//   cost: { res: qty, ... }
//   durability: { max: 1 } (consumables wear in one use)
//   craftedAt: optional — building where it can be made (default: workbench/forge)

export const TINKER_ITEMS = {
  // ─── Era 2 (Tinker 1-5) ──────────────────────────────────────────
  smokeBomb: {
    id: "smokeBomb", name: "Smoke Bomb", icon: "🧨",
    category: "tinker", discipline: "tinker", useKind: "combat-throw", era: 2,
    description: "A waxed paper sphere with a fuse short enough to be exciting. Blinds the enemy for one fight.",
    effect: { accDebuffOnEnemy: 0.20 },
    tinkerLevelRequired: 1,
    synergySkills: [{ id: "alchemy", weight: 0.8 }, { id: "survivalcraft", weight: 0.3 }],
    cost: { stone: 2, salt_crystal: 1, rags: 1 },
    durability: { max: 1 },
    onCraftedMessage: "🧨 Smoke bomb wrapped tight. Don't drop it.",
    onUsedMessage: "🧨 You hurl the bomb. The smoke rises black and lingers.",
  },

  tripWire: {
    id: "tripWire", name: "Trip Wire", icon: "🪤",
    category: "tinker", discipline: "tinker", useKind: "patrol-set", era: 2,
    description: "Set before a patrol. 25% chance the foe falls to it before you arrive.",
    effect: { autoWinChance: 0.25 },
    tinkerLevelRequired: 2,
    synergySkills: [{ id: "hunting", weight: 1.0 }, { id: "survivalcraft", weight: 0.5 }],
    cost: { sinew: 2, wood: 3, stone: 1 },
    durability: { max: 1 },
    onCraftedMessage: "🪤 Trip wire coiled. The tension feels right.",
    onUsedMessage: "🪤 You set the trip wire. Now you walk past once and wait.",
  },

  caltropBag: {
    id: "caltropBag", name: "Caltrop Bag", icon: "🌿",
    category: "tinker", discipline: "tinker", useKind: "combat-throw", era: 2,
    description: "Iron-hooked seeds in a hide pouch. Counter-damages anything that hits you in this fight.",
    effect: { counterDamage: [1, 3] },
    tinkerLevelRequired: 2,
    synergySkills: [{ id: "blacksmithing", weight: 1.0 }, { id: "hunting", weight: 0.4 }],
    cost: { iron: 1, hide: 1, stone: 2 },
    durability: { max: 1 },
    onCraftedMessage: "🌿 Caltrop bag is tight. The hooks are sharp.",
    onUsedMessage: "🌿 You scatter caltrops underfoot. Anything that lunges pays for it.",
  },

  // ─── Era 3 (Tinker 5-10) ─────────────────────────────────────────
  acidVial: {
    id: "acidVial", name: "Acid Vial", icon: "🧪",
    category: "tinker", discipline: "tinker", useKind: "combat-throw", era: 3,
    description: "Eats through armor. The fight gets cheap fast — your strikes ignore 50% of enemy defense for one combat.",
    effect: { defenseIgnoreFraction: 0.5 },
    tinkerLevelRequired: 5,
    synergySkills: [{ id: "alchemy", weight: 1.0 }, { id: "runesmithing", weight: 0.5 }],
    cost: { fragments: 3, bile_sac: 1, glass_shard: 1 },
    durability: { max: 1 },
    onCraftedMessage: "🧪 Acid vial sealed. The hiss inside the glass is unsettling.",
    onUsedMessage: "🧪 You smash the vial against the target. Armor blisters.",
  },

  flashCharge: {
    id: "flashCharge", name: "Flash Charge", icon: "⚡",
    category: "tinker", discipline: "tinker", useKind: "combat-throw", era: 3,
    description: "A sigil-bound charge. 60% chance to stun the target for one round.",
    effect: { stunChance: 0.60 },
    tinkerLevelRequired: 6,
    synergySkills: [{ id: "sigilcraft", weight: 1.0 }, { id: "alchemy", weight: 0.7 }],
    cost: { fragments: 4, ink: 1, iron: 1 },
    durability: { max: 1 },
    onCraftedMessage: "⚡ Flash charge is wound. Hold it by the cord.",
    onUsedMessage: "⚡ You throw the charge. The light is its own weapon.",
  },

  springSnare: {
    id: "springSnare", name: "Spring Snare", icon: "🪝",
    category: "tinker", discipline: "tinker", useKind: "patrol-set", era: 3,
    description: "A baited spring-loaded snare. Guarantees the catch on a hunting loop.",
    effect: { guaranteedCatch: true },
    tinkerLevelRequired: 7,
    synergySkills: [{ id: "hunting", weight: 1.2 }, { id: "blacksmithing", weight: 0.5 }],
    cost: { iron: 2, sinew: 3, wood: 4 },
    durability: { max: 1 },
    onCraftedMessage: "🪝 Spring snare is set. The trigger is light.",
    onUsedMessage: "🪝 You bait the snare and walk away. The wait is the work.",
  },

  // ─── Era 4 (Tinker 10-20) ────────────────────────────────────────
  aetherGrenade: {
    id: "aetherGrenade", name: "Aether Grenade", icon: "💣",
    category: "tinker", discipline: "tinker", useKind: "combat-throw", era: 4,
    description: "Aether iron casing, conduit-core fuse. AoE +30 damage. -3 sanity per use.",
    effect: { aoeDamage: 30, sanityCost: 3 },
    tinkerLevelRequired: 10,
    synergySkills: [
      { id: "alchemy", weight: 0.8 },
      { id: "blacksmithing", weight: 0.8 },
      { id: "runesmithing", weight: 0.5 },
    ],
    cost: { aether_iron: 1, fragments: 4, iron: 1 },
    durability: { max: 1 },
    onCraftedMessage: "💣 Aether grenade sealed. The fuse is short. Don't smile at it.",
    onUsedMessage: "💣 You throw the grenade. The blast hums in the chest after the bang.",
  },

  webSpinner: {
    id: "webSpinner", name: "Web Spinner", icon: "🕸️",
    category: "tinker", discipline: "tinker", useKind: "patrol-set", era: 4,
    description: "A spinneret-cored sigil device. Set at the perimeter, 50% chance to block the next raid sweep.",
    effect: { blockRaidChance: 0.50 },
    tinkerLevelRequired: 12,
    synergySkills: [{ id: "hunting", weight: 1.0 }, { id: "sigilcraft", weight: 1.0 }],
    cost: { aether_iron: 1, sinew: 4, fragments: 6, ink: 2 },
    durability: { max: 1 },
    onCraftedMessage: "🕸️ Web spinner is wound. The thread is fine.",
    onUsedMessage: "🕸️ The spinner unrolls a perimeter web. Anything that crosses it has to consider.",
  },

  recallBeacon: {
    id: "recallBeacon", name: "Recall Beacon", icon: "🌀",
    category: "tinker", discipline: "tinker", useKind: "exit", era: 4,
    description: "Activates: ends the current fight or patrol immediately, returning you home with nothing lost. Apex tinker work.",
    effect: { emergencyExit: true },
    tinkerLevelRequired: 15,
    synergySkills: [
      { id: "sigilcraft", weight: 1.0 },
      { id: "runesmithing", weight: 1.0 },
      { id: "alchemy", weight: 0.5 },
    ],
    requiresStudy: "ghostcall", // memory path apex
    cost: { aether_iron: 2, conduit_core: 1, fragments: 10, ink: 3 },
    durability: { max: 1 },
    onCraftedMessage: "🌀 Recall beacon is bound. The pull-string trembles in the hand.",
    onUsedMessage: "🌀 You pull the beacon's cord. The world folds. You arrive home.",
  },
};

export const getTinkerItem = (id) => TINKER_ITEMS[id] || null;
export const getAllTinkerItems = () => Object.values(TINKER_ITEMS);

// Effective craft skill for a recipe — tinker level + weighted synergy
// skill levels. Used by recipe success rolls.
export function getTinkerEffectiveSkill(state, recipe) {
  const skills = state?.run?.skills || {};
  let eff = (skills.tinker?.level || 0) * 1.0;
  for (const syn of recipe.synergySkills || []) {
    const lvl = skills[syn.id]?.level || 0;
    eff += lvl * (syn.weight || 0);
  }
  return eff;
}

// Gate check — both crafting AND using requires tinker > 0.
export function canUseTinker(state, itemId) {
  const item = TINKER_ITEMS[itemId];
  if (!item) return { ok: false, reason: "Unknown tinker item." };
  const lvl = state?.run?.skills?.tinker?.level || 0;
  if (lvl < (item.tinkerLevelRequired || 1)) {
    return { ok: false, reason: `Requires Tinker ${item.tinkerLevelRequired}.` };
  }
  return { ok: true };
}
