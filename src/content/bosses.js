// Boss definitions — DATA, not code.
// 6 bosses (1 mini + 1 main per era). encounterChance: 0 — bosses never
// random-fire; challenge UI (#40) reads them via getBossesAvailable.

export const BOSSES = {
  era1_mini_dustCrownedScavenger: {
    id: "era1_mini_dustCrownedScavenger",
    name: "The Dust-Crowned Scavenger",
    icon: "👤",
    boss: true, tier: "mini", era: 1, kind: "human",
    description: "The leader of the dust band that's been picking at your edges. Older than the rest. Crowned with bone the rest of his kind can't afford.",
    encounterChance: 0,
    requires: { hutBuilt: true },
    minGathersAfterGate: 0,
    combat: { hp: 30, acc: 0.72, eva: 0.05, damage: { min: 3, max: 5 }, damageType: "hp" },
    defeatReward: { inventory: { wood: 10, stone: 10, food: 5, fragments: 1 } },
    runeDrops: [ { resource: "splinterRune", chance: 0.30, qty: 1 }, { resource: "pebbleWard", chance: 0.20, qty: 1 } ],
    firstDefeatLog: "🥇 The Dust-Crowned Scavenger falls. The band scatters with him. You stand a long time looking at the bone-crown before you set it down.",
    etching: "first_boss_era1",
    combatFlavor: {
      opener: [
        "👤 The Dust-Crowned Scavenger steps from the ash and shows you his teeth.",
        "👤 He walks in slow. The crown of bones catches what little light there is.",
        "👤 You hear him before you see him — the dragging step, the dry breathing.",
      ],
      attack: [
        "👤 He swings a notched knife. {dmg} ❤️.",
        "👤 He gets inside your reach faster than you expected. {dmg} ❤️.",
        "👤 The bone-crown ducks; the blade comes up under it. {dmg} ❤️.",
      ],
      miss: [
        "👤 He overcommits. The knife passes harmless.",
        "👤 You step inside the swing. He resets, breathing hard.",
      ],
      victory: [
        "👑 He drops. The crown clatters off into the dust.",
        "👑 You stand over him. The bones in his crown were cracked already.",
      ],
      defeat: ["👑 He stands over you. The crown of bones is the last thing you see clearly."],
    },
  },

  era1_main_longToothedOne: {
    id: "era1_main_longToothedOne",
    name: "The Long-Toothed One",
    icon: "🐺",
    boss: true, tier: "main", era: 1, kind: "beast",
    description: "A wasteland predator three winters too clever. It has watched you for weeks.",
    encounterChance: 0,
    requires: { hutBuilt: true },
    minGathersAfterGate: 0,
    combat: { hp: 50, acc: 0.78, eva: 0.12, damage: { min: 4, max: 7 }, damageType: "hp", defenseHalf: false },
    defeatReward: { inventory: { food: 15, feathers: 10, fragments: 2 } },
    runeDrops: [ { resource: "huntermarkRune", chance: 0.25, qty: 1 }, { resource: "emberRune", chance: 0.35, qty: 1 } ],
    firstDefeatLog: "🥇 The Long-Toothed One falls. You drag it back to the fire and learn what its teeth were really for.",
    etching: "first_boss_era1_main",
    combatFlavor: {
      opener: [
        "🐺 The Long-Toothed One pads out of the dust. It does not run.",
        "🐺 Yellow eyes, low to the ground. The shoulders bunch.",
        "🐺 You see the teeth first. The rest of it is the same color as the ground.",
      ],
      attack: [
        "🐺 It lunges. Teeth find purchase. {dmg} ❤️.",
        "🐺 It rakes you with a forepaw before you can pull back. {dmg} ❤️.",
        "🐺 You feel it bite, then bite deeper. {dmg} ❤️.",
      ],
      miss: [
        "🐺 It snaps and finds only the haft of your weapon.",
        "🐺 It twists past your strike, low to the ground.",
      ],
      victory: [
        "🦴 It drops at last. You sit beside it a long time, listening to the wind.",
        "🦴 The Long-Toothed One stills. You take the teeth.",
      ],
      defeat: ["🦴 You feel it close around your throat. The dust takes you, and the long teeth."],
    },
  },

  era2_mini_raiderCaptain: {
    id: "era2_mini_raiderCaptain",
    name: "The Raider Captain",
    icon: "🗡️",
    boss: true, tier: "mini", era: 2, kind: "human",
    description: "She rides in alone. The rest of her band watches from the ridge.",
    encounterChance: 0,
    requires: { hutBuilt: true, hasBuilding: "home" },
    minGathersAfterGate: 0,
    combat: { hp: 65, acc: 0.82, eva: 0.15, damage: { min: 5, max: 9 }, damageType: "hp" },
    defeatReward: { inventory: { wood: 20, stone: 20, fragments: 3, feathers: 5 } },
    runeDrops: [ { resource: "inscribedSigil", chance: 0.25, qty: 1 }, { resource: "bedrockRune", chance: 0.20, qty: 1 } ],
    firstDefeatLog: "🥇 The Raider Captain falls. The ridge empties. The band will think long before coming at all.",
    etching: "first_boss_era2",
    combatFlavor: {
      opener: [
        "🗡️ She rides in slow, dismounts slower. Whatever she came to do, she came to do it herself.",
        "🗡️ The Raider Captain. Older than she should be, given what she has done.",
        "🗡️ She tests the edge of her sword on her own thumb before she looks at you.",
      ],
      attack: [
        "🗡️ Her blade is faster than your eye. {dmg} ❤️.",
        "🗡️ She steps in clean and cuts deep. {dmg} ❤️.",
        "🗡️ Her sword finds a gap in everything you have. {dmg} ❤️.",
      ],
      miss: [
        "🗡️ She lets you commit, then is somewhere else.",
        "🗡️ A wide swing of yours. She is already past it.",
      ],
      victory: [
        "👑 She drops to one knee, then sideways. The band on the ridge is already moving away.",
        "👑 She dies surprised. You take her sword. You leave the rest.",
      ],
      defeat: ["👑 You feel the sword find your ribs. She is quiet about it. So are you."],
    },
  },

  era2_main_ironHand: {
    id: "era2_main_ironHand",
    name: "The Iron-Hand",
    icon: "⚒️",
    boss: true, tier: "main", era: 2, kind: "corrupted_human",
    description: "He was a smith, once. Then he made one piece too many, and the work made him back.",
    encounterChance: 0,
    requires: { hutBuilt: true, hasBuilding: "forge" },
    minGathersAfterGate: 0,
    combat: { hp: 110, acc: 0.75, eva: 0.05, damage: { min: 7, max: 12 }, damageType: "hp", defenseHalf: true },
    defeatReward: { inventory: { stone: 30, wood: 15, fragments: 5, feathers: 10 } },
    runeDrops: [ { resource: "huntermarkRune", chance: 0.30, qty: 1 }, { resource: "horizonRune", chance: 0.25, qty: 1 }, { resource: "frostveinRune", chance: 0.15, qty: 1 } ],
    firstDefeatLog: "🥇 The Iron-Hand kneels and does not get up. The iron in his arm is still warm when you pry it free.",
    etching: "first_boss_era2_main",
    combatFlavor: {
      opener: [
        "⚒️ The Iron-Hand comes down the road. The arm at his side is glowing softly.",
        "⚒️ He smells like the forge before the forge was yours.",
        "⚒️ His iron hand makes a sound as it opens. The sound of a forge breathing.",
      ],
      attack: [
        "⚒️ The iron fist swings. The world goes white. {dmg} ❤️.",
        "⚒️ He hits you with the back of his hand, almost gently. {dmg} ❤️.",
        "⚒️ The heat finds you before the iron does. {dmg} ❤️.",
      ],
      miss: [
        "⚒️ The iron arm whistles past your ear. You can feel the heat afterward.",
        "⚒️ He overcorrects. The arm is heavier than even he expects.",
      ],
      victory: [
        "🔥 He sits down hard against the wall. The iron in his arm is dimming.",
        "🔥 The Iron-Hand falls. He smiles at you with old coal-eyes before they go out.",
      ],
      defeat: ["🔥 The iron arm closes once around your chest. The forge takes you."],
    },
  },

  era3_mini_stilledChoir: {
    id: "era3_mini_stilledChoir",
    name: "The Stilled Choir",
    icon: "🕯️",
    boss: true, tier: "mini", era: 3, kind: "demon",
    elementalGate: "memory",
    description: "A throng of voices that never finished a sentence. They want yours.",
    encounterChance: 0,
    requires: { hutBuilt: true, researched: "arcaneAwakening" },
    minGathersAfterGate: 0,
    combat: { hp: 80, acc: 0.88, eva: 0.20, damage: { min: 4, max: 8 }, damageType: "sanity", defenseHalf: true },
    defeatReward: { inventory: { fragments: 8 } },
    runeDrops: [ { resource: "malignVoidRune", chance: 0.20, qty: 1 }, { resource: "temporalRune", chance: 0.15, qty: 1 }, { resource: "monolithRune", chance: 0.15, qty: 1 } ],
    firstDefeatLog: "🥇 The Stilled Choir falls silent. The silence afterward is yours now, not theirs.",
    etching: "first_boss_era3",
    combatFlavor: {
      opener: [
        "🕯️ The air goes wrong. Voices that aren't voices try a chord.",
        "🕯️ Candles you never lit are burning at the corners of the room.",
        "🕯️ A hum starts in the back of your skull and becomes a small congregation around you.",
      ],
      attack: [
        "🕯️ The Choir tries a note that does not exist. {dmg} ◐.",
        "🕯️ They sing through you. Your hands forget what they were doing. {dmg} ◐.",
        "🕯️ A word lands in your head that was never yours. {dmg} ◐.",
      ],
      miss: [
        "🕯️ The chord breaks. The Choir resets.",
        "🕯️ You hum your own song over theirs. The note collapses.",
      ],
      victory: [
        "🕯️ The candles go out one by one. The Choir is gone.",
        "🕯️ The last voice finds its way out of you. You do not miss it.",
      ],
      defeat: ["🕯️ The Choir finishes the song. You sing the last line with them."],
    },
  },

  era3_main_lastForager: {
    id: "era3_main_lastForager",
    name: "The Last Forager",
    icon: "🪦",
    boss: true, tier: "main", era: 3, kind: "demon",
    elementalGate: "voidcall",
    description: "A figure walking out of the dust on the same path you walked in on. Wearing a hut on her back like a shell.",
    encounterChance: 0,
    requires: { hutBuilt: true, researched: "arcaneAwakening" },
    minGathersAfterGate: 0,
    combat: { hp: 160, acc: 0.85, eva: 0.15, damage: { min: 6, max: 11 }, damageType: "hp", defenseHalf: true },
    defeatReward: { inventory: { fragments: 15, food: 20, water: 10, stone: 20 } },
    runeDrops: [ { resource: "nullVoidRune", chance: 0.20, qty: 1 }, { resource: "archmageSigil", chance: 0.15, qty: 1 }, { resource: "starforgeRune", chance: 0.15, qty: 1 }, { resource: "annihilateRune", chance: 0.06, qty: 1 } ],
    firstDefeatLog: "🥇 The Last Forager falls. The stone in her hand goes quiet. The Awakened World is yours to walk.",
    etching: "first_boss_era3_main",
    combatFlavor: {
      opener: [
        "🪦 She comes down the path you came up. She looks like you, but older.",
        "🪦 The Last Forager. Carrying a hut on her back. Wearing your face the way someone wears a memory of a face.",
        "🪦 The dust parts around her. The stone in her hand hums.",
      ],
      attack: [
        "🪦 She knows where your guard is weak. {dmg} ❤️.",
        "🪦 She fights the way you would. {dmg} ❤️.",
        "🪦 You feel the strike before you see it — because you would have made it. {dmg} ❤️.",
      ],
      miss: [
        "🪦 She misses, the same way you would have missed.",
        "🪦 The stone in her hand pulses, then dims. The strike falls short.",
      ],
      victory: [
        "🪦 She kneels. The look is not anger. It is recognition.",
        "🪦 The Last Forager dies the way you would have wanted to.",
      ],
      defeat: ["🪦 She kneels over you and closes your eyes the way you would have closed them yourself."],
    },
  },
};

