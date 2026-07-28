// Skill definitions — DATA, not code.
// Skills are the "learning by doing" axis. Every meaningful action grants XP
// to the matching skill. Skills level up; levels grant declarative bonuses
// that the systems read at runtime.
//
// Lifecycle: skills are RUN-LOCAL. They wipe on prestige. Each new awakening
// is a new body learning the world fresh. Future Echo upgrades may grant
// "start with +N levels in skill X" perks — that's the persistent layer's
// job, not this one.
//
// Each skill has:
//   id, name, icon, description     — basic identity
//   active                          — true: earns XP today; false: stub for a future era
//   category                        — grouping for UI ("survival" | "craft" | "industry" | "arcane")
//   xpCurve                         — declarative XP curve. Currently:
//                                     { type: "exponential", base, multiplier, cap }
//                                     XP needed to reach level N is
//                                     base * multiplier^(N-1), capped at maxLevel
//   maxLevel                        — soft cap for current era; raised as content arrives
//   bonuses                         — array of { stat, perLevel, max? } entries
//                                     interpreted by skills.getBonus(state, stat)
//   firstUnlockMessage              — log line on reaching level 1 (the "I'm getting it" beat)
//
// Bonuses are pure data: { stat: "huntCooldownReduction", perLevel: 300, max: 4500 }
// means each level reduces hunt cooldown by 300ms, capped at 4500ms total.
// New bonuses = new entries; the system reads whatever stats it cares about.

export const SKILL_CATEGORIES = {
  survival: { id: "survival", name: "Survival", order: 1 },
  craft:    { id: "craft",    name: "Craft",    order: 2 },
  combat:   { id: "combat",   name: "Combat",   order: 3 },
  industry: { id: "industry", name: "Industry", order: 4 },
  arcane:   { id: "arcane",   name: "Arcane",   order: 5 },
};

// Standard XP curve used by all Era 1 skills. Tunable knob lives here.
// Level 1: 5 XP. Level 2: 9. Level 3: 16. Level 5: 51. Level 10: 580.
// Gentle early growth so the player feels progress within the first hour;
// stiffens later so mastery still means something.
const STANDARD_CURVE = { type: "exponential", base: 5, multiplier: 1.8 };

