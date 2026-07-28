// Weapon definitions — DATA, not code.

// Weapons are equippable items the player wields in their hand or ranged
// slots (see systems/equipment.js for slot rules). They carry `weaponStats`
// that combat resolution (Task #33) will read for damage / accuracy / crit
// rolls. Phase 1 (this file): defs + DUAL-USE pattern only — combat math
// itself comes in Phase 2.

// See ERA_PLAN.md "Combat + Weapons + Specialized Skills" for the design.

// ─── DUAL-USE pattern (locked decision 2026-05) ────────────────────────

// Items with BOTH tool-effects AND weaponStats are dual-use. Equipping a
// Stone Axe (`stoneAxe` in tools.js) puts it in your hand slot — its
// `weaponStats` apply when you fight, its tool `effect` (gather bonus)
// still applies because you're holding it.

// Tools that get dual-use stats live in `tools.js` (their craft path is
// already wired there). This file holds PURE weapons — items whose only
// purpose is combat. Same craft / inventory system; just split by intent.

// ─── Subfamily pattern ─────────────────────────────────────────────────

// Same family (e.g. axe) can split into subfamilies with different stat
// distributions:
//   Hatchet (stoneAxe in tools.js)  — wood-leaning, modest combat
//   Battle Axe (battleAxe, future)  — combat-leaning, modest woodBonus
// Same skill (`woodcutting` for the chop, `swordplay` for the swing).
// The math tells the player why their pickaxe makes a bad sword.

// ─── Weapon shape ─────────────────────────────────────────────────────

//   id, name, icon
//   category: "primitive" | "bronze" | "iron" | "arcane"
//   type:     "melee" | "ranged" | "two-handed"  — slot routing
//   subfamily: "club" | "spear" | "mace" | "axe" | "sword" | "knife" |
//              "pickaxe" | "bow" | "throwing"  — skill + tool-pair tag

//   weaponStats: { damage: [min, max], acc, crit }
//   durability:  { max, wearsOn: "combat" }
//   cost, requires, tier, col
//   onCraftedMessage, onBrokenMessage

// Future fields (Phase 3+):
//   xpToLevel: [n1, n2, ...]
//   levelBonus: { damage: +n/lvl, crit: +0.01/lvl }
//   enchantSlots: 0/1/2/3

export const WEAPON_CATEGORIES = {
  primitive: { id: "primitive", name: "Primitive", order: 1 },
  bronze: { id: "bronze", name: "Bronze", order: 2 },
  iron: { id: "iron", name: "Iron", order: 3 },
  arcane: { id: "arcane", name: "Arcane", order: 4 },
};