export const getBoss = (id) => BOSSES[id] || null;
export const getAllBosses = () => Object.values(BOSSES);
export const getBossesForEra = (era) => getAllBosses().filter((b) => b.era === era);

// Which bosses the player COULD challenge right now. Era is COMPUTED here
// inline (mirrors systems/era.js computeEra) since state.run.era is the
// stale schema default and never updates.
export const getBossesAvailable = (state) => {
  const r = state.run;
  let era = 0;
  if (r.rockAwakened && r.built?.hut) era = 1;
  if (era >= 1 && r.built?.firepit && r.researched?.foraging && r.researched?.fire && r.researched?.knapping) era = 2;
  if (era >= 2 && r.built?.forge && r.built?.home && r.researched?.smithing && r.researched?.fletching && r.toolsCrafted?.bow) era = 3;
  const studiesCompleted = r.studiesCompleted || {};
  return getAllBosses().filter((b) => {
    if (b.era > era) return false;
    if (b.requires?.researched && !r.researched?.[b.requires.researched]) return false;
    if (b.requires?.hasBuilding && !r.built?.[b.requires.hasBuilding]) return false;
    if (b.requires?.hutBuilt && !r.built?.hut) return false;
    if (b.elementalGate) {
      const anyMatch = Object.keys(studiesCompleted).some((sid) =>
        sid.startsWith(`${b.elementalGate}_`)
      );
      if (!anyMatch) return false;
    }
    return true;
  });
};
