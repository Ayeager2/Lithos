// Mob definitions — DATA, not code.
//
// The Patrol action (#66) rolls one of these per click, weighted by
// `encounterChance` and filtered by era + biome (future). Resolves through
// the existing passive multi-round fight loop in systems/combat.js
// (same shape as the `threats.js` combat-class definitions).
//
// Each mob carries:
//   id, name, icon                   — identity
//   era                              — earliest era this can appear
//   tier                             — "common" | "uncommon" | "rare" | "apex"
//   kind                             — narrative grouping (beast / human /
//                                      demon / void / corrupted / etc.)
//   encounterChance                  — relative weight in the patrol pool
//                                      (compared against same-era peers)
//   combat                           — { hp, acc, eva, damage{min,max},
//                                        damageType: "hp"|"sanity"|"spirit",
//                                        defenseHalf? }
//   drops                            — [{ resource, qty:[min,max]|N, chance }]
//   xp                               — combat-skill XP on victory (overrides
//                                      the default from getCombatXpForVictory)
//   appliesStatus                    — optional { id, durationMs, chance }
//                                      (plague rats apply dysentery, etc.)
//   description                      — UI tooltip + first-encounter log
//   combatFlavor                     — opener / attack / miss / victory /
//                                      defeat narration pools, same shape
//                                      as threats / bosses
//
// Drops shape: chance is 0..1. qty can be a number (always that much) or
// a tuple [min,max] (rolls inclusive). systems/patrol.js handles the roll.
//
// Currency: mobs drop one of three coin tiers based on era / kind:
//   tarnished_coin  — Era 1 ancients, rare
//   coin            — Era 2 settler economy, common from humans
//   obol            — Era 3 black-iron coin, rare

export const MOB_CATEGORIES = {
  common:   { id: "common",   name: "Common",   weight: 60 },
  uncommon: { id: "uncommon", name: "Uncommon", weight: 28 },
  rare:     { id: "rare",     name: "Rare",     weight: 10 },
  apex:     { id: "apex",     name: "Apex",     weight: 2 },
};

