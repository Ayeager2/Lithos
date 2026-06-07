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

  smithing: {
    id: "smithing",
    name: "Smithing",
    icon: "🔨",
    description: "Heat. Hammer. Quench. The shape that won't break.",
    active: false,
    category: "industry",
    xpCurve: STANDARD_CURVE,
    maxLevel: 20,
    bonuses: [],
    firstUnlockMessage: "",
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
// skill (was already in this file dormant for #36).
SKILLS.blacksmithing = {
  id: "blacksmithing", name: "Blacksmithing", icon: "🔨",
  description: "Heat, hammer, quench. The shape the world will respect.",
  active: true, category: "craft",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [
    // Higher blacksmithing = better chance to succeed on a blacksmithing craft.
    { stat: "blacksmithingSuccess", perLevel: 0.04, max: 0.80 },
  ],
  firstUnlockMessage: "🔨 Your first piece holds true.",
};
SKILLS.alchemy = {
  id: "alchemy", name: "Alchemy", icon: "🧪",
  description: "Steep, distil, reduce. What the green parts of the world know.",
  active: true, category: "craft",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [
    { stat: "alchemySuccess", perLevel: 0.04, max: 0.80 },
  ],
  firstUnlockMessage: "🧪 The mixture takes. Steam, not smoke.",
};
SKILLS.fletching = {
  id: "fletching", name: "Fletching", icon: "🪶",
  description: "Shaft true, fletching even, nock cut. The arrow flies how it was made.",
  active: true, category: "craft",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [
    { stat: "fletchingSuccess", perLevel: 0.04, max: 0.80 },
  ],
  firstUnlockMessage: "🪶 The shaft draws straight. The feathers bind.",
};
SKILLS.woodworking = {
  id: "woodworking", name: "Woodworking", icon: "🪵",
  description: "Grain, glue, joint. Wood asked nicely will hold for a long time.",
  active: true, category: "craft",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [
    { stat: "woodworkingSuccess", perLevel: 0.04, max: 0.80 },
  ],
  firstUnlockMessage: "🪵 The joint sits flush. No glue needed.",
};
SKILLS.tailoring = {
  id: "tailoring", name: "Tailoring", icon: "🧵",
  description: "Cordage, hide, fabric. The hand that ties the world to the body.",
  active: true, category: "craft",
  xpCurve: STANDARD_CURVE, maxLevel: 20,
  bonuses: [
    { stat: "tailoringSuccess", perLevel: 0.04, max: 0.80 },
  ],
  firstUnlockMessage: "🧵 The stitch is clean. Nothing pulls loose.",
};

/* Mark legacy mining + tracking active so they show in the Gather rail.
   smithing is now the blacksmithing skill above; the legacy "smithing"
   entry stays dormant for back-compat saves. */
if (SKILLS.mining) SKILLS.mining.active = true;

export const getSkill = (id) => SKILLS[id] || null;
export const getAllSkills = () => Object.values(SKILLS);
export const getActiveSkills = () => Object.values(SKILLS).filter((s) => s.active);