export const SKILLS = {
  // ==================== Active (Era 1) ====================
  foraging: {
    id: "foraging",
    name: "Foraging",
    icon: "🌿",
    description: "Knowing where the wasteland still hides what it has.",
    active: true,
    category: "survival",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [
      // Each level adds a small flat bonus to gather yield (capped low so it
      // doesn't dwarf research/building bonuses — skills are an additional
      // smooth axis on top of the discrete ones).
      { stat: "gatherBonus", perLevel: 0.05, max: 1.0 },
      // Tiny gather speed-up — barely felt early, meaningful at high levels.
      { stat: "gatherSpeedup", perLevel: 10, max: 200 },
    ],
    firstUnlockMessage:
      "Your hands begin to know the dust. You see what others would miss.",
  },

  hunting: {
    id: "hunting",
    name: "Hunting",
    icon: "🏹",
    description:
      "Stalking. Striking. Retrieving. Birds today; bigger things tomorrow.",
    active: true,
    category: "survival",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [
      // Reduces hunt cooldown by 300ms per level. Floor enforced in hunting.js.
      // Level 0 = 8000ms; Level 5 = 6500ms; Level 10 = 5000ms; capped at 4500ms total reduction.
      { stat: "huntCooldownReduction", perLevel: 300, max: 4500 },
      // Adds a flat bonus to hunt drop quantities at higher levels.
      { stat: "huntYieldBonus", perLevel: 0.08, max: 1.5 },
      // Skews the hunt drop weights toward birds and away from grubs/nothing.
      // Read by the hunting system when rolling drop weights.
      { stat: "huntBirdWeightBonus", perLevel: 1.0, max: 15 },
      { stat: "huntNothingWeightReduction", perLevel: 1.0, max: 18 },
    ],
    firstUnlockMessage:
      "You learn the patience of stillness. The birds notice you less.",
  },

  crafting: {
    id: "crafting",
    name: "Crafting",
    icon: "🪡",
    description:
      "Lashing, weaving, fitting. The work of small parts into useful wholes.",
    active: true,
    category: "craft",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [
      // Per-level chance to refund a single resource of one kind when crafting.
      // The crafting system reads this on each successful craft.
      { stat: "craftRefundChance", perLevel: 0.02, max: 0.30 },
    ],
    firstUnlockMessage:
      "Your fingers find the rhythm. Cordage holds. Edges fit.",
  },

  building: {
    id: "building",
    name: "Building",
    icon: "🏗️",
    description: "Heavy work. Stones lifted. Beams set. Things that last.",
    active: true,
    category: "craft",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [
      // Reduces survival cost of building actions (energy/thirst/hunger drain).
      // Read by survival.js as a multiplier (1.0 - this) on the perBuild decay.
      { stat: "buildEffortReduction", perLevel: 0.03, max: 0.5 },
    ],
    firstUnlockMessage:
      "Your back stops complaining. The frame goes up cleaner the second time.",
  },

  // ==================== Combat (Task #34) ====================
  // Subfamily-routed XP from kills (see SUBFAMILY_TO_SKILL in systems/combat.js).
  // Combat reads skill level DIRECTLY for damage/accuracy/crit bonuses
  // (per-skill scope), so bonuses[] stays empty — the level itself is
  // the contract. magicCombat stays dormant until spell-vs-threat ships
  // with #37 enchants.

  swordplay: {
    id: "swordplay",
    name: "Swordplay",
    icon: "⚔️",
    description: "The hand learning the weight, the haft, the moment to commit.",
    active: true,
    category: "combat",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [],
    firstUnlockMessage:
      "The weapon stops fighting you. The swing finishes where you meant it.",
  },

  archery: {
    id: "archery",
    name: "Archery",
    icon: "🏹",
    description: "The breath at full draw. Reading the wind that will carry the shaft.",
    active: true,
    category: "combat",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [],
    firstUnlockMessage:
      "You stop hoping the arrow flies true. You make it.",
  },

  magicCombat: {
    id: "magicCombat",
    name: "Magic Combat",
    icon: "🪄",
    description: "Words that bend. The mind as a weapon, with a weapon's care.",
    active: true,
    category: "combat",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [],
    firstUnlockMessage:
      "The spell stops asking for permission. It finds the target the way water finds the low ground.",
  },

  // ==================== Butchering (#70) ====================
  // The skill of getting more out of every kill. Earns XP on each mob
  // victory in patrol; level scales drop chance + quantity at fight-end.
  //   Drop chance bonus: +1% per level (cap +0.20 at lvl 20)
  //   Drop quantity bonus: +5% per level (cap +1.0 / doubled at lvl 20)
  // Read by systems/patrol.js rollDrops at commit time.
  butchering: {
    id: "butchering",
    name: "Butchering",
    icon: "🔪",
    description: "The cleaner the cut, the more comes off the bone.",
    active: true,
    category: "survival",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [
      { stat: "dropChanceBonus", perLevel: 0.01, max: 0.20 },
      { stat: "dropQtyBonus",    perLevel: 0.05, max: 1.0 },
    ],
    firstUnlockMessage:
      "Your hands learn where the meat hides. The kill gives more.",
  },

  // #180 — Thievery. The "stalk and take" loop. XP from successful mugs;
  // levels increase mug success chance + loot drop chance. Read by
  // systems/thievery.js getThieveryBonuses.
  thievery: {
    id: "thievery",
    name: "Thievery",
    icon: "🗡️",
    description: "The quiet hand. Knowing where to stand, when not to breathe, and which pocket holds the day's catch.",
    active: true,
    category: "combat",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [
      { stat: "mugSuccessBonus", perLevel: 0.01, max: 0.25 },
      { stat: "mugLootChanceBonus", perLevel: 0.01, max: 0.20 },
    ],
    firstUnlockMessage:
      "🗡️ A lesson the road taught. You learn what doesn't need to be earned.",
  },

  // ==================== Stubs (future eras) ====================
  // These exist in the data file so the schema is stable and Era 2+ wiring
  // is a one-line "set active: true and add an XP trigger" change.
  pottery: {
    id: "pottery",
    name: "Pottery",
    icon: "🏺",
    description: "Clay, water, and patient hands. Vessels for what you keep.",
    active: false,
    category: "craft",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [],
    firstUnlockMessage: "",
  },

  mining: {
    id: "mining",
    name: "Mining",
    icon: "⛏️",
    description: "Following stone deeper. The earth keeps better things below.",
    active: false,
    category: "industry",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [],
    firstUnlockMessage: "",
  },

  // Smithing (#36 / #131) — sister skill to blacksmithing. Earns XP
  // whenever the player smelts iron OR crafts an iron-tier item.
  // Higher smithing levels reduce iron-tier weapon material cost
  // beyond the blacksmithing discount.
  smithing: {
    id: "smithing",
    name: "Smithing",
    icon: "🔨",
    description: "Heat. Hammer. Quench. The shape that won't break.",
    active: true,
    category: "industry",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [
      { stat: "ironCostReduction", perLevel: 0.01, max: 0.20 },
    ],
    firstUnlockMessage: "🔨 The first ingot rings true against the anvil.",
  },

  tracking: {
    id: "tracking",
    name: "Tracking",
    icon: "🐾",
    description:
      "Reading sign. Broken twig, pressed dust, the world's quiet memory.",
    active: false,
    category: "survival",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [],
    firstUnlockMessage: "",
  },

  // Gather disciplines (#97).
  woodcutting: {
    id: "woodcutting", name: "Woodcutting", icon: "🪓",
    description: "Reading the grain. Taking only what dries clean.",
    active: true, category: "survival",
    xpCurve: STANDARD_CURVE, maxLevel: 20, bonuses: [],
    firstUnlockMessage: "🪓 You learned to choose the right tree.",
  },
  fishing: {
    id: "fishing", name: "Fishing", icon: "🎣",
    description: "Patience with line and lure. The water gives only when watched.",
    active: true, category: "survival",
    xpCurve: STANDARD_CURVE, maxLevel: 20, bonuses: [],
    firstUnlockMessage: "🎣 You learned to wait for the bite.",
  },
  farming: {
    id: "farming", name: "Farming", icon: "🌾",
    description: "Coaxing the ash to give. Seasons inside seasons.",
    active: true, category: "industry",
    xpCurve: STANDARD_CURVE, maxLevel: 20, bonuses: [],
    firstUnlockMessage: "🌾 You learned to plant a row that holds.",
  },
  animalHusbandry: {
    id: "animalHusbandry", name: "Husbandry", icon: "🐓",
    description: "Keeping warm things alive. Wool, eggs, milk — the slow yields.",
    active: true, category: "industry",
    xpCurve: STANDARD_CURVE, maxLevel: 20, bonuses: [],
    firstUnlockMessage: "🐓 You learned to keep what keeps you.",
  },
};

