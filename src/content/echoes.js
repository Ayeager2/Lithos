// Echo upgrades — DATA, not code.
//
// Spent at the prestige shop. Persistent — purchased levels survive every
// prestige forever. Each upgrade has an `effect` shape the system reads
// at fresh-run application time:
//   startInventory: { resourceId: qtyPerLevel }   — granted to inventory
//   startStatDelta: { statKey: deltaPerLevel }    — added to starting stats
//   startSkillLevel: { skillId: levelsPerTier }   — seeds skill at level
//
// Cost scaling: `cost(level)` returns Echoes required to BUY the NEXT level.
// For tiered upgrades, this is `ceil(baseCost * 1.5 ^ currentLevel)` so each
// purchase costs more than the last. For one-time upgrades, maxLevel = 1 and
// the cost is just `baseCost`.

export const ECHO_CATEGORIES = {
  body:    { id: "body",    name: "Body",    order: 1 },
  mind:    { id: "mind",    name: "Mind",    order: 2 },
  skills:  { id: "skills",  name: "Skills",  order: 3 },
  arcane:  { id: "arcane",  name: "Arcane",  order: 4 },
  cache:   { id: "cache",   name: "Cache",   order: 5 },
  town:    { id: "town",    name: "Town",    order: 6 },
};

export const ECHO_UPGRADES = {
  // ============== Cache (starting inventory) ==============

  startWood: {
    id: "startWood",
    name: "Old Wood",
    icon: "🪵",
    category: "cache",
    description: "Begin each run with +10 wood per level. The stone remembers what you carried.",
    baseCost: 2,
    maxLevel: 5,
    effect: { startInventory: { wood: 10 } },
  },

  startStone: {
    id: "startStone",
    name: "Old Stone",
    icon: "🪨",
    category: "cache",
    description: "Begin each run with +10 stone per level.",
    baseCost: 2,
    maxLevel: 5,
    effect: { startInventory: { stone: 10 } },
  },

  startWater: {
    id: "startWater",
    name: "A Full Skin",
    icon: "💧",
    category: "cache",
    description: "Begin each run with +5 water per level. The skin is yours; the water is the world's.",
    baseCost: 3,
    maxLevel: 4,
    // Echoes apply on fresh runs, before any water building — so the
    // starting cache is stagnant ("the water is the world's") rather than
    // muddy. See ERA_PLAN.md "Water tiers + dysentery".
    effect: { startInventory: { water_stagnant: 5 } },
  },

  // ============== Body (starting physical state) ==============

  toughBody: {
    id: "toughBody",
    name: "Tougher Body",
    icon: "💪",
    category: "body",
    description: "Begin each run with +20 HP. The wasteland's first blow lands less hard.",
    baseCost: 5,
    maxLevel: 1,
    effect: { startStatDelta: { hp: 20 } },
  },

  fullBelly: {
    id: "fullBelly",
    name: "A Full Belly",
    icon: "🥣",
    category: "body",
    description: "Begin each run with hunger -20. Whatever you ate before the world ended, you ate well.",
    baseCost: 4,
    maxLevel: 1,
    effect: { startStatDelta: { hunger: -20 } },
  },

  hydrated: {
    id: "hydrated",
    name: "Hydrated",
    icon: "🚰",
    category: "body",
    description: "Begin each run with thirst -20. There was a creek, once. You remember it.",
    baseCost: 4,
    maxLevel: 1,
    effect: { startStatDelta: { thirst: -20 } },
  },

  // ============== Mind (Resolve + Sanity baselines) ==============

  resolveBaseline: {
    id: "resolveBaseline",
    name: "Steady Will",
    icon: "✦",
    category: "mind",
    description: "Begin each run with +15 Resolve. The lessons stick where the flesh doesn't.",
    baseCost: 5,
    maxLevel: 1,
    effect: { startStatDelta: { happiness: 15 } },
  },

  sanityBaseline: {
    id: "sanityBaseline",
    name: "Steady Mind",
    icon: "◐",
    category: "mind",
    description: "Begin each run with +15 Sanity. Less afraid of the dust on the second waking.",
    baseCost: 5,
    maxLevel: 1,
    effect: { startStatDelta: { sanity: 15 } },
  },

  // ============== Skills (head-start at level N) ==============

  skillForaging: {
    id: "skillForaging",
    name: "Foraging Memory",
    icon: "🌿",
    category: "skills",
    description: "Begin each run with Foraging at +1 level per tier.",
    baseCost: 3,
    maxLevel: 5,
    effect: { startSkillLevel: { foraging: 1 } },
  },

  skillHunting: {
    id: "skillHunting",
    name: "Hunting Memory",
    icon: "🏹",
    category: "skills",
    description: "Begin each run with Hunting at +1 level per tier.",
    baseCost: 3,
    maxLevel: 5,
    effect: { startSkillLevel: { hunting: 1 } },
  },

  skillCrafting: {
    id: "skillCrafting",
    name: "Crafting Memory",
    icon: "🪡",
    category: "skills",
    description: "Begin each run with Crafting at +1 level per tier.",
    baseCost: 3,
    maxLevel: 5,
    effect: { startSkillLevel: { crafting: 1 } },
  },

  skillBuilding: {
    id: "skillBuilding",
    name: "Building Memory",
    icon: "🏗️",
    category: "skills",
    description: "Begin each run with Building at +1 level per tier.",
    baseCost: 3,
    maxLevel: 5,
    effect: { startSkillLevel: { building: 1 } },
  },

  // ============== Arcane (Era 3+ feel) ==============

  startFragments: {
    id: "startFragments",
    name: "Sliver of Stone",
    icon: "✨",
    category: "arcane",
    description: "Begin each run with +5 fragments per level. The shards know the way back.",
    baseCost: 4,
    maxLevel: 3,
    effect: { startInventory: { fragments: 5 } },
  },

  startSpirit: {
    id: "startSpirit",
    name: "Banked Spirit",
    icon: "💜",
    category: "arcane",
    description: "Begin each run with Spirit +10 per level. Some of you crossed over and didn't quite leave.",
    baseCost: 4,
    maxLevel: 4,
    effect: { startStatDelta: { spirit: 10 } },
  },

  // ============== Town (passive workers — #71) ==============
  // Each level hires another townsperson to patrol on your behalf. They
  // work the Era 1 wilds (the only ground they know), bring back drops at
  // half quantity (their cut for the trouble), and only fight when you're
  // resting. Persistent — once hired, they remember you across every
  // ascension. Effect is empty: systems/workers.js reads the level
  // directly from persistent.echoUpgrades.townWorkers.
  townWorkers: {
    id: "townWorkers",
    name: "Town Workers",
    icon: "🛠️",
    category: "town",
    description: "Hire one townsperson per level to patrol the Era 1 wilds for you. They take a small cut.",
    baseCost: 8,
    maxLevel: 5,
    effect: {},
  },

  // ============== Era 5 — Touched Memory (#230) ==============
  // Tiered echo upgrades that preserve Era 5 resources across prestige.
  touchedMemory: {
    id: "touchedMemory",
    name: "Touched Memory",
    icon: "🧿",
    category: "arcane",
    description: "Preserve some of your Era 5 reckoning hoard across prestige. Each level keeps more Void Residue + First-Light Shards.",
    baseCost: 8,
    maxLevel: 4,
    effect: { reckoningCarryPerLevel: [1, 3, 10, -1] },
  },
};

export const getEchoUpgrade = (id) => ECHO_UPGRADES[id] || null;
export const getAllEchoUpgrades = () => Object.values(ECHO_UPGRADES);

// Cost to BUY THE NEXT level. For tiered upgrades grows 1.5x per level.
// Returns null if already at maxLevel.
export function getNextLevelCost(upgrade, currentLevel) {
  if (!upgrade) return null;
  if (currentLevel >= (upgrade.maxLevel ?? 1)) return null;
  return Math.ceil(upgrade.baseCost * Math.pow(1.5, currentLevel));
}