export const MOBS = {
  // ═══════════════════════════════════════════════════════════════════
  // ERA 1 — Wasteland & The Hunger At The Edge
  // Mundane survival with the first hints something underneath is wrong.
  // ═══════════════════════════════════════════════════════════════════

  wildDog: {
    id: "wildDog", name: "Wild Dog", icon: "🐕",
    era: 1, tier: "common", kind: "beast", encounterChance: 1.0,
    description: "Lean, ribs showing. Hungrier than it is cautious.",
    combat: { hp: 12, acc: 0.70, eva: 0.10, damage: { min: 2, max: 4 }, damageType: "hp" },
    drops: [
      { resource: "dog_meat", qty: [1, 2], chance: 1.0 },
      { resource: "dog_fur",  qty: 1, chance: 0.6 },
      { resource: "fangs",    qty: 1, chance: 0.35 },
    ],
    xp: 3,
    combatFlavor: {
      opener: ["🐕 A wild dog circles, growling low.", "🐕 The dog crouches and shows its teeth."],
      attack: ["🐕 The dog lunges and bites. {dmg} ❤️.", "🐕 Teeth find your forearm. {dmg} ❤️."],
      miss: ["🐕 You step inside the lunge.", "🐕 The dog snaps at your shadow."],
      victory: ["🐕 The dog stills. The pack will smell the blood."],
      defeat: ["🐕 The dog drags you down by the throat."],
    },
  },

  dustCrow: {
    id: "dustCrow", name: "Dust Crow", icon: "🪶",
    era: 1, tier: "common", kind: "beast", encounterChance: 0.9,
    description: "Black-eyed, smarter than it should be. Watches longer than it eats.",
    combat: { hp: 7, acc: 0.78, eva: 0.25, damage: { min: 1, max: 3 }, damageType: "hp" },
    drops: [
      { resource: "bird_meat",    qty: [1, 2], chance: 0.9 },
      { resource: "feathers",     qty: [1, 3], chance: 0.95 },
      { resource: "hollow_bone",  qty: 1, chance: 0.5 },
    ],
    xp: 2,
    combatFlavor: {
      opener: ["🪶 A crow drops from a dead branch toward your face."],
      attack: ["🪶 Beak finds your cheek. {dmg} ❤️.", "🪶 Talons rake. {dmg} ❤️."],
      miss: ["🪶 The crow veers off, cawing."],
      victory: ["🪶 The crow falls and is silent. The others watch from the dead tree."],
      defeat: ["🪶 The flock descends. The dust takes the rest."],
    },
  },

  pitLizard: {
    id: "pitLizard", name: "Pit Lizard", icon: "🦎",
    era: 1, tier: "common", kind: "beast", encounterChance: 0.7,
    description: "Long-bodied, scaled, smells of vinegar. The bite swells.",
    combat: { hp: 10, acc: 0.65, eva: 0.18, damage: { min: 2, max: 3 }, damageType: "hp" },
    drops: [
      { resource: "lizard_meat",  qty: 1, chance: 1.0 },
      { resource: "scales",       qty: [1, 3], chance: 0.85 },
      { resource: "venom_gland",  qty: 1, chance: 0.25 },
    ],
    xp: 3,
    appliesStatus: { id: "venom", durationMs: 90_000, chance: 0.15 },
    combatFlavor: {
      opener: ["🦎 A pit lizard pours itself out of a hole, jaw already wide."],
      attack: ["🦎 The bite holds. The venom finds its way in. {dmg} ❤️."],
      miss: ["🦎 It snaps and tastes air."],
      victory: ["🦎 You pin the head with your boot until it stops thrashing."],
      defeat: ["🦎 The venom thickens your blood. The lizard waits."],
    },
  },

  sandBeetle: {
    id: "sandBeetle", name: "Sand Beetle", icon: "🪲",
    era: 1, tier: "common", kind: "beast", encounterChance: 0.85,
    description: "Plate-armored, the size of a fist. Pincers like rusted scissors.",
    combat: { hp: 14, acc: 0.55, eva: 0.05, damage: { min: 1, max: 3 }, damageType: "hp" },
    drops: [
      { resource: "chitin", qty: [1, 3], chance: 1.0 },
      { resource: "grubs",  qty: [1, 2], chance: 0.6 },
    ],
    xp: 2,
    combatFlavor: {
      opener: ["🪲 The beetle rears, pincers raised."],
      attack: ["🪲 Pincers catch your boot. {dmg} ❤️."],
      miss: ["🪲 The beetle skitters away from your strike."],
      victory: ["🪲 The shell cracks. The grubs inside writhe briefly."],
      defeat: ["🪲 The beetle has more friends than you thought."],
    },
  },

  carrionHyena: {
    id: "carrionHyena", name: "Carrion Hyena", icon: "🐺",
    era: 1, tier: "uncommon", kind: "beast", encounterChance: 0.45,
    description: "Laughing as it lopes. The laughter is the worst part.",
    combat: { hp: 22, acc: 0.74, eva: 0.10, damage: { min: 3, max: 5 }, damageType: "hp" },
    drops: [
      { resource: "tough_meat", qty: [1, 2], chance: 1.0 },
      { resource: "bone",       qty: [1, 3], chance: 0.85 },
      { resource: "sinew",      qty: 1, chance: 0.6 },
      { resource: "dog_fur",    qty: 1, chance: 0.4 },
    ],
    xp: 5,
    combatFlavor: {
      opener: ["🐺 The hyena laughs. The laughter is older than the wasteland.",
               "🐺 Yellow eyes. Wide-shouldered. Patient."],
      attack: ["🐺 The bite clamps down and locks. {dmg} ❤️.", "🐺 It worries the wound open. {dmg} ❤️."],
      miss: ["🐺 It dodges low, laughing."],
      victory: ["🐺 You stand over it. The laughter rolls away into the dust."],
      defeat: ["🐺 You hear yourself laughing as it drags you off."],
    },
  },

  stagnantSlime: {
    id: "stagnantSlime", name: "Stagnant Slime", icon: "🦠",
    era: 1, tier: "uncommon", kind: "beast", encounterChance: 0.4,
    description: "A puddle that watches you back. The water around it is somehow colder.",
    combat: { hp: 18, acc: 0.50, eva: 0.02, damage: { min: 2, max: 4 }, damageType: "hp" },
    drops: [
      { resource: "bile_sac",     qty: 1, chance: 0.85 },
      { resource: "salt_crystal", qty: 1, chance: 0.18 },
    ],
    xp: 3,
    appliesStatus: { id: "dysentery", durationMs: 5 * 60_000, chance: 0.20 },
    combatFlavor: {
      opener: ["🦠 The slime humps toward you, slower than expected, faster than you'd like."],
      attack: ["🦠 It splashes against your leg. The skin reddens. {dmg} ❤️."],
      miss: ["🦠 You sidestep. The wet thing flops past."],
      victory: ["🦠 You scatter it across the dust. Bits of it twitch."],
      defeat: ["🦠 The slime crawls into your mouth before you can shut it."],
    },
  },

  twitchingHusk: {
    id: "twitchingHusk", name: "Twitching Husk", icon: "🥀",
    era: 1, tier: "common", kind: "human", encounterChance: 0.6,
    description: "Skin loose on the bones. They were a person, briefly. Then hunger.",
    combat: { hp: 11, acc: 0.55, eva: 0.05, damage: { min: 1, max: 3 }, damageType: "hp" },
    drops: [
      { resource: "rags",            qty: [1, 2], chance: 0.9 },
      { resource: "tarnished_coin",  qty: 1, chance: 0.30 },
      { resource: "bone",            qty: 1, chance: 0.3 },
    ],
    xp: 2,
    combatFlavor: {
      opener: ["🥀 A scarecrow of a person stumbles out of the dust, hands first."],
      attack: ["🥀 Knuckles connect. There is no strength behind them. {dmg} ❤️."],
      miss: ["🥀 It misses, falls, gets back up."],
      victory: ["🥀 The husk lies still. You wonder who they were."],
      defeat: ["🥀 The husk lies on top of you. It is lighter than you expected."],
    },
  },

  pebbleCrab: {
    id: "pebbleCrab", name: "Pebble Crab", icon: "🦀",
    era: 1, tier: "uncommon", kind: "beast", encounterChance: 0.3,
    description: "The fragments cling to its shell as if magnetized. It does not understand why. Neither do you.",
    combat: { hp: 16, acc: 0.55, eva: 0.05, damage: { min: 2, max: 3 }, damageType: "hp" },
    drops: [
      { resource: "chitin",    qty: [2, 4], chance: 1.0 },
      { resource: "fragments", qty: 1, chance: 0.18 },
      { resource: "scales",    qty: 1, chance: 0.2 },
    ],
    xp: 4,
    combatFlavor: {
      opener: ["🦀 The crab clatters as it moves — stones glued to its back ringing against each other.",
               "🦀 Among the pebbles on its shell you see something that shouldn't be there. A fragment."],
      attack: ["🦀 The pincer catches your shin. {dmg} ❤️."],
      miss: ["🦀 The crab pivots; you find only shell."],
      victory: ["🦀 You pry the shell open. Among the wet meat: a fragment. It was always there."],
      defeat: ["🦀 The crab pulls into its shell. The shell hums. You hum with it."],
    },
  },

  boneVulture: {
    id: "boneVulture", name: "Bone Vulture", icon: "🦅",
    era: 1, tier: "rare", kind: "beast", encounterChance: 0.18,
    description: "Older than any bird should be. It eats memory — yours, if you let it.",
    combat: { hp: 26, acc: 0.78, eva: 0.20, damage: { min: 2, max: 4 }, damageType: "sanity" },
    drops: [
      { resource: "ancient_feather", qty: [1, 2], chance: 0.9 },
      { resource: "marrow",          qty: 1, chance: 0.7 },
      { resource: "hollow_bone",     qty: [1, 2], chance: 0.9 },
      { resource: "fragments",       qty: 1, chance: 0.15 },
    ],
    xp: 6,
    combatFlavor: {
      opener: ["🦅 The vulture is older than birds should be. It looks at you like it has eaten you before."],
      attack: ["🦅 The beak finds your ear. A name you used to know goes with it. {dmg} ◐."],
      miss: ["🦅 You duck. The bird passes over, taking nothing of you. This time."],
      victory: ["🦅 The vulture falls. You sit beside it a long time, trying to remember why."],
      defeat: ["🦅 The vulture flies off with something of yours you will not get back."],
    },
  },

  saltMaggot: {
    id: "saltMaggot", name: "Salt Maggot", icon: "🪱",
    era: 1, tier: "common", kind: "beast", encounterChance: 0.5,
    description: "Pale, finger-thick, leaves salt where it crawls.",
    combat: { hp: 6, acc: 0.50, eva: 0.05, damage: { min: 1, max: 2 }, damageType: "hp" },
    drops: [
      { resource: "grubs",        qty: [1, 3], chance: 1.0 },
      { resource: "salt_crystal", qty: 1, chance: 0.35 },
    ],
    xp: 1,
    combatFlavor: {
      opener: ["🪱 The maggot rears as wide as a wrist. Its mouth opens lengthwise."],
      attack: ["🪱 It clamps onto your ankle. {dmg} ❤️."],
      miss: ["🪱 The maggot flops short of you."],
      victory: ["🪱 You crush it. Salt scatters."],
      defeat: ["🪱 The maggots find you. Plural."],
    },
  },

  ashWolf: {
    id: "ashWolf", name: "Ash Wolf", icon: "🐺",
    era: 1, tier: "rare", kind: "beast", encounterChance: 0.15,
    description: "Coat the color of cold fire. Larger than dogs, quieter than crows.",
    combat: { hp: 30, acc: 0.80, eva: 0.18, damage: { min: 4, max: 6 }, damageType: "hp" },
    drops: [
      { resource: "tough_meat",  qty: [2, 3], chance: 1.0 },
      { resource: "dog_fur",     qty: [2, 3], chance: 0.95 },
      { resource: "fangs",       qty: [1, 2], chance: 0.8 },
      { resource: "sinew",       qty: 1, chance: 0.7 },
      { resource: "marrow",      qty: 1, chance: 0.3 },
    ],
    xp: 8,
    combatFlavor: {
      opener: ["🐺 The ash wolf moves across the open ground like smoke. You do not hear it.",
               "🐺 You see the wolf the moment it wants you to."],
      attack: ["🐺 The wolf takes you in the side. {dmg} ❤️.", "🐺 It tears free a fistful. {dmg} ❤️."],
      miss: ["🐺 The wolf circles back. It is in no hurry."],
      victory: ["🐺 The ash wolf falls. Its body weighs less than it should."],
      defeat: ["🐺 The wolf drags you toward where the rest are waiting."],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // ERA 2 — Settler & The Plague That Isn't Plague
  // Humans break first. Cult acolytes appear. The boundary thins.
  // ═══════════════════════════════════════════════════════════════════

  raiderScout: {
    id: "raiderScout", name: "Raider Scout", icon: "🗡️",
    era: 2, tier: "common", kind: "human", encounterChance: 0.9,
    description: "Lean, knife-quick, traveling light. Counts your stores while she watches.",
    combat: { hp: 26, acc: 0.78, eva: 0.20, damage: { min: 3, max: 6 }, damageType: "hp" },
    drops: [
      { resource: "scrap_metal",   qty: [1, 2], chance: 0.9 },
      { resource: "hide",          qty: 1, chance: 0.7 },
      { resource: "dirty_water",   qty: 1, chance: 0.45 },
      { resource: "coin",          qty: [1, 3], chance: 0.85 },
    ],
    xp: 6,
    combatFlavor: {
      opener: ["🗡️ The scout steps out of cover already half-committed.",
               "🗡️ A knife in her hand and another in her belt — and a smile that's worse than both."],
      attack: ["🗡️ Her knife finds the seam in your guard. {dmg} ❤️.", "🗡️ A clean cut. {dmg} ❤️."],
      miss: ["🗡️ She steps past your swing. The knife is somewhere else."],
      victory: ["🗡️ The scout drops to one knee, then sideways. You take her purse."],
      defeat: ["🗡️ You feel the second knife you didn't see."],
    },
  },

  raiderBrute: {
    id: "raiderBrute", name: "Raider Brute", icon: "🪓",
    era: 2, tier: "uncommon", kind: "human", encounterChance: 0.5,
    description: "Half a head taller than he should be, twice as heavy. Carries a maul like it weighs nothing.",
    combat: { hp: 45, acc: 0.68, eva: 0.05, damage: { min: 5, max: 9 }, damageType: "hp" },
    drops: [
      { resource: "scrap_metal",   qty: [2, 4], chance: 1.0 },
      { resource: "hide",          qty: [1, 2], chance: 0.85 },
      { resource: "raider_token",  qty: 1, chance: 0.35 },
      { resource: "coin",          qty: [2, 5], chance: 0.95 },
    ],
    xp: 10,
    combatFlavor: {
      opener: ["🪓 The brute drags his maul through the dust as he comes."],
      attack: ["🪓 The maul lands and you hear bone. {dmg} ❤️.", "🪓 He sweeps. You catch the haft on the next swing. {dmg} ❤️."],
      miss: ["🪓 He overcommits and the maul digs into the ground."],
      victory: ["🪓 The brute falls and the ground shakes a little."],
      defeat: ["🪓 The world flashes white. Then there is a maul. Then there isn't anything."],
    },
  },

  wildBoar: {
    id: "wildBoar", name: "Wild Boar", icon: "🐗",
    era: 2, tier: "common", kind: "beast", encounterChance: 0.7,
    description: "Tusks longer than your forearm. Bad temper, worse memory.",
    combat: { hp: 38, acc: 0.62, eva: 0.05, damage: { min: 4, max: 7 }, damageType: "hp" },
    drops: [
      { resource: "boar_meat", qty: [2, 4], chance: 1.0 },
      { resource: "tusks",     qty: [1, 2], chance: 0.85 },
      { resource: "hide",      qty: [1, 2], chance: 0.9 },
      { resource: "sinew",     qty: 1, chance: 0.6 },
    ],
    xp: 8,
    combatFlavor: {
      opener: ["🐗 The boar lowers its head and snorts.", "🐗 You hear the crashing before you see the tusks."],
      attack: ["🐗 The tusk drives up. {dmg} ❤️.", "🐗 It barrels through. {dmg} ❤️."],
      miss: ["🐗 The boar slams past, kicking up dust."],
      victory: ["🐗 The boar drops. The meat will keep for days."],
      defeat: ["🐗 The boar leaves you on your back, staring up at a sky that's too bright."],
    },
  },

  plagueRat: {
    id: "plagueRat", name: "Plague Rat", icon: "🐀",
    era: 2, tier: "common", kind: "beast", encounterChance: 0.8,
    description: "Wet-furred, foam-jawed. They come in numbers. The numbers come with sickness.",
    combat: { hp: 8, acc: 0.65, eva: 0.20, damage: { min: 1, max: 2 }, damageType: "hp" },
    drops: [
      { resource: "rat_tail",      qty: [1, 3], chance: 1.0 },
      { resource: "dirty_water",   qty: 1, chance: 0.45 },
    ],
    xp: 2,
    appliesStatus: { id: "dysentery", durationMs: 5 * 60_000, chance: 0.30 },
    combatFlavor: {
      opener: ["🐀 The rat is at your ankle before you see it.", "🐀 A scuttling at the edge of the lamp-light. Then teeth."],
      attack: ["🐀 The bite holds. The foam smears against your skin. {dmg} ❤️."],
      miss: ["🐀 You stamp. The rat darts away, then back."],
      victory: ["🐀 The rat stills. The others scatter."],
      defeat: ["🐀 The rats are on top of you. There are more than you thought."],
    },
  },

  cultAcolyte: {
    id: "cultAcolyte", name: "Cult Acolyte", icon: "🕯️",
    era: 2, tier: "uncommon", kind: "human", encounterChance: 0.4,
    description: "Robed, hooded, chanting. The chant is meant for you.",
    combat: { hp: 30, acc: 0.72, eva: 0.10, damage: { min: 3, max: 5 }, damageType: "sanity" },
    drops: [
      { resource: "black_candle", qty: 1, chance: 0.85 },
      { resource: "torn_page",    qty: [1, 2], chance: 0.7 },
      { resource: "fragments",    qty: 1, chance: 0.3 },
      { resource: "coin",         qty: [1, 2], chance: 0.5 },
    ],
    xp: 7,
    combatFlavor: {
      opener: ["🕯️ The acolyte does not stop chanting when they see you.",
               "🕯️ A black candle in one hand. A torn page in the other. Eyes on you, but only barely."],
      attack: ["🕯️ A word lands in your head wrong. {dmg} ◐.", "🕯️ The chant changes pitch. Your skull rings. {dmg} ◐."],
      miss: ["🕯️ The chant catches on itself. The pressure recedes."],
      victory: ["🕯️ The acolyte stops mid-syllable. The silence afterward is uncomfortable."],
      defeat: ["🕯️ The chant completes. Whatever was being summoned arrives. You don't."],
    },
  },

  ironMadSoldier: {
    id: "ironMadSoldier", name: "Iron-Mad Soldier", icon: "⚔️",
    era: 2, tier: "uncommon", kind: "human", encounterChance: 0.35,
    description: "Armor rusted into the body. Was a soldier of something — they've forgotten what.",
    combat: { hp: 50, acc: 0.70, eva: 0.05, damage: { min: 4, max: 7 }, damageType: "hp", defenseHalf: true },
    drops: [
      { resource: "scrap_metal",    qty: [3, 5], chance: 1.0 },
      { resource: "broken_blade",   qty: 1, chance: 0.7 },
      { resource: "sinew",          qty: 1, chance: 0.5 },
      { resource: "raider_token",   qty: 1, chance: 0.2 },
      { resource: "coin",           qty: [1, 4], chance: 0.6 },
    ],
    xp: 10,
    combatFlavor: {
      opener: ["⚔️ The soldier's armor moves when his body doesn't. He has been wearing it too long.",
               "⚔️ He fights the way drill taught him, and the drill was good."],
      attack: ["⚔️ A trained cut. {dmg} ❤️.", "⚔️ He blocks, ripostes, lands. {dmg} ❤️."],
      miss: ["⚔️ He blocks the swing without thinking. He's still there."],
      victory: ["⚔️ The soldier falls and exhales for the first time in years."],
      defeat: ["⚔️ You feel him correct your guard as he kills you, the way a teacher would."],
    },
  },

  bogStalker: {
    id: "bogStalker", name: "Bog Stalker", icon: "👁️",
    era: 2, tier: "uncommon", kind: "corrupted", encounterChance: 0.3,
    description: "A wet shape in shallow water. Looks like a person until you see the second mouth.",
    combat: { hp: 38, acc: 0.74, eva: 0.18, damage: { min: 3, max: 6 }, damageType: "sanity", defenseHalf: true },
    drops: [
      { resource: "bog_iron",        qty: [1, 2], chance: 0.85 },
      { resource: "pale_worm",       qty: 1, chance: 0.4 },
      { resource: "fragments",       qty: 1, chance: 0.25 },
    ],
    xp: 9,
    combatFlavor: {
      opener: ["👁️ The stalker stands up out of the water without the water leaving it.",
               "👁️ You thought it was a tree. The bark is moving."],
      attack: ["👁️ The second mouth opens. The first is just decoration. {dmg} ◐."],
      miss: ["👁️ It folds back into the water. You wait. It does not surface."],
      victory: ["👁️ The water steadies. The shape that was watching is no longer there."],
      defeat: ["👁️ The water closes over your face. The mouths are patient."],
    },
  },

  glassEyedSettler: {
    id: "glassEyedSettler", name: "Glass-Eyed Settler", icon: "🧊",
    era: 2, tier: "uncommon", kind: "corrupted", encounterChance: 0.25,
    description: "Looks like the neighbor you knew. Wears their face well. Wears it.",
    combat: { hp: 35, acc: 0.70, eva: 0.10, damage: { min: 3, max: 5 }, damageType: "sanity" },
    drops: [
      { resource: "glass_shard",  qty: [1, 3], chance: 0.85 },
      { resource: "fragments",    qty: 1, chance: 0.35 },
      { resource: "rags",         qty: 1, chance: 0.6 },
      { resource: "coin",         qty: 1, chance: 0.3 },
    ],
    xp: 8,
    combatFlavor: {
      opener: ["🧊 They greet you by name. They say it the way someone reading a name says it.",
               "🧊 The eyes don't track. Nothing else does, either."],
      attack: ["🧊 They reach for your face. {dmg} ◐.", "🧊 They smile in a direction that isn't yours. {dmg} ◐."],
      miss: ["🧊 You shove them away. They keep smiling at where you were."],
      victory: ["🧊 The body falls. The face slides off. The face was the mask."],
      defeat: ["🧊 They take your face slowly. They wear it better than you ever did."],
    },
  },

  wormTouchedDrifter: {
    id: "wormTouchedDrifter", name: "Worm-Touched Drifter", icon: "🪱",
    era: 2, tier: "uncommon", kind: "corrupted", encounterChance: 0.22,
    description: "Bloated, slow. Something pale moves under the skin like a current.",
    combat: { hp: 32, acc: 0.60, eva: 0.05, damage: { min: 3, max: 5 }, damageType: "hp" },
    drops: [
      { resource: "pale_worm",   qty: [2, 4], chance: 1.0 },
      { resource: "hide",        qty: 1, chance: 0.4 },
      { resource: "fragments",   qty: 1, chance: 0.25 },
      { resource: "rags",        qty: [1, 2], chance: 0.5 },
    ],
    xp: 8,
    appliesStatus: { id: "dysentery", durationMs: 5 * 60_000, chance: 0.15 },
    combatFlavor: {
      opener: ["🪱 The drifter waves at you as if you were a long way off."],
      attack: ["🪱 The pale things in the wound under his shirt try to find yours. {dmg} ❤️."],
      miss: ["🪱 He stumbles forward, eyes elsewhere."],
      victory: ["🪱 You finish it. The worms inside lose interest and crawl back into the dust."],
      defeat: ["🪱 The pale things find you. You do not get to scream long."],
    },
  },

  shamblingRot: {
    id: "shamblingRot", name: "Shambling Rot", icon: "🧟",
    era: 2, tier: "common", kind: "corrupted", encounterChance: 0.5,
    description: "Was a settler. Then the rot. Then this.",
    combat: { hp: 24, acc: 0.55, eva: 0.05, damage: { min: 3, max: 4 }, damageType: "hp" },
    drops: [
      { resource: "rags",          qty: [1, 2], chance: 0.85 },
      { resource: "bone",          qty: 1, chance: 0.7 },
      { resource: "tarnished_coin", qty: 1, chance: 0.25 },
    ],
    xp: 4,
    appliesStatus: { id: "dysentery", durationMs: 5 * 60_000, chance: 0.08 },
    combatFlavor: {
      opener: ["🧟 It shambles into the firelight already reaching.",
               "🧟 You smell it long before you see it."],
      attack: ["🧟 The hand finds you. The fingers come off in your sleeve. {dmg} ❤️."],
      miss: ["🧟 You step past. It cannot turn fast enough."],
      victory: ["🧟 You put it down. You bury what's left of the rags."],
      defeat: ["🧟 The rot finds you. The dirt was warm."],
    },
  },

  ironCorvid: {
    id: "ironCorvid", name: "Iron Corvid", icon: "🪶",
    era: 2, tier: "rare", kind: "beast", encounterChance: 0.15,
    description: "Black-eyed. Bigger than a crow. Beak the color of a knife.",
    combat: { hp: 18, acc: 0.85, eva: 0.30, damage: { min: 3, max: 5 }, damageType: "hp" },
    drops: [
      { resource: "feathers",        qty: [3, 5], chance: 0.95 },
      { resource: "hollow_bone",     qty: [1, 2], chance: 0.8 },
      { resource: "bird_meat",       qty: 1, chance: 0.6 },
      { resource: "fragments",       qty: 1, chance: 0.18 },
    ],
    xp: 9,
    combatFlavor: {
      opener: ["🪶 The corvid lands closer than it should. It does not flinch."],
      attack: ["🪶 The beak punctures cleanly. {dmg} ❤️.", "🪶 It strikes the eye. {dmg} ❤️."],
      miss: ["🪶 It veers up. The wind smells like cold iron."],
      victory: ["🪶 You bring it down. It is heavier than a bird should be."],
      defeat: ["🪶 The corvid takes an eye. The other gives up shortly after."],
    },
  },

  silentMourner: {
    id: "silentMourner", name: "Silent Mourner", icon: "🥀",
    era: 2, tier: "rare", kind: "corrupted", encounterChance: 0.12,
    description: "Walks alone, weeping without sound. Touches what it weeps for.",
    combat: { hp: 40, acc: 0.70, eva: 0.15, damage: { min: 4, max: 6 }, damageType: "sanity", defenseHalf: true },
    drops: [
      { resource: "torn_page",     qty: [2, 3], chance: 0.9 },
      { resource: "black_candle",  qty: 1, chance: 0.6 },
      { resource: "fragments",     qty: [1, 2], chance: 0.5 },
      { resource: "rags",          qty: [1, 2], chance: 0.8 },
    ],
    xp: 12,
    combatFlavor: {
      opener: ["🥀 The mourner approaches with both hands open.",
               "🥀 No sound from the open mouth. You feel the sob anyway."],
      attack: ["🥀 They touch your cheek. Something falls out of your memory. {dmg} ◐."],
      miss: ["🥀 You pull back. The hand finds only air. The mouth opens wider."],
      victory: ["🥀 The mourner sits down to weep without sound. You leave them to it."],
      defeat: ["🥀 You begin to weep with them. You don't remember why."],
    },
  },

  ironHandedTitan: {
    id: "ironHandedTitan", name: "Iron-Handed Titan", icon: "⚒️",
    era: 2, tier: "apex", kind: "corrupted_human", encounterChance: 0.04,
    description: "Bigger than a brute should be. Half the arm is forge. The forge still burns.",
    combat: { hp: 80, acc: 0.72, eva: 0.04, damage: { min: 6, max: 10 }, damageType: "hp", defenseHalf: true },
    drops: [
      { resource: "scrap_metal",   qty: [4, 7], chance: 1.0 },
      { resource: "bog_iron",      qty: [1, 2], chance: 0.7 },
      { resource: "raider_token",  qty: [1, 2], chance: 0.8 },
      { resource: "coin",          qty: [3, 6], chance: 0.95 },
      { resource: "fragments",     qty: 1, chance: 0.35 },
    ],
    xp: 18,
    combatFlavor: {
      opener: ["⚒️ The titan ducks under the roof beam, then doesn't.",
               "⚒️ The forge in his arm is bright enough to read by."],
      attack: ["⚒️ The iron fist crashes down. The world goes white. {dmg} ❤️."],
      miss: ["⚒️ He overcorrects. The arm is heavier than even he expects."],
      victory: ["⚒️ The titan sits down hard. The forge in his arm dims. You wait until it's dark."],
      defeat: ["⚒️ The arm closes once. You leave the wasteland to the next walker."],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // ERA 3 — Awakened World & The Things That Always Were
  // Full Lovecraftian. The mask is off. Some of these you don't see so
  // much as remember.
  // ═══════════════════════════════════════════════════════════════════

  whisperer: {
    id: "whisperer", name: "Whisperer", icon: "👤",
    era: 3, tier: "common", kind: "demon", encounterChance: 0.8,
    description: "Voices you almost recognize. Almost a friend. Almost yours.",
    combat: { hp: 28, acc: 0.78, eva: 0.20, damage: { min: 3, max: 5 }, damageType: "sanity" },
    drops: [
      { resource: "spirit_essence", qty: 1, chance: 0.85 },
      { resource: "fragments",      qty: 1, chance: 0.6 },
      { resource: "shadow_dust",    qty: 1, chance: 0.35 },
    ],
    xp: 9,
    combatFlavor: {
      opener: ["👤 The whisper starts in the back of your skull. The whisperer is not anywhere yet."],
      attack: ["👤 The voice finds the worst version of your name. {dmg} ◐."],
      miss: ["👤 The whisper stutters. You hold your own thoughts."],
      victory: ["👤 The whisper goes thin and dies. You are alone in your head again. Mostly."],
      defeat: ["👤 You answer the whisper. You don't remember what you say."],
    },
  },

  hollowHound: {
    id: "hollowHound", name: "Hollow Hound", icon: "🦴",
    era: 3, tier: "common", kind: "demon", encounterChance: 0.65,
    description: "Dog-shaped. Dog-sized. Inside, no dog.",
    combat: { hp: 34, acc: 0.78, eva: 0.18, damage: { min: 4, max: 6 }, damageType: "hp" },
    drops: [
      { resource: "void_bone",   qty: [1, 2], chance: 0.9 },
      { resource: "fragments",   qty: 1, chance: 0.45 },
      { resource: "shadow_dust", qty: 1, chance: 0.25 },
    ],
    xp: 10,
    combatFlavor: {
      opener: ["🦴 The hound stares at you. There is nothing behind the eyes. There is nothing behind anything of it."],
      attack: ["🦴 The bite is silent. The wound is loud. {dmg} ❤️."],
      miss: ["🦴 It snaps where you were a heartbeat ago."],
      victory: ["🦴 The hound collapses inward. The space it takes up keeps being empty."],
      defeat: ["🦴 The hollow finds you. You become part of it. You always were."],
    },
  },

  iconoclast: {
    id: "iconoclast", name: "Iconoclast", icon: "🗿",
    era: 3, tier: "uncommon", kind: "demon", encounterChance: 0.35,
    description: "Hates the made things. Especially yours.",
    combat: { hp: 42, acc: 0.70, eva: 0.10, damage: { min: 5, max: 7 }, damageType: "hp", defenseHalf: true },
    drops: [
      { resource: "shattered_glyph", qty: [1, 2], chance: 0.85 },
      { resource: "fragments",       qty: [1, 2], chance: 0.7 },
      { resource: "stone",           qty: [1, 3], chance: 0.6 },
    ],
    xp: 12,
    combatFlavor: {
      opener: ["🗿 The iconoclast looks past you at what you built. Then at you. It does not like either."],
      attack: ["🗿 A blow that wants to be against your hut and settles for being against you. {dmg} ❤️."],
      miss: ["🗿 It hits the doorframe instead. The doorframe splinters. The fight continues."],
      victory: ["🗿 The iconoclast cracks. Inside is more stone, all the way down."],
      defeat: ["🗿 The iconoclast turns to your home. You can hear it from where you are. Mostly."],
    },
  },

  corruptedWalker: {
    id: "corruptedWalker", name: "Corrupted Walker", icon: "🧟‍♂️",
    era: 3, tier: "common", kind: "corrupted", encounterChance: 0.6,
    description: "Was a person who walked into the wrong dust. Still walking.",
    combat: { hp: 30, acc: 0.65, eva: 0.10, damage: { min: 4, max: 6 }, damageType: "hp" },
    drops: [
      { resource: "corrupted_flesh", qty: [1, 2], chance: 1.0 },
      { resource: "fragments",       qty: 1, chance: 0.55 },
      { resource: "rags",            qty: 1, chance: 0.65 },
    ],
    xp: 10,
    combatFlavor: {
      opener: ["🧟‍♂️ The walker is a person you might have known. Then again, you might not."],
      attack: ["🧟‍♂️ A swing that remembers being trained. {dmg} ❤️."],
      miss: ["🧟‍♂️ Their hands grasp where you were."],
      victory: ["🧟‍♂️ The walker stops walking. The dust takes them back."],
      defeat: ["🧟‍♂️ You go where they came from. The dust knows you a little already."],
    },
  },

  soullessStalker: {
    id: "soullessStalker", name: "Soulless Stalker", icon: "🌫️",
    era: 3, tier: "uncommon", kind: "demon", encounterChance: 0.32,
    description: "A long shape with too many joints. Steals breath before it steals anything else.",
    combat: { hp: 36, acc: 0.80, eva: 0.25, damage: { min: 3, max: 6 }, damageType: "sanity", defenseHalf: true },
    drops: [
      { resource: "shadow_dust",    qty: [2, 3], chance: 0.9 },
      { resource: "fragments",      qty: [1, 2], chance: 0.55 },
      { resource: "spirit_essence", qty: 1, chance: 0.35 },
    ],
    xp: 12,
    combatFlavor: {
      opener: ["🌫️ The stalker uncurls from the edge of the firelight. There is too much of it.",
               "🌫️ You don't see it. You see what it has stood in front of for a while."],
      attack: ["🌫️ It breathes you. Your sanity breathes with it. {dmg} ◐."],
      miss: ["🌫️ The stalker withdraws. You feel watched after."],
      victory: ["🌫️ The stalker dissolves. The shadow doesn't go entirely."],
      defeat: ["🌫️ It folds you into its own long shape. You go quiet."],
    },
  },

  theWitness: {
    id: "theWitness", name: "The Witness", icon: "👁️",
    era: 3, tier: "rare", kind: "demon", encounterChance: 0.12,
    description: "Eyes where there should not be eyes. Watches more than it attacks.",
    combat: { hp: 50, acc: 0.85, eva: 0.10, damage: { min: 4, max: 6 }, damageType: "sanity", defenseHalf: true },
    drops: [
      { resource: "lidless_eye",    qty: 1, chance: 0.45 },
      { resource: "shadow_dust",    qty: [2, 3], chance: 0.85 },
      { resource: "spirit_essence", qty: 1, chance: 0.55 },
      { resource: "fragments",      qty: [1, 2], chance: 0.5 },
    ],
    xp: 16,
    combatFlavor: {
      opener: ["👁️ The Witness has too many eyes and not enough patience.",
               "👁️ You are seen now. By more of you than you have available."],
      attack: ["👁️ It looks at you wrongly. Things rearrange. {dmg} ◐."],
      miss: ["👁️ It looks away briefly. The pressure recedes."],
      victory: ["👁️ The eyes close one by one. The last one looks at you for a long time before it goes."],
      defeat: ["👁️ You are watched until you are something else."],
    },
  },

  pallidReacher: {
    id: "pallidReacher", name: "Pallid Reacher", icon: "🤲",
    era: 3, tier: "uncommon", kind: "demon", encounterChance: 0.25,
    description: "Limbs longer than they should be. From beyond a door you did not open.",
    combat: { hp: 44, acc: 0.78, eva: 0.18, damage: { min: 4, max: 7 }, damageType: "spirit" },
    drops: [
      { resource: "pale_tendon",    qty: [1, 2], chance: 0.85 },
      { resource: "spirit_essence", qty: 1, chance: 0.5 },
      { resource: "void_bone",      qty: 1, chance: 0.4 },
    ],
    xp: 13,
    combatFlavor: {
      opener: ["🤲 The reacher's arms come into the room a long time before the rest of it does.",
               "🤲 You see fingers first. Then the wrist. Then more wrist."],
      attack: ["🤲 The hand finds the place under your ribs where the spirit lives. {dmg} ✨."],
      miss: ["🤲 The hand pulls back through the wall and out of the room."],
      victory: ["🤲 The reacher pulls back into wherever it came from. The wall is a wall again."],
      defeat: ["🤲 It pulls. You go through where the wall used to be."],
    },
  },

  thoughtwormHost: {
    id: "thoughtwormHost", name: "Thoughtworm Host", icon: "🪱",
    era: 3, tier: "uncommon", kind: "corrupted", encounterChance: 0.2,
    description: "A body that no longer belongs to its person. The thing inside speaks in their voice.",
    combat: { hp: 40, acc: 0.65, eva: 0.05, damage: { min: 3, max: 5 }, damageType: "sanity" },
    drops: [
      { resource: "pale_worm",      qty: [2, 4], chance: 1.0 },
      { resource: "void_bone",      qty: 1, chance: 0.5 },
      { resource: "fragments",      qty: 1, chance: 0.4 },
      { resource: "corrupted_flesh", qty: 1, chance: 0.6 },
    ],
    xp: 13,
    appliesStatus: { id: "dysentery", durationMs: 5 * 60_000, chance: 0.15 },
    combatFlavor: {
      opener: ["🪱 The host says hello in a voice they used to own.",
               "🪱 Their belly moves in directions a belly shouldn't."],
      attack: ["🪱 The worm-mouth opens behind the eyes. {dmg} ◐."],
      miss: ["🪱 They stutter mid-thought. The worm corrects them."],
      victory: ["🪱 The body stops. The worm spills out and dries in the air."],
      defeat: ["🪱 The worm tastes you. The host is glad."],
    },
  },

  waxFacedWatcher: {
    id: "waxFacedWatcher", name: "Wax-Faced Watcher", icon: "🎭",
    era: 3, tier: "rare", kind: "demon", encounterChance: 0.14,
    description: "Featureless until you look. Then it has your face. Yours but better. Yours but worse.",
    combat: { hp: 38, acc: 0.78, eva: 0.22, damage: { min: 4, max: 6 }, damageType: "sanity", defenseHalf: true },
    drops: [
      { resource: "wax_mask",       qty: 1, chance: 0.7 },
      { resource: "fragments",      qty: [1, 2], chance: 0.55 },
      { resource: "shadow_dust",    qty: 1, chance: 0.4 },
    ],
    xp: 14,
    combatFlavor: {
      opener: ["🎭 The watcher has no face. Then it has yours. Then it has yours but slightly off.",
               "🎭 You see yourself looking back at you. The smile is wrong."],
      attack: ["🎭 The wax warms. The face becomes yours. {dmg} ◐."],
      miss: ["🎭 The face slides. You see what's under. You wish you hadn't."],
      victory: ["🎭 The watcher falls. The face peels free of the wax. It takes nothing of you with it."],
      defeat: ["🎭 The watcher walks home wearing you. The hut welcomes you back."],
    },
  },

  namesYouBackward: {
    id: "namesYouBackward", name: "Names-You-Backward", icon: "🔤",
    era: 3, tier: "rare", kind: "demon", encounterChance: 0.10,
    description: "Speaks your name in reverse. Each syllable that lands undoes you a little.",
    combat: { hp: 32, acc: 0.85, eva: 0.18, damage: { min: 3, max: 5 }, damageType: "sanity", defenseHalf: true },
    drops: [
      { resource: "inverted_glyph", qty: 1, chance: 0.6 },
      { resource: "fragments",      qty: [1, 2], chance: 0.55 },
      { resource: "spirit_essence", qty: 1, chance: 0.5 },
    ],
    xp: 15,
    combatFlavor: {
      opener: ["🔤 It speaks your name backward. The first syllable feels wrong even before the second."],
      attack: ["🔤 Another syllable. Something of you uncoils. {dmg} ◐."],
      miss: ["🔤 It stumbles on a vowel. You hold yourself together."],
      victory: ["🔤 You silence it before it finishes. Your name still sounds wrong for an hour after."],
      defeat: ["🔤 It finishes. You were not made to hold your name said that way."],
    },
  },

  hollowWalker: {
    id: "hollowWalker", name: "Hollow Walker", icon: "👻",
    era: 3, tier: "uncommon", kind: "demon", encounterChance: 0.22,
    description: "An empty robe. The way it walks suggests it once had legs.",
    combat: { hp: 30, acc: 0.70, eva: 0.20, damage: { min: 3, max: 5 }, damageType: "spirit", defenseHalf: true },
    drops: [
      { resource: "hollow_garment", qty: 1, chance: 0.75 },
      { resource: "shadow_dust",    qty: [1, 2], chance: 0.7 },
      { resource: "fragments",      qty: 1, chance: 0.4 },
    ],
    xp: 11,
    combatFlavor: {
      opener: ["👻 The robe steps out from behind nothing. There is no one inside.",
               "👻 You see the walker only by where the wind goes around it."],
      attack: ["👻 The garment closes around your hand. The cold goes through to the bone. {dmg} ✨."],
      miss: ["👻 The robe folds in on itself and is somewhere else."],
      victory: ["👻 The robe falls empty to the ground. You don't pick it up."],
      defeat: ["👻 The robe drapes over you. The cold settles in. You walk with it."],
    },
  },

  paleGeometer: {
    id: "paleGeometer", name: "Pale Geometer", icon: "📐",
    era: 3, tier: "rare", kind: "demon", encounterChance: 0.08,
    description: "Draws wards in the wrong direction. Knows angles you do not.",
    combat: { hp: 48, acc: 0.80, eva: 0.18, damage: { min: 4, max: 7 }, damageType: "spirit", defenseHalf: true },
    drops: [
      { resource: "inverted_glyph", qty: [1, 2], chance: 0.75 },
      { resource: "shattered_glyph", qty: 1, chance: 0.5 },
      { resource: "spirit_essence", qty: [1, 2], chance: 0.55 },
      { resource: "fragments",      qty: [1, 2], chance: 0.55 },
    ],
    xp: 17,
    combatFlavor: {
      opener: ["📐 The geometer's hand traces a shape that should not close. It closes.",
               "📐 The room is suddenly the wrong room. The geometer prefers it this way."],
      attack: ["📐 An angle opens through your guard. {dmg} ✨."],
      miss: ["📐 The shape does not close. You exhale."],
      victory: ["📐 The geometer falls. The wards collapse. The room remembers itself."],
      defeat: ["📐 The shape closes around you instead. You are inside a geometry you did not consent to."],
    },
  },

  carrionCherub: {
    id: "carrionCherub", name: "Carrion Cherub", icon: "👼",
    era: 3, tier: "rare", kind: "demon", encounterChance: 0.07,
    description: "Child-sized. Winged. Sings while it eats. The song is worse than the eating.",
    combat: { hp: 42, acc: 0.82, eva: 0.25, damage: { min: 4, max: 7 }, damageType: "sanity", defenseHalf: true },
    drops: [
      { resource: "cherub_feather", qty: 1, chance: 0.5 },
      { resource: "spirit_essence", qty: [1, 2], chance: 0.7 },
      { resource: "ancient_feather", qty: 1, chance: 0.6 },
      { resource: "obol",           qty: 1, chance: 0.3 },
    ],
    xp: 18,
    combatFlavor: {
      opener: ["👼 The cherub descends, singing.",
               "👼 You see the wings first. The teeth are after the song."],
      attack: ["👼 A bar of the song lands inside your head. {dmg} ◐."],
      miss: ["👼 It misses. It does not stop singing."],
      victory: ["👼 The cherub falls. The song continues for some seconds after. Then stops."],
      defeat: ["👼 You join the song. You do not remember the words after."],
    },
  },

  starSpawnAcolyte: {
    id: "starSpawnAcolyte", name: "Star-Spawn Acolyte", icon: "⭐",
    era: 3, tier: "apex", kind: "demon", encounterChance: 0.03,
    description: "Knows you are there. Has known a while. Is the first thing you have met that always was.",
    combat: { hp: 75, acc: 0.85, eva: 0.20, damage: { min: 6, max: 10 }, damageType: "sanity", defenseHalf: true },
    drops: [
      { resource: "starlit_fragment", qty: 1, chance: 0.4 },
      { resource: "spirit_essence",   qty: [2, 3], chance: 0.9 },
      { resource: "void_bone",        qty: [1, 2], chance: 0.8 },
      { resource: "fragments",        qty: [2, 3], chance: 0.85 },
      { resource: "obol",             qty: 1, chance: 0.5 },
    ],
    xp: 25,
    combatFlavor: {
      opener: ["⭐ The acolyte does not arrive. It is already there. It was always there.",
               "⭐ A shape that does not fit the room. The room makes room."],
      attack: ["⭐ It speaks a name that is not in your language. Your sanity bends to fit. {dmg} ◐."],
      miss: ["⭐ The name will not finish. You hold steady."],
      victory: ["⭐ The acolyte folds. The fold takes some of the dust with it. The night is briefly larger."],
      defeat: ["⭐ The acolyte does not finish you. It speaks you elsewhere. You go."],
    },
  },

  drownedChoir: {
    id: "drownedChoir", name: "The Drowned Choir", icon: "🌊",
    era: 3, tier: "rare", kind: "demon", encounterChance: 0.06,
    description: "A wet sound from the water that should be boiled. They surface because you finished the song.",
    combat: { hp: 55, acc: 0.78, eva: 0.15, damage: { min: 4, max: 7 }, damageType: "sanity", defenseHalf: true },
    drops: [
      { resource: "bog_iron",       qty: 1, chance: 0.45 },
      { resource: "shadow_dust",    qty: [1, 2], chance: 0.7 },
      { resource: "torn_page",      qty: [1, 2], chance: 0.55 },
      { resource: "spirit_essence", qty: 1, chance: 0.5 },
      { resource: "fragments",      qty: [1, 2], chance: 0.6 },
    ],
    xp: 16,
    combatFlavor: {
      opener: ["🌊 The water sings. Each voice was once a settler. Each settler was once dry.",
               "🌊 The pot of water you boiled hisses, then sings."],
      attack: ["🌊 A chord that wants you to step in. {dmg} ◐."],
      miss: ["🌊 The chord cracks. The water settles."],
      victory: ["🌊 The water stills. The choir is gone. The kettle is just a kettle."],
      defeat: ["🌊 You step in. The choir makes room. The room is wet."],
    },
  },

  facelessPilgrim: {
    id: "facelessPilgrim", name: "Faceless Pilgrim", icon: "🚪",
    era: 3, tier: "rare", kind: "demon", encounterChance: 0.05,
    description: "Carries its face in its hands. Offers it to you. The offer is the worse part.",
    combat: { hp: 46, acc: 0.78, eva: 0.18, damage: { min: 4, max: 6 }, damageType: "sanity", defenseHalf: true },
    drops: [
      { resource: "wax_mask",       qty: 1, chance: 0.65 },
      { resource: "hollow_garment", qty: 1, chance: 0.55 },
      { resource: "spirit_essence", qty: 1, chance: 0.5 },
      { resource: "fragments",      qty: 1, chance: 0.55 },
    ],
    xp: 15,
    combatFlavor: {
      opener: ["🚪 The pilgrim arrives at the door already pulling its face off.",
               "🚪 It holds the face out. The face is, on inspection, somewhat like yours."],
      attack: ["🚪 It presses the offering forward. Your face flinches in sympathy. {dmg} ◐."],
      miss: ["🚪 You refuse. The pilgrim waits."],
      victory: ["🚪 The pilgrim sits down with its face in its lap. The pilgrim does not stand up again."],
      defeat: ["🚪 You take the face. The pilgrim smiles in a direction you cannot see."],
    },
  },

  theBoundary: {
    id: "theBoundary", name: "The Boundary", icon: "🌀",
    era: 3, tier: "apex", kind: "demon", encounterChance: 0.02,
    description: "A doorway-shaped thing. It opens both ways. Most of what walks through is going away from you.",
    combat: { hp: 90, acc: 0.80, eva: 0.05, damage: { min: 6, max: 11 }, damageType: "spirit", defenseHalf: true },
    drops: [
      { resource: "starlit_fragment", qty: 1, chance: 0.5 },
      { resource: "void_bone",        qty: [2, 3], chance: 0.85 },
      { resource: "spirit_essence",   qty: [2, 3], chance: 0.85 },
      { resource: "fragments",        qty: [2, 4], chance: 0.85 },
      { resource: "obol",             qty: [1, 2], chance: 0.65 },
    ],
    xp: 28,
    combatFlavor: {
      opener: ["🌀 The boundary opens. There is a long pause. Then it does not close.",
               "🌀 You see, very briefly, what is on the other side. You wish you had not."],
      attack: ["🌀 A pull. Things of you go through. {dmg} ✨."],
      miss: ["🌀 The pull releases. You stay where you were standing."],
      victory: ["🌀 The boundary closes. The world is a little less porous tonight."],
      defeat: ["🌀 You go through. The boundary closes after."],
    },
  },

  ashangel: {
    id: "ashangel", name: "Ash-Angel", icon: "🕊️",
    era: 3, tier: "rare", kind: "demon", encounterChance: 0.06,
    description: "Wings of ash. Eyes of fire. Speaks a kindness that costs.",
    combat: { hp: 48, acc: 0.80, eva: 0.20, damage: { min: 4, max: 7 }, damageType: "spirit", defenseHalf: true },
    drops: [
      { resource: "ancient_feather", qty: [1, 2], chance: 0.85 },
      { resource: "spirit_essence",  qty: [1, 2], chance: 0.7 },
      { resource: "fragments",       qty: 1, chance: 0.55 },
      { resource: "cherub_feather",  qty: 1, chance: 0.25 },
    ],
    xp: 16,
    combatFlavor: {
      opener: ["🕊️ The ash-angel descends with a kindness you did not ask for.",
               "🕊️ Its eyes are warm. The warmth is offered. The warmth is a fire."],
      attack: ["🕊️ The kindness lands. Something of you is lifted away. {dmg} ✨."],
      miss: ["🕊️ The kindness misses. You feel the wing pass close enough."],
      victory: ["🕊️ The ash-angel falls. The kindness sits in the dust, slowly cooling."],
      defeat: ["🕊️ You accept the kindness. The kindness takes you with it."],
    },
  },

  childOfThePale: {
    id: "childOfThePale", name: "Child Of The Pale", icon: "🌒",
    era: 3, tier: "uncommon", kind: "demon", encounterChance: 0.18,
    description: "Small. Quiet. Reaches up to you like a child does. Don't.",
    combat: { hp: 26, acc: 0.78, eva: 0.25, damage: { min: 3, max: 5 }, damageType: "sanity" },
    drops: [
      { resource: "pale_worm",      qty: 1, chance: 0.4 },
      { resource: "shadow_dust",    qty: 1, chance: 0.55 },
      { resource: "fragments",      qty: 1, chance: 0.35 },
      { resource: "rags",           qty: 1, chance: 0.6 },
    ],
    xp: 11,
    combatFlavor: {
      opener: ["🌒 The pale child stands very still at the edge of the firelight.",
               "🌒 It reaches up. You almost reach down. You almost."],
      attack: ["🌒 The small hand closes around your finger. The cold goes up. {dmg} ◐."],
      miss: ["🌒 The hand finds nothing. The child waits."],
      victory: ["🌒 The pale child falls. The child was not a child."],
      defeat: ["🌒 You picked up the child. The child went home with you. You wake holding the child."],
    },
  },

  glyphEater: {
    id: "glyphEater", name: "Glyph-Eater", icon: "🍽️",
    era: 3, tier: "uncommon", kind: "demon", encounterChance: 0.16,
    description: "Eats the wards. Eats the etchings. Hungry for symbol.",
    combat: { hp: 38, acc: 0.72, eva: 0.10, damage: { min: 4, max: 6 }, damageType: "hp", defenseHalf: true },
    drops: [
      { resource: "shattered_glyph",  qty: [1, 2], chance: 0.85 },
      { resource: "inverted_glyph",   qty: 1, chance: 0.4 },
      { resource: "spirit_essence",   qty: 1, chance: 0.5 },
      { resource: "fragments",        qty: [1, 2], chance: 0.6 },
    ],
    xp: 12,
    combatFlavor: {
      opener: ["🍽️ The eater approaches the wards on your door. The wards weaken.",
               "🍽️ The mouth opens. The opening is the symbol of a mouth, eaten."],
      attack: ["🍽️ The eater bites at your warding charm. The charm thins. The strike lands. {dmg} ❤️."],
      miss: ["🍽️ It bites at nothing it wanted."],
      victory: ["🍽️ The eater falls. The wards on your door slowly re-form. You will need new etchings."],
      defeat: ["🍽️ It eats the last of your wards. Your home is open to the road now."],
    },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────

export const getMob = (id) => MOBS[id] || null;
export const getAllMobs = () => Object.values(MOBS);
export const getMobsForEra = (era) =>
  getAllMobs().filter((m) => (m.era || 1) <= era);

// ─── Currency ────────────────────────────────────────────────────────
// Single tier ladder. Three coin types matching era progression:
//   tarnished_coin — Era 1 ancient coinage; mostly worthless for now,
//                    valuable once trade routes (#future) come online
//   coin           — Era 2 settler economy; standard trade unit
//   obol           — Era 3 black-iron currency; rare, mostly from
//                    arcane/cult-touched sources
export const COIN_VALUE = {
  tarnished_coin: 1,
  coin: 5,
  obol: 25,
};
