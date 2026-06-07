// Gather node definitions — DATA, not code (#97).
//
// The Gather page (src/ui/GatherView.jsx) renders a tabbed view per
// discipline; each tab is a grid of these node cards. Click → auto-loop
// gathers that node; drops accrue into the Pile of Goods; the matching
// gather skill earns XP.
//
// Schema mirrors content/prey.js so the auto-loop system can resolve
// any gather kind (prey, foraging node, mining vein, etc.) through one
// uniform interface.
//
//   id, name, icon            — identity
//   discipline                — which Gather tab it belongs to
//   skill                     — skill id that earns XP on success
//   era                       — earliest era this node appears
//   tier                      — common / uncommon / rare
//   encounterChance           — weight in randomized pulls (future use)
//   difficulty                — 0..1 chance a gather attempt yields nothing
//   drops                     — [{ resource, qty:[min,max]|N, chance }]
//   xp                        — skill XP per success
//   cycleMs                   — per-cycle gather time (default: 6s)
//   description               — flavor for the card
//   flavor                    — { opener, success, fail } pool

export const GATHER_NODES = {
  // ═══════════════════════════════════════════════════════════════════
  // FORAGING — replaces the original Gather button. Era 1+.
  // ═══════════════════════════════════════════════════════════════════
  dustPatch: {
    id: "dustPatch", name: "Dust Patch", icon: "🌫️",
    discipline: "foraging", skill: "foraging",
    era: 1, tier: "common", encounterChance: 1.0, difficulty: 0.1,
    description: "A patch of cracked earth where a grub or a stick might surface.",
    drops: [
      { resource: "food",  qty: [0, 1], chance: 0.5 },
      { resource: "wood",  qty: 1, chance: 0.4 },
      { resource: "stone", qty: 1, chance: 0.3 },
    ],
    xp: 1, cycleMs: 5000,
    flavor: {
      opener: ["🌫️ You sift the patch."],
      success: ["🌫️ Found something usable."],
      fail: ["🌫️ Nothing here today."],
    },
  },
  wildGarden: {
    id: "wildGarden", name: "Wild Garden", icon: "🌱",
    discipline: "foraging", skill: "foraging",
    era: 1, tier: "common", encounterChance: 0.9, difficulty: 0.15,
    description: "Volunteer greens between cracked stones. Bitter, but food.",
    drops: [
      { resource: "food",  qty: [1, 2], chance: 0.9 },
      { resource: "herbs", qty: 1, chance: 0.3 },
    ],
    xp: 2, cycleMs: 6000,
    flavor: {
      opener: ["🌱 You comb through the volunteers."],
      success: ["🌱 A handful of green."],
      fail: ["🌱 Only stalks."],
    },
  },
  carrionCluster: {
    id: "carrionCluster", name: "Carrion Cluster", icon: "🦴",
    discipline: "foraging", skill: "foraging",
    era: 1, tier: "uncommon", encounterChance: 0.5, difficulty: 0.2,
    description: "Bones picked clean. Useful, if you don't think about it.",
    drops: [
      { resource: "hollow_bone", qty: [1, 2], chance: 0.7 },
      { resource: "food", qty: 1, chance: 0.2 },
    ],
    xp: 3, cycleMs: 7000,
    flavor: {
      opener: ["🦴 You crouch over the pile."],
      success: ["🦴 Bone in hand."],
      fail: ["🦴 Picked through already."],
    },
  },
  ashPool: {
    id: "ashPool", name: "Ash Pool", icon: "💧",
    discipline: "foraging", skill: "foraging",
    era: 1, tier: "common", encounterChance: 0.85, difficulty: 0.1,
    description: "Stagnant water in a low place. Drinkable if you boil it.",
    drops: [
      { resource: "water_stagnant", qty: [1, 2], chance: 1.0 },
    ],
    xp: 1, cycleMs: 5500,
    flavor: {
      opener: ["💧 You kneel at the pool."],
      success: ["💧 Filled the skin."],
      fail: ["💧 Pool dried since last time."],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // MINING — Era 1+. Heavy stone/ore yields, slower cycles.
  // ═══════════════════════════════════════════════════════════════════
  stoneOutcrop: {
    id: "stoneOutcrop", name: "Stone Outcrop", icon: "🪨",
    discipline: "mining", skill: "mining",
    era: 1, tier: "common", encounterChance: 1.0, difficulty: 0.05,
    description: "A flat shelf of grey stone. Patient work yields chunks.",
    drops: [
      { resource: "stone", qty: [1, 3], chance: 1.0 },
    ],
    xp: 2, cycleMs: 7000,
    flavor: {
      opener: ["🪨 You swing the pick."],
      success: ["🪨 Chip flakes loose."],
      fail: ["🪨 The pick slides."],
    },
  },
  ironVein: {
    id: "ironVein", name: "Iron Vein", icon: "⛓️",
    discipline: "mining", skill: "mining",
    era: 2, tier: "uncommon", encounterChance: 0.6, difficulty: 0.25,
    description: "A red-brown streak through the rock face. Bog iron — useful if you can smelt it.",
    drops: [
      { resource: "stone", qty: 1, chance: 0.7 },
      { resource: "bog_iron", qty: [1, 2], chance: 0.8 },
    ],
    xp: 4, cycleMs: 9000,
    flavor: {
      opener: ["⛓️ You read the red streak."],
      success: ["⛓️ Iron in hand."],
      fail: ["⛓️ The vein closed."],
    },
  },
  coalSeam: {
    id: "coalSeam", name: "Coal Seam", icon: "🌑",
    discipline: "mining", skill: "mining",
    era: 2, tier: "uncommon", encounterChance: 0.5, difficulty: 0.2,
    description: "Black layered rock. Smokes hot.",
    drops: [
      { resource: "coal", qty: [1, 2], chance: 0.9 },
    ],
    xp: 4, cycleMs: 8000,
    flavor: {
      opener: ["🌑 You strike the seam."],
      success: ["🌑 Coal comes loose."],
      fail: ["🌑 Just rock."],
    },
  },
  fragmentCluster: {
    id: "fragmentCluster", name: "Fragment Cluster", icon: "✨",
    discipline: "mining", skill: "mining",
    era: 3, tier: "rare", encounterChance: 0.3, difficulty: 0.4,
    description: "Shards that hum against your tools. Knock loose — gently.",
    drops: [
      { resource: "fragments", qty: [1, 2], chance: 0.85 },
      { resource: "stone", qty: 1, chance: 0.4 },
    ],
    xp: 6, cycleMs: 10000,
    flavor: {
      opener: ["✨ Your pick rings against the shard."],
      success: ["✨ A piece comes free, humming."],
      fail: ["✨ The shard rejects the strike."],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // WOODCUTTING — Era 1+. Wood + hardwood + kindling.
  // ═══════════════════════════════════════════════════════════════════
  twistedBrush: {
    id: "twistedBrush", name: "Twisted Brush", icon: "🌿",
    discipline: "woodcutting", skill: "woodcutting",
    era: 1, tier: "common", encounterChance: 1.0, difficulty: 0.1,
    description: "Knotted scrub. Burns fast, snaps easy.",
    drops: [
      { resource: "wood", qty: [1, 2], chance: 1.0 },
    ],
    xp: 1, cycleMs: 5000,
    flavor: {
      opener: ["🌿 You hack at the brush."],
      success: ["🌿 An armful of fuel."],
      fail: ["🌿 Mostly dust."],
    },
  },
  standingWood: {
    id: "standingWood", name: "Standing Wood", icon: "🌳",
    discipline: "woodcutting", skill: "woodcutting",
    era: 1, tier: "uncommon", encounterChance: 0.65, difficulty: 0.2,
    description: "An actual tree somehow. Slow strikes, real planks.",
    drops: [
      { resource: "wood", qty: [2, 4], chance: 1.0 },
    ],
    xp: 3, cycleMs: 8500,
    flavor: {
      opener: ["🌳 You set the axe to the trunk."],
      success: ["🌳 The tree comes down."],
      fail: ["🌳 The axe glances off."],
    },
  },
  deadGrove: {
    id: "deadGrove", name: "Dead Grove", icon: "🪵",
    discipline: "woodcutting", skill: "woodcutting",
    era: 2, tier: "uncommon", encounterChance: 0.5, difficulty: 0.15,
    description: "Salt-blackened trunks, long dead. Drier than dust.",
    drops: [
      { resource: "wood", qty: [2, 3], chance: 0.9 },
      { resource: "feathers", qty: 1, chance: 0.15 },
    ],
    xp: 3, cycleMs: 7500,
    flavor: {
      opener: ["🪵 You work the dead grove."],
      success: ["🪵 An armload of dry wood."],
      fail: ["🪵 The trunk crumbles to powder."],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // FISHING — Era 1+. Slow but reliable food + scales/sinew.
  // ═══════════════════════════════════════════════════════════════════
  stagnantPond: {
    id: "stagnantPond", name: "Stagnant Pond", icon: "🏞️",
    discipline: "fishing", skill: "fishing",
    era: 1, tier: "common", encounterChance: 0.8, difficulty: 0.3,
    description: "Murky water. What lives in it isn't named yet.",
    drops: [
      { resource: "food", qty: 1, chance: 0.6 },
      { resource: "water_stagnant", qty: 1, chance: 0.7 },
    ],
    xp: 2, cycleMs: 9000,
    flavor: {
      opener: ["🏞️ You cast in the pond."],
      success: ["🏞️ Something pulled. Edible."],
      fail: ["🏞️ Line empty. Again."],
    },
  },
  marshEdge: {
    id: "marshEdge", name: "Marsh Edge", icon: "🦀",
    discipline: "fishing", skill: "fishing",
    era: 2, tier: "uncommon", encounterChance: 0.55, difficulty: 0.25,
    description: "Reeds and silt. Crayfish and sinew — if your line holds.",
    drops: [
      { resource: "food", qty: [1, 2], chance: 0.8 },
      { resource: "sinew", qty: 1, chance: 0.4 },
    ],
    xp: 4, cycleMs: 9500,
    flavor: {
      opener: ["🦀 You wade the marsh."],
      success: ["🦀 Meat from the silt."],
      fail: ["🦀 The reeds keep their secret."],
    },
  },
  blackRiver: {
    id: "blackRiver", name: "Black River", icon: "🐟",
    discipline: "fishing", skill: "fishing",
    era: 3, tier: "rare", encounterChance: 0.3, difficulty: 0.4,
    description: "Water that runs the wrong colour. Fish that look at you back.",
    drops: [
      { resource: "food", qty: [2, 3], chance: 0.8 },
      { resource: "scales", qty: [1, 2], chance: 0.7 },
      { resource: "spirit_essence", qty: 1, chance: 0.15 },
    ],
    xp: 6, cycleMs: 11000,
    flavor: {
      opener: ["🐟 You cast into the black."],
      success: ["🐟 The line goes heavy."],
      fail: ["🐟 The river takes the hook."],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // FARMING — Era 2+. Slower cycles, steady food yields.
  // ═══════════════════════════════════════════════════════════════════
  hutGarden: {
    id: "hutGarden", name: "Hut Garden", icon: "🥬",
    discipline: "farming", skill: "farming",
    era: 2, tier: "common", encounterChance: 1.0, difficulty: 0.1,
    description: "A small bed of greens by the hut. Tends itself, mostly.",
    drops: [
      { resource: "food", qty: [1, 2], chance: 0.95 },
      { resource: "herbs", qty: 1, chance: 0.3 },
    ],
    xp: 2, cycleMs: 12000,
    flavor: {
      opener: ["🥬 You tend the garden."],
      success: ["🥬 A handful of greens."],
      fail: ["🥬 Pests took the row."],
    },
  },
  wheatPlot: {
    id: "wheatPlot", name: "Wheat Plot", icon: "🌾",
    discipline: "farming", skill: "farming",
    era: 2, tier: "uncommon", encounterChance: 0.7, difficulty: 0.15,
    description: "A tilled row, half-yellow. Real grain if you wait.",
    drops: [
      { resource: "food", qty: [2, 3], chance: 0.9 },
    ],
    xp: 3, cycleMs: 14000,
    flavor: {
      opener: ["🌾 You walk the rows."],
      success: ["🌾 A sheaf of wheat."],
      fail: ["🌾 The frost got it."],
    },
  },
  mushroomBed: {
    id: "mushroomBed", name: "Mushroom Bed", icon: "🍄",
    discipline: "farming", skill: "farming",
    era: 2, tier: "uncommon", encounterChance: 0.5, difficulty: 0.2,
    description: "Damp log under the eaves. Caps every few days.",
    drops: [
      { resource: "food", qty: [1, 2], chance: 0.85 },
      { resource: "herbs", qty: 1, chance: 0.5 },
    ],
    xp: 3, cycleMs: 13000,
    flavor: {
      opener: ["🍄 You check the log."],
      success: ["🍄 Caps in your palm."],
      fail: ["🍄 Nothing today."],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // HUSBANDRY — Era 2+. Slow yields: wool, eggs, milk.
  // ═══════════════════════════════════════════════════════════════════
  goatPen: {
    id: "goatPen", name: "Goat Pen", icon: "🐐",
    discipline: "animalHusbandry", skill: "animalHusbandry",
    era: 2, tier: "common", encounterChance: 1.0, difficulty: 0.1,
    description: "Two goats and a fence. Milk and dung; the wasteland accepts both.",
    drops: [
      { resource: "food", qty: 1, chance: 0.7 },
      { resource: "hide", qty: 1, chance: 0.2 },
    ],
    xp: 2, cycleMs: 12000,
    flavor: {
      opener: ["🐐 You tend the goats."],
      success: ["🐐 A pail of milk."],
      fail: ["🐐 The goat kicks."],
    },
  },
  chickenRun: {
    id: "chickenRun", name: "Chicken Run", icon: "🐓",
    discipline: "animalHusbandry", skill: "animalHusbandry",
    era: 2, tier: "common", encounterChance: 0.95, difficulty: 0.1,
    description: "Half-feathered birds in a wire run. Eggs and feathers; the rest stays alive.",
    drops: [
      { resource: "food", qty: 1, chance: 0.6 },
      { resource: "feathers", qty: [1, 2], chance: 0.7 },
    ],
    xp: 2, cycleMs: 11000,
    flavor: {
      opener: ["🐓 You check the nests."],
      success: ["🐓 An egg, still warm."],
      fail: ["🐓 The nest is empty."],
    },
  },
  beekeep: {
    id: "beekeep", name: "Beekeep", icon: "🐝",
    discipline: "animalHusbandry", skill: "animalHusbandry",
    era: 3, tier: "uncommon", encounterChance: 0.5, difficulty: 0.25,
    description: "A row of skeps. The bees keep their own counsel.",
    drops: [
      { resource: "food", qty: 1, chance: 0.8 },
      { resource: "herbs", qty: 1, chance: 0.3 },
    ],
    xp: 4, cycleMs: 14000,
    flavor: {
      opener: ["🐝 You approach the hive."],
      success: ["🐝 A comb in hand."],
      fail: ["🐝 Stung. Empty-handed."],
    },
  },
};

export const getGatherNode = (id) => GATHER_NODES[id] || null;
export const getAllGatherNodes = () => Object.values(GATHER_NODES);
export const getGatherNodesByDiscipline = (discipline) =>
  getAllGatherNodes().filter((n) => n.discipline === discipline);
export const getGatherNodesForEra = (discipline, era) =>
  getGatherNodesByDiscipline(discipline).filter((n) => (n.era || 1) <= era);

export const GATHER_DISCIPLINES = [
  { id: "foraging", name: "Forage", icon: "🌿", skill: "foraging" },
  { id: "mining", name: "Mining", icon: "⛏️", skill: "mining" },
  { id: "woodcutting", name: "Wood", icon: "🪓", skill: "woodcutting" },
  { id: "fishing", name: "Fishing", icon: "🎣", skill: "fishing" },
  { id: "farming", name: "Farming", icon: "🌾", skill: "farming" },
  { id: "animalHusbandry", name: "Husbandry", icon: "🐓", skill: "animalHusbandry" },
  { id: "hunting", name: "Hunting", icon: "🏹", skill: "hunting" },
];
