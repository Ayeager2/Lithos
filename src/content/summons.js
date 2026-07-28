// Summons (#212) — DATA, not code.
//
// Temporary high-cost realm-pulled allies. Split by alignment arc:
//   evil-arc enforcers (suppress rebellion ticks, often drain morale further)
//   good-arc supporters (raise morale, boost production, fix the cause)
//
// Active summon lives in run.activeSummon = { id, bindAt, expiresAt, ... }.
// Distinct from companion slot — stacks with the active companion.
//
// Schema:
//   id, name, icon, description, arc: "evil"|"good", tier: "minor"|"major"|"apex"
//   durationMs: how long the binding lasts
//   bonuses: {
//     defense?, gatherDropMult?, gatherChanceBonus?, runeChanceBonus?,
//     weaponDropChance?, evasion?, accBonus?, damageBonus?,
//     melee?, allCombat?,
//     spiritPerMin?, sanityPerMin?, sanityCost? (per minute), moralePerMin?,
//     productionMult?, productionBuildingMult? (chosen building x1.5),
//     worldScorePerMin?, worldScoreOnBind?,
//     evilAlignmentPerCall?, breaksRebellionOnBind?,
//     suppressesRebellion? (skips tickRebellion damage rounds while active),
//   }
//   bindCost: { fragments?, spirit?, [resourceId]? }
//   bindRequires: { summoningLevel, otherSkills?: { id: minLevel }, pathMastered? }