// ─── Per-discipline crafting skills (#112) — each Crafting tab routes
// XP into its matching skill. `smithing` activates as the Blacksmithing
// ─── Per-discipline crafting skills (#112) — each Crafting tab routes
// XP into its matching skill.
SKILLS.blacksmithing = {
  id: "blacksmithing", name: "Blacksmithing", icon: "🔨",
  description: "Heat, hammer, quench. The shape the world will respect.",
  active: true, category: "craft",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [{ stat: "blacksmithingSuccess", perLevel: 0.04, max: 0.80 }],
  firstUnlockMessage: "🔨 Your first piece holds true.",
};
SKILLS.alchemy = {
  id: "alchemy", name: "Alchemy", icon: "🧪",
  description: "Steep, distil, reduce. What the green parts of the world know.",
  active: true, category: "craft",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [{ stat: "alchemySuccess", perLevel: 0.04, max: 0.80 }],
  firstUnlockMessage: "🧪 The mixture takes. Steam, not smoke.",
};
SKILLS.fletching = {
  id: "fletching", name: "Fletching", icon: "🪶",
  description: "Shaft true, fletching even, nock cut.",
  active: true, category: "craft",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [{ stat: "fletchingSuccess", perLevel: 0.04, max: 0.80 }],
  firstUnlockMessage: "🪶 The shaft draws straight. The feathers bind.",
};
SKILLS.woodworking = {
  id: "woodworking", name: "Woodworking", icon: "🪵",
  description: "Grain, glue, joint. Wood asked nicely will hold for a long time.",
  active: true, category: "craft",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [{ stat: "woodworkingSuccess", perLevel: 0.04, max: 0.80 }],
  firstUnlockMessage: "🪵 The joint sits flush. No glue needed.",
};
SKILLS.tailoring = {
  id: "tailoring", name: "Tailoring", icon: "🧵",
  description: "Cordage, hide, fabric.",
  active: true, category: "craft",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [{ stat: "tailoringSuccess", perLevel: 0.04, max: 0.80 }],
  firstUnlockMessage: "🧵 The stitch is clean. Nothing pulls loose.",
};