export const WEAPONS = {
  // ─── Tier 1 — Primitive melee ──────────────────────────────────────

  woodenClub: {
    id: "woodenClub",
    name: "Wooden Club",
    icon: "🥢",
    category: "primitive",
    type: "melee",
    subfamily: "club",
    description:
      "A hardwood length, rough at one end, weighted at the other. The first weapon — barely a weapon. You hit with it and it hits back into your wrist.",
    weaponStats: { damage: [2, 4], acc: 0.7, crit: 0.02 },
    durability: { max: 20, wearsOn: "combat" },
    cost: { wood: 6, stone: 1 },
    requires: {},
    effectSummary: "Damage 2–4 · Acc 70% · Crit 2% · 20 swings.",
    onCraftedMessage: "🥢 You shape the club. It's not much. It's something.",
    onBrokenMessage: "🥢 The club splinters on a hard strike.",
    tier: 1, col: 0,
  },

  stoneSpear: {
    id: "stoneSpear",
    name: "Stone Spear",
    icon: "🗡️",
    category: "primitive",
    type: "melee",
    subfamily: "spear",
    description:
      "A knapped stone point bound to a hardwood haft. The first reach you've had. The bird falls before it knows you stood up.",
    weaponStats: { damage: [3, 7], acc: 0.82, crit: 0.04 },
    durability: { max: 30, wearsOn: "combat" },
    cost: { wood: 8, stone: 5 },
    requires: { researched: "knapping" },
    effectSummary: "Damage 3–7 · Acc 82% · Crit 4% · 30 thrusts.",
    onCraftedMessage: "🗡️ You bind the point to the shaft. Heavy. Reaches farther than your arm did.",
    onBrokenMessage: "🗡️ The point cracks free of the haft. Time for a new one.",
    tier: 1, col: 1,
  },

  stoneMace: {
    id: "stoneMace",
    name: "Stone Mace",
    icon: "🔨",
    category: "primitive",
    type: "melee",
    subfamily: "mace",
    description:
      "A weighty stone bound to a heavy haft. No edge — just mass meeting bone. You don't slice things; you stop them.",
    weaponStats: { damage: [4, 8], acc: 0.65, crit: 0.06 },
    durability: { max: 25, wearsOn: "combat" },
    cost: { wood: 6, stone: 10 },
    requires: { researched: "knapping" },
    effectSummary: "Damage 4–8 · Acc 65% · Crit 6% · 25 swings.",
    onCraftedMessage: "🔨 You bind the stone-head. It is heavier than you thought. Good.",
    onBrokenMessage: "🔨 The haft cracks where the stone meets the wood.",
    tier: 1, col: 2,
  },

  // ─── Tier 2 — Stone/bronze tier (Era 2, #117).

  flintDagger: {
    id: "flintDagger", name: "Flint Dagger", icon: "🗡️", category: "bronze",
    type: "melee", subfamily: "knife",
    description: "A knapped flint blade lashed to bone. Quick. Mean.",
    weaponStats: { damage: [3, 6], acc: 0.88, crit: 0.15 },
    durability: { max: 35, wearsOn: "combat" },
    cost: { wood: 4, stone: 8, feathers: 2 },
    requires: { researched: "knapping" },
    effectSummary: "Damage 3–6 · Acc 88% · Crit 15% · 35 strikes.",
    onCraftedMessage: "🗡️ The flint settles into the haft.",
    onBrokenMessage: "🗡️ The flint chips and the lashing pulls free.",
    tier: 2, col: 0,
  },

  stoneShortsword: {
    id: "stoneShortsword", name: "Stone Shortsword", icon: "🗡", category: "bronze",
    type: "melee", subfamily: "sword",
    description: "A polished stone blade fitted to a hide-wrapped grip.",
    weaponStats: { damage: [4, 8], acc: 0.84, crit: 0.07 },
    durability: { max: 45, wearsOn: "combat" },
    cost: { wood: 8, stone: 14 },
    requires: { researched: "smithing", builtBuilding: "forge" },
    effectSummary: "Damage 4–8 · Acc 84% · Crit 7% · 45 swings.",
    onCraftedMessage: "🗡 The Stone Shortsword is whole.",
    onBrokenMessage: "🗡 The blade splits at the tang.",
    tier: 2, col: 1,
  },

  obsidianBlade: {
    id: "obsidianBlade", name: "Obsidian Blade", icon: "🌑", category: "bronze",
    type: "melee", subfamily: "sword",
    description: "A blade chipped from glass-black stone. Sharper than anything else. Brittle.",
    weaponStats: { damage: [5, 10], acc: 0.86, crit: 0.18 },
    durability: { max: 30, wearsOn: "combat" },
    cost: { wood: 6, stone: 18 },
    requires: { researched: "smithing", builtBuilding: "forge" },
    effectSummary: "Damage 5–10 · Acc 86% · Crit 18% · 30 swings. Brittle.",
    onCraftedMessage: "🌑 The Obsidian Blade is finished. The edge is a thread of dark glass.",
    onBrokenMessage: "🌑 The blade shatters on impact.",
    tier: 2, col: 2,
  },

  stoneGreatclub: {
    id: "stoneGreatclub", name: "Stone Greatclub", icon: "🪨", category: "bronze",
    type: "two-handed", subfamily: "mace",
    description: "A hardwood haft mounted with a great stone head.",
    weaponStats: { damage: [8, 14], acc: 0.62, crit: 0.05 },
    durability: { max: 40, wearsOn: "combat" },
    cost: { wood: 14, stone: 22 },
    requires: { researched: "smithing", builtBuilding: "forge" },
    effectSummary: "Two-handed. Damage 8–14 · Acc 62% · Crit 5% · 40 swings.",
    onCraftedMessage: "🪨 The Greatclub is whole.",
    onBrokenMessage: "🪨 The stone-head splits off.",
    tier: 2, col: 3,
  },

  boneSpear: {
    id: "boneSpear", name: "Bone Spear", icon: "🦴", category: "bronze",
    type: "melee", subfamily: "spear",
    description: "A long bone honed to a point and lashed to a hardwood shaft.",
    weaponStats: { damage: [5, 10], acc: 0.84, crit: 0.06 },
    durability: { max: 45, wearsOn: "combat" },
    cost: { wood: 10, stone: 4, feathers: 4 },
    requires: { researched: "knapping" },
    effectSummary: "Damage 5–10 · Acc 84% · Crit 6% · 45 thrusts.",
    onCraftedMessage: "🦴 The Bone Spear is bound.",
    onBrokenMessage: "🦴 The bone-point cracks free.",
    tier: 2, col: 4,
  },

  stoneJavelin: {
    id: "stoneJavelin", name: "Stone Javelin", icon: "🎯", category: "bronze",
    type: "ranged", subfamily: "throwing",
    description: "A short throwing spear tipped with knapped stone.",
    weaponStats: { damage: [4, 9], acc: 0.78, crit: 0.07 },
    durability: { max: 30, wearsOn: "combat" },
    cost: { wood: 8, stone: 6, feathers: 2 },
    requires: { researched: "knapping" },
    effectSummary: "Ranged. Damage 4–9 · Acc 78% · 30 throws.",
    onCraftedMessage: "🎯 The Stone Javelin is finished.",
    onBrokenMessage: "🎯 The stone-tip snaps.",
    tier: 2, col: 5,
  },

  shortBow: {
    id: "shortBow", name: "Shortbow", icon: "🏹", category: "bronze",
    type: "ranged", subfamily: "bow",
    description: "A smaller, faster bow. Reads close range better.",
    weaponStats: { damage: [4, 8], acc: 0.86, crit: 0.06 },
    durability: { max: 40, wearsOn: "combat" },
    cost: { wood: 12, feathers: 6, stone: 3 },
    requires: { researched: "fletching", builtBuilding: "forge" },
    effectSummary: "Ranged. Damage 4–8 · Acc 86% · Crit 6% · 40 shots.",
    onCraftedMessage: "🏹 The Shortbow is strung.",
    onBrokenMessage: "🏹 The string snaps.",
    tier: 2, col: 6,
  },

  longBow: {
    id: "longBow", name: "Longbow", icon: "🏹", category: "bronze",
    type: "ranged", subfamily: "bow",
    description: "A tall yew bow. Heavy draw, long reach.",
    weaponStats: { damage: [6, 11], acc: 0.78, crit: 0.07 },
    durability: { max: 45, wearsOn: "combat" },
    cost: { wood: 22, feathers: 10, stone: 4 },
    requires: { researched: "fletching", builtBuilding: "forge" },
    effectSummary: "Ranged. Damage 6–11 · Acc 78% · Crit 7% · 45 shots.",
    onCraftedMessage: "🏹 The Longbow is finished.",
    onBrokenMessage: "🏹 The limb snaps.",
    tier: 2, col: 7,
  },

  // ─── Tier 3 — Iron (Era 2 late / Era 3 transition — slot for #36).
  ironShortsword: {
    id: "ironShortsword", name: "Iron Shortsword", icon: "⚔️", category: "iron",
    type: "melee", subfamily: "sword",
    description: "Forged iron, ground to a clean edge.",
    weaponStats: { damage: [7, 12], acc: 0.88, crit: 0.08 },
    durability: { max: 70, wearsOn: "combat" },
    cost: { wood: 8, stone: 10, iron: 6 },
    requires: { researched: "smithing", builtBuilding: "forge" },
    effectSummary: "Damage 7–12 · Acc 88% · Crit 8% · 70 swings.",
    onCraftedMessage: "⚔️ The Iron Shortsword is whole.",
    onBrokenMessage: "⚔️ The blade fatigues and snaps.",
    tier: 3, col: 0,
  },

  ironGreatsword: {
    id: "ironGreatsword", name: "Iron Greatsword", icon: "🗡️", category: "iron",
    type: "two-handed", subfamily: "sword",
    description: "Two-handed iron sword. Heavy; the cut is decisive.",
    weaponStats: { damage: [10, 16], acc: 0.78, crit: 0.10 },
    durability: { max: 80, wearsOn: "combat" },
    cost: { wood: 14, stone: 8, iron: 12 },
    requires: { researched: "smithing", builtBuilding: "forge" },
    effectSummary: "Two-handed. Damage 10–16 · Acc 78% · Crit 10% · 80 swings.",
    onCraftedMessage: "🗡️ The Iron Greatsword is whole.",
    onBrokenMessage: "🗡️ The blade fractures at the cross-guard.",
    tier: 3, col: 1,
  },

  ironWarhammer: {
    id: "ironWarhammer", name: "Iron Warhammer", icon: "🔨", category: "iron",
    type: "two-handed", subfamily: "mace",
    description: "A great hammer cast in iron.",
    weaponStats: { damage: [11, 17], acc: 0.70, crit: 0.06 },
    durability: { max: 90, wearsOn: "combat" },
    cost: { wood: 16, stone: 10, iron: 14 },
    requires: { researched: "smithing", builtBuilding: "forge" },
    effectSummary: "Two-handed. Damage 11–17 · Acc 70% · Crit 6% · 90 swings.",
    onCraftedMessage: "🔨 The Warhammer is bound.",
    onBrokenMessage: "🔨 The head separates from the haft.",
    tier: 3, col: 2,
  },

  ironHalberd: {
    id: "ironHalberd", name: "Iron Halberd", icon: "🪓", category: "iron",
    type: "two-handed", subfamily: "polearm",
    description: "An iron axe-blade and spike on a long shaft.",
    weaponStats: { damage: [9, 15], acc: 0.80, crit: 0.09 },
    durability: { max: 80, wearsOn: "combat" },
    cost: { wood: 18, stone: 8, iron: 10 },
    requires: { researched: "smithing", builtBuilding: "forge" },
    effectSummary: "Two-handed polearm. Damage 9–15 · Acc 80% · Crit 9% · 80 swings.",
    onCraftedMessage: "🪓 The Halberd is whole.",
    onBrokenMessage: "🪓 The blade-head shears off.",
    tier: 3, col: 3,
  },

  ironDagger: {
    id: "ironDagger", name: "Iron Dagger", icon: "🔪", category: "iron",
    type: "melee", subfamily: "knife",
    description: "A forged iron dagger with a ground edge.",
    weaponStats: { damage: [4, 8], acc: 0.93, crit: 0.20 },
    durability: { max: 65, wearsOn: "combat" },
    cost: { wood: 4, stone: 4, iron: 5 },
    requires: { researched: "smithing", builtBuilding: "forge" },
    effectSummary: "Off-hand. Damage 4–8 · Acc 93% · Crit 20% · 65 strikes.",
    onCraftedMessage: "🔪 The Iron Dagger is whole.",
    onBrokenMessage: "🔪 The dagger snaps at the tang.",
    tier: 3, col: 4,
  },

  ironCrossbow: {
    id: "ironCrossbow", name: "Iron Crossbow", icon: "🎯", category: "iron",
    type: "ranged", subfamily: "crossbow",
    description: "A crossbow with iron limbs. The bolt lands hard.",
    weaponStats: { damage: [8, 14], acc: 0.86, crit: 0.10 },
    durability: { max: 70, wearsOn: "combat" },
    cost: { wood: 14, stone: 6, iron: 8, feathers: 6 },
    requires: { researched: "fletching", builtBuilding: "forge" },
    effectSummary: "Ranged. Damage 8-14 · Acc 86% · Crit 10% · 70 shots.",
    onCraftedMessage: "🎯 The Crossbow is whole.",
    onBrokenMessage: "🎯 The string snaps under tension.",
    tier: 3, col: 5,
  },

  aetherSword: {
    id: "aetherSword", name: "Aether Sword", icon: "⚔️", category: "arcane",
    type: "melee", subfamily: "sword",
    description: "Forged of cold-warm metal. The edge hums against the breath.",
    weaponStats: { damage: [12, 20], acc: 0.92, crit: 0.12 },
    durability: { max: 120, wearsOn: "combat" },
    cost: { aether_iron: 4, iron: 4, wood: 8, fragments: 6 },
    requires: { hasBuilding: "aetherFoundry", era: 4 },
    enchantSlots: 2,
    effectSummary: "Damage 12-20 · Acc 92% · Crit 12% · 120 swings · 2 enchant slots.",
    onCraftedMessage: "⚔️ The Aether Sword is whole.",
    onBrokenMessage: "⚔️ The blade dulls past use.",
    tier: 4, col: 0,
  },
  aetherGreatsword: {
    id: "aetherGreatsword", name: "Aether Greatsword", icon: "🗡️", category: "arcane",
    type: "two-handed", subfamily: "sword",
    description: "A two-handed sword cast in aether iron.",
    weaponStats: { damage: [16, 26], acc: 0.84, crit: 0.14 },
    durability: { max: 130, wearsOn: "combat" },
    cost: { aether_iron: 8, iron: 6, wood: 14, fragments: 10 },
    requires: { hasBuilding: "aetherFoundry", era: 4 },
    enchantSlots: 2,
    effectSummary: "Two-handed. Damage 16-26 · Acc 84% · Crit 14% · 130 swings · 2 enchant slots.",
    onCraftedMessage: "🗡️ The Aether Greatsword is whole.",
    onBrokenMessage: "🗡️ The blade fractures.",
    tier: 4, col: 1,
  },
  aetherCrossbow: {
    id: "aetherCrossbow", name: "Aether Crossbow", icon: "🎯", category: "arcane",
    type: "ranged", subfamily: "crossbow",
    description: "Etched limbs of aether iron.",
    weaponStats: { damage: [14, 22], acc: 0.92, crit: 0.14 },
    durability: { max: 100, wearsOn: "combat" },
    cost: { aether_iron: 5, iron: 4, wood: 12, feathers: 8, fragments: 8 },
    requires: { hasBuilding: "aetherFoundry", era: 4 },
    enchantSlots: 2,
    effectSummary: "Ranged. Damage 14-22 · Acc 92% · Crit 14% · 100 shots · 2 enchant slots.",
    onCraftedMessage: "🎯 The Aether Crossbow is set.",
    onBrokenMessage: "🎯 The aether-string parts.",
    tier: 4, col: 2,
  },
  aetherStaff: {
    id: "aetherStaff", name: "Aether Staff", icon: "🪄", category: "arcane",
    type: "two-handed", subfamily: "staff",
    description: "A staff bound with aether iron caps and conduit-cored heel.",
    weaponStats: { damage: [11, 18], acc: 0.88, crit: 0.10, magicDamageBonus: 6 },
    durability: { max: 110, wearsOn: "combat" },
    cost: { aether_iron: 4, conduit_core: 2, wood: 16, fragments: 12 },
    requires: { hasBuilding: "aetherFoundry", era: 4 },
    enchantSlots: 3,
    effectSummary: "Magic two-handed. Damage 11-18 · +6 magic dmg · Acc 88% · Crit 10% · 110 casts · 3 enchant slots.",
    onCraftedMessage: "🪄 The Aether Staff balances itself.",
    onBrokenMessage: "🪄 The conduit at the heel goes dark.",
    tier: 4, col: 3,
  },
  aetherWarhammer: {
    id: "aetherWarhammer", name: "Aether Warhammer", icon: "🔨", category: "arcane",
    type: "two-handed", subfamily: "mace",
    description: "A two-handed warhammer with an aether-iron head.",
    weaponStats: { damage: [18, 28], acc: 0.78, crit: 0.10 },
    durability: { max: 150, wearsOn: "combat" },
    cost: { aether_iron: 8, conduit_core: 1, iron: 8, wood: 14, fragments: 8 },
    requires: { hasBuilding: "aetherFoundry", era: 4 },
    enchantSlots: 2,
    effectSummary: "Two-handed. Damage 18-28 · Acc 78% · Crit 10% · 150 swings · 2 enchant slots.",
    onCraftedMessage: "🔨 The Aether Warhammer is whole.",
    onBrokenMessage: "🔨 The head splits.",
    tier: 4, col: 4,
  },
};

export const getWeapon = (id) => WEAPONS[id] || null;
export const getAllWeapons = () => Object.values(WEAPONS);