export const SUMMONS = {
  // ─── Evil arc — enforcers ──────────────────────────────────────────
  skitterForm: {
    id: "skitterForm", name: "Skitter-Form", icon: "🦂",
    arc: "evil", tier: "minor",
    description: "A small many-legged shape that walks on the edges of the room. Useful to have around. Discomfiting to look at.",
    durationMs: 30 * 60 * 1000,
    bonuses: {
      evasion: 0.20,
      runeChanceBonus: 0.15,
      sanityPerMin: -0.2,
    },
    bindCost: { fragments: 8, spirit: 12 },
    bindRequires: { summoningLevel: 3, otherSkills: { alchemy: 3 } },
    onBindMessage: "🦂 The Skitter-Form arrives. The shadow at the edge of vision has corners now.",
    onExpireMessage: "🦂 The Skitter-Form sinks back. The shadows fold flat.",
  },

  shadeWalker: {
    id: "shadeWalker", name: "Shade-Walker", icon: "🌑",
    arc: "evil", tier: "major",
    description: "A tall stooped shape. It does not breathe. While it walks the village, the villagers do not rebel.",
    durationMs: 60 * 60 * 1000,
    bonuses: {
      defense: 8,
      gatherDropMult: 1.15,
      suppressesRebellion: true,
    },
    bindCost: { voidRune: 1, fragments: 15, spirit: 20 },
    bindRequires: { summoningLevel: 5, otherSkills: { sigilcraft: 4 } },
    onBindMessage: "🌑 The Shade-Walker is bound. The settlement falls quiet in a way that isn't peace.",
    onExpireMessage: "🌑 The Shade-Walker dissolves. The villagers start arguing again before the smoke clears.",
  },

  cinderHound: {
    id: "cinderHound", name: "Cinder Hound", icon: "🔥",
    arc: "evil", tier: "major",
    description: "Hound-shape, the wrong way around the legs, ember-eyed. It runs ahead. The things it catches do not need killing twice.",
    durationMs: 45 * 60 * 1000,
    bonuses: {
      damageBonus: 10,
      weaponDropChance: 0.25,
      sanityPerMin: -0.5,
      suppressesRebellion: true,
    },
    bindCost: { emberRune: 2, fragments: 20, spirit: 25 },
    bindRequires: {
      summoningLevel: 6,
      otherSkills: { butchering: 5, alchemy: 4 },
    },
    onBindMessage: "🔥 The Cinder Hound takes shape. The hearth-fires lean toward it.",
    onExpireMessage: "🔥 The Cinder Hound collapses to coals. The coals are warm for a long time after.",
  },

  wraithOfTheHollow: {
    id: "wraithOfTheHollow", name: "Wraith of the Hollow", icon: "👁️",
    arc: "evil", tier: "apex",
    description: "A figure you can almost see. Nothing in the village dares not work while it watches. Nothing in the village smiles either.",
    durationMs: 2 * 60 * 60 * 1000,
    bonuses: {
      allCombat: 15,
      runeChanceBonus: 0.30,
      spiritPerMin: 1,
      suppressesRebellion: true,
      moralePerMin: -1,
      evilAlignmentPerCall: 1,
    },
    bindCost: { conduit_core: 3, fragments: 30, spirit: 50 },
    bindRequires: {
      summoningLevel: 8,
      pathMastered: "voidcall",
      otherSkillsAtLeast: { minLevel: 8, count: 4 },
    },
    onBindMessage: "👁️ The Wraith of the Hollow steps into the circle. The candles bow. The villagers do not look up.",
    onExpireMessage: "👁️ The Wraith of the Hollow withdraws. The light remembers it for hours.",
  },

  // ─── Good arc — supporters ────────────────────────────────────────
  whisperBound: {
    id: "whisperBound", name: "Whisper-Bound", icon: "🌫️",
    arc: "good", tier: "minor",
    description: "A small pale thing that hums in chord with the apprentices. The villagers find themselves humming back.",
    durationMs: 30 * 60 * 1000,
    bonuses: {
      sanityPerMin: 0.5,
      moralePerMin: 0.5,
      defense: 5,
    },
    bindCost: { fragments: 5, spirit: 10 },
    bindRequires: { summoningLevel: 1 },
    onBindMessage: "🌫️ The Whisper-Bound settles. The room is fractionally warmer.",
    onExpireMessage: "🌫️ The Whisper-Bound fades. The room is fractionally cooler.",
  },

  gardenSpirit: {
    id: "gardenSpirit", name: "Garden-Spirit", icon: "🌱",
    arc: "good", tier: "major",
    description: "Green-veined, slow-moving, smelling of soil after rain. The crops know it is there.",
    durationMs: 60 * 60 * 1000,
    bonuses: {
      productionMult: 1.20,
      moralePerMin: 1,
      sanityPerMin: 0.3,
    },
    bindCost: { lightRune: 2, fragments: 15, spirit: 20 },
    bindRequires: { summoningLevel: 5, otherSkills: { alchemy: 5 } },
    onBindMessage: "🌱 The Garden-Spirit walks the rows once. The soil sighs.",
    onExpireMessage: "🌱 The Garden-Spirit returns to the ground. The crops nod.",
  },

  forgehand: {
    id: "forgehand", name: "Forgehand", icon: "⚒️",
    arc: "good", tier: "major",
    description: "A bound elemental of metal and intent. It picks one workshop and triples its output for the hour.",
    durationMs: 60 * 60 * 1000,
    bonuses: {
      productionBuildingMult: 1.5,
      moralePerMin: 0.5,
      worldScoreOnBind: 5,
    },
    bindCost: { elementalRune: 3, fragments: 20, spirit: 25 },
    bindRequires: { summoningLevel: 6, otherSkills: { blacksmithing: 6 } },
    onBindMessage: "⚒️ The Forgehand rises. The chosen workshop becomes a chorus of hammers, with only one hammer.",
    onExpireMessage: "⚒️ The Forgehand cools and walks away. The workshop is quiet again.",
  },

  aspectOfTheFirstLight: {
    id: "aspectOfTheFirstLight", name: "Aspect of the First Light", icon: "☀️",
    arc: "good", tier: "apex",
    description: "Something with shape, where the shape is light. The villagers cannot look directly at it. Nor would they want to look anywhere else.",
    durationMs: 2 * 60 * 60 * 1000,
    bonuses: {
      allCombat: 15,
      sanityPerMin: 0.5,
      moralePerMin: 3,
      worldScorePerMin: 1,
      breaksRebellionOnBind: true,
    },
    bindCost: { lightRune: 5, fragments: 30, spirit: 50 },
    bindRequires: {
      summoningLevel: 8,
      pathMastered: "light",
      worldScoreAtLeast: 70,
    },
    onBindMessage: "☀️ The Aspect of the First Light arrives. The settlement holds its breath and forgets to let it out.",
    onExpireMessage: "☀️ The Aspect of the First Light withdraws. The afterimage is still there an hour later.",
  },
};

export const getSummon = (id) => SUMMONS[id] || null;
export const getAllSummons = () => Object.values(SUMMONS);
export const getSummonsByArc = (arc) => Object.values(SUMMONS).filter((s) => s.arc === arc);