// Survival craft (#125) — wilderness gear: nets, snares, water skins,
// digging sticks, talismans. The hands-and-cordage trade.
SKILLS.survivalcraft = {
  id: "survivalcraft", name: "Survival Craft", icon: "🪤",
  description: "Cordage, traps, water-carrying. The craft of staying alive in the wasteland.",
  active: true, category: "craft",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [{ stat: "survivalcraftSuccess", perLevel: 0.04, max: 0.80 }],
  firstUnlockMessage: "🪤 The lashing holds. The snare snaps clean.",
};

// Runesmithing (#115) — Era 3 arcane craft skill.
SKILLS.runesmithing = {
  id: "runesmithing", name: "Runesmithing", icon: "🪬",
  description: "The careful hand that binds intent into shard.",
  active: true, category: "arcane",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [{ stat: "runesmithingSuccess", perLevel: 0.04, max: 0.80 }],
  firstUnlockMessage: "🪬 The first rune sits right.",
};

SKILLS.tinker = {
  id: "tinker", name: "Tinker", icon: "🪛",
  description: "Gadgeteer's hands. Bombs, snares, charges.",
  active: true, category: "combat",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [{ stat: "tinkerSuccess", perLevel: 0.03, max: 0.60 }],
  firstUnlockMessage: "🪛 The first deployable holds.",
};
SKILLS.sigilcraft = {
  id: "sigilcraft", name: "Sigilcraft", icon: "🔯",
  description: "The careful inking of magitek schematics.",
  active: true, category: "arcane",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [{ stat: "sigilcraftSuccess", perLevel: 0.04, max: 0.80 }],
  firstUnlockMessage: "🔯 The first sigil completes.",
};
SKILLS.summoning = {
  id: "summoning", name: "Summoning", icon: "🪐",
  description: "Naming things that are not yours and convincing them to stay.",
  active: true, category: "combat",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [
    { stat: "summoningSuccess", perLevel: 0.04, max: 0.80 },
    { stat: "summoningDurationBonus", perLevel: 0.02, max: 0.40 },
  ],
  firstUnlockMessage: "🪐 The first binding holds.",
};
if (!SKILLS.butchering) {
  SKILLS.butchering = {
    id: "butchering", name: "Butchering", icon: "🔪",
    description: "Taking what the bone is willing to give.",
    active: true, category: "craft",
    xpCurve: STANDARD_CURVE, maxLevel: 20,
    bonuses: [{ stat: "butcheringSuccess", perLevel: 0.04, max: 0.80 }],
    firstUnlockMessage: "🔪 The first clean cut.",
  };
}
if (!SKILLS.magicCombat) {
  SKILLS.magicCombat = {
    id: "magicCombat", name: "Magic Combat", icon: "🔮",
    description: "Channelling spirit through wand, staff, or sigil.",
    active: true, category: "combat",
    xpCurve: STANDARD_CURVE, maxLevel: 20,
    bonuses: [{ stat: "magicCombatBonus", perLevel: 0.02, max: 0.40 }],
    firstUnlockMessage: "🔮 The first cast strikes true.",
  };
}

// Reckoning Lore (#231) — passive read of the clock + Heralds. XP via Era 5 actions.
SKILLS.reckoningLore = {
  id: "reckoningLore", name: "Reckoning Lore", icon: "🌌",
  description: "Reading the shape of the apex before it lands.",
  active: true, category: "arcane",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [{ stat: "reckoningInsightBonus", perLevel: 0.02, max: 0.40 }],
  firstUnlockMessage: "🌌 The clock has a sound. You hear it for the first time.",
};

// Cosmic Bargaining (#231) — interact-with-Herald skill.
SKILLS.cosmicBargaining = {
  id: "cosmicBargaining", name: "Cosmic Bargaining", icon: "🤝",
  description: "Talking with things that are not the world.",
  active: true, category: "arcane",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [{ stat: "cosmicBargainBonus", perLevel: 0.03, max: 0.60 }],
  firstUnlockMessage: "🤝 The first bargain holds. The cosmos took the offer.",
};

if (SKILLS.mining) SKILLS.mining.active = true;

export const getSkill = (id) => SKILLS[id] || null;
export const getAllSkills = () => Object.values(SKILLS);
export const getActiveSkills = () => Object.values(SKILLS).filter((s) => s.active);
