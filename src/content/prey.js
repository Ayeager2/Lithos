// Prey definitions — DATA, not code. The HuntingView (#79) renders these
// as click-to-engage cards; auto-loop hunts repeat until the player picks
// a different card or stops. Drops accrue into a Pile of Goods.
//
// Shape mirrors content/mobs.js but uses `hunt` semantics instead of
// `combat`: prey aren't a fight, they're a stalk roll.
//   id, name, icon                  — identity
//   era                             — earliest era this prey appears
//   tier                            — "common" | "uncommon" | "rare"
//   encounterChance                 — weight in the era pool
//   difficulty                      — 0..1 chance the stalk fails
//   drops[]                         — { resource, qty:[min,max]|N, chance }
//   xp                              — hunting-skill XP on success
//   description                     — first-encounter blurb
//   huntFlavor                      — opener / success / fail line pools
//
// Era 1 prey are mundane (rabbit, sparrow). Era 2 introduces sturdier
// game (boar, marsh deer). Era 3 prey are the leavings of the corrupted
// world (ghost owl, pale stag, etc.) — the wasteland teaches you that
// even the meat carries something underneath.

export const PREY = {
  // ─── Era 1 ─────────────────────────────────────────────────────────
  dustRabbit: {
    id: "dustRabbit", name: "Dust Rabbit", icon: "🐇",
    era: 1, tier: "common", encounterChance: 1.0, difficulty: 0.3,
    description: "Quick, twitchy, all ribs. Half the meal is in the chase.",
    drops: [
      { resource: "food",    qty: [1, 2], chance: 0.95 },
      { resource: "hide",    qty: 1, chance: 0.5 },
      { resource: "fangs",   qty: 1, chance: 0.15 },
    ],
    xp: 3,
    huntFlavor: {
      opener: ["🐇 A flash of fur. The rabbit breaks for cover.", "🐇 You spot ears in the dust. Then they're gone."],
      success: ["🐇 You catch it mid-bound. Warm meat in the bag."],
      fail: ["🐇 The rabbit knew first. You stood too long."],
    },
  },

  windSparrow: {
    id: "windSparrow", name: "Wind Sparrow", icon: "🐦",
    era: 1, tier: "common", encounterChance: 0.85, difficulty: 0.45,
    description: "Small. Fast. Sings at dawn and doesn't stop.",
    drops: [
      { resource: "bird_meat", qty: 1, chance: 0.9 },
      { resource: "feathers",  qty: [1, 3], chance: 0.95 },
    ],
    xp: 4,
    huntFlavor: {
      opener: ["🐦 A sparrow lifts off the gorse, fast as a thrown stone."],
      success: ["🐦 You knock it from the air. Small. Enough."],
      fail: ["🐦 The wind takes it. You lower the bow."],
    },
  },

  carrionHare: {
    id: "carrionHare", name: "Carrion Hare", icon: "🐰",
    era: 1, tier: "uncommon", encounterChance: 0.6, difficulty: 0.4,
    description: "Bigger than the dust kind. Lean meat, real hide.",
    drops: [
      { resource: "food",      qty: [2, 3], chance: 0.95 },
      { resource: "hide",      qty: [1, 2], chance: 0.7 },
      { resource: "sinew",     qty: 1, chance: 0.5 },
    ],
    xp: 5,
    huntFlavor: {
      opener: ["🐰 A long-eared shape watches you from a flat rock."],
      success: ["🐰 The hare drops clean. A meal and then some."],
      fail: ["🐰 You blink and it's gone. The rock is empty."],
    },
  },

  graybackRat: {
    id: "graybackRat", name: "Grayback Rat", icon: "🐀",
    era: 1, tier: "common", encounterChance: 0.7, difficulty: 0.2,
    description: "Easy meat. Disappointing meat. Better than nothing.",
    drops: [
      { resource: "food",   qty: 1, chance: 0.9 },
      { resource: "fangs",  qty: 1, chance: 0.3 },
    ],
    xp: 1,
    huntFlavor: {
      opener: ["🐀 A grayback noses the dust between two stones."],
      success: ["🐀 One quick strike. Done."],
      fail: ["🐀 It slips into a burrow before you commit."],
    },
  },

  // ─── Era 1 bird tier (#175) ────────────────────────────────────────
  // Three birds layered around the existing Wind Sparrow. The two
  // "feedsOnGrubs" entries (dustWren + scrubFinch) interact with the
  // carrion-flock pest: when birdFlock is active, their drop chance
  // bumps and they roll a bonus grubs drop. (Their food source is also
  // out — pests bring opportunity.)
  dustWren: {
    id: "dustWren", name: "Dust Wren", icon: "🐤",
    era: 1, tier: "common", encounterChance: 0.95, difficulty: 0.3,
    description: "Tiny, brown, never still. The kind of bird that disappears into a thornbush before you blink.",
    drops: [
      { resource: "feathers",  qty: [1, 2], chance: 0.95 },
      { resource: "bird_meat", qty: 1, chance: 0.6 },
    ],
    xp: 2,
    feedsOnGrubs: true,
    huntFlavor: {
      opener: ["🐤 A wren bobs on a dry stem, watching you sideways."],
      success: ["🐤 The stone finds. Small body, smaller meal."],
      fail: ["🐤 The wren is already three branches over. Then gone."],
    },
  },

  scrubFinch: {
    id: "scrubFinch", name: "Scrub Finch", icon: "🐥",
    era: 1, tier: "uncommon", encounterChance: 0.55, difficulty: 0.5,
    description: "Striped chest, sharp beak. Nests low in the scrub and guards its eggs like a dog.",
    drops: [
      { resource: "feathers",  qty: [2, 4], chance: 0.95 },
      { resource: "bird_meat", qty: [1, 2], chance: 0.8 },
      { resource: "bird_eggs", qty: [1, 2], chance: 0.45 },
    ],
    xp: 5,
    feedsOnGrubs: true,
    huntFlavor: {
      opener: ["🐥 The finch sees you and goes still — that's when you know the nest is close."],
      success: ["🐥 The finch falls. You take the nest too. The eggs are warm."],
      fail: ["🐥 The finch leads you the wrong way, the way a parent does. The nest stays hidden."],
    },
  },

  gristleVulture: {
    id: "gristleVulture", name: "Gristle Vulture", icon: "🦅",
    era: 1, tier: "rare", encounterChance: 0.3, difficulty: 0.7,
    description: "Bald head, wet eye, a smell that arrives before it does. Apex of the carrion line — the bird the smaller flocks scatter for.",
    drops: [
      { resource: "bird_meat", qty: [2, 4], chance: 0.95 },
      { resource: "feathers",  qty: [3, 6], chance: 1.0 },
      { resource: "sinew",     qty: [1, 2], chance: 0.65 },
      { resource: "fragments", qty: 1, chance: 0.10 },
    ],
    xp: 9,
    huntFlavor: {
      opener: ["🦅 The vulture lands heavy on a stone. It looks at you the way it looks at the dead."],
      success: ["🦅 The arrow finds the breast. The vulture falls without sound."],
      fail: ["🦅 The vulture lifts off, slow as guilt, and circles. Watching. Waiting."],
    },
  },

  // ─── Era 2 ─────────────────────────────────────────────────────────
  marshDeer: {
    id: "marshDeer", name: "Marsh Deer", icon: "🦌",
    era: 2, tier: "uncommon", encounterChance: 0.55, difficulty: 0.55,
    description: "Antlers thin as winter. Patient. They've outlasted worse than you.",
    drops: [
      { resource: "food",   qty: [3, 5], chance: 1.0 },
      { resource: "hide",   qty: [1, 2], chance: 0.9 },
      { resource: "sinew",  qty: [1, 2], chance: 0.8 },
      { resource: "fangs",  qty: 1, chance: 0.2 },
    ],
    xp: 8,
    huntFlavor: {
      opener: ["🦌 The deer lifts its head from the reeds. It heard you a mile out."],
      success: ["🦌 A clean shot through the ribs. The deer kneels into the marsh."],
      fail: ["🦌 The herd breaks. You catch only sound — bodies through reeds."],
    },
  },

  wastelandBoar: {
    id: "wastelandBoar", name: "Wasteland Boar", icon: "🐗",
    era: 2, tier: "uncommon", encounterChance: 0.5, difficulty: 0.65,
    description: "Tusks longer than a hand. The hunt that hunts back.",
    drops: [
      { resource: "food",   qty: [4, 6], chance: 1.0 },
      { resource: "hide",   qty: [2, 3], chance: 0.95 },
      { resource: "fangs",  qty: [1, 2], chance: 0.7 },
      { resource: "sinew",  qty: [1, 2], chance: 0.6 },
    ],
    xp: 12,
    huntFlavor: {
      opener: ["🐗 The boar charges from the brush. No warning."],
      success: ["🐗 You drop it after the third strike. Your arm shakes."],
      fail: ["🐗 You miss the killing angle. It runs you back across the field."],
    },
  },

  pondCrane: {
    id: "pondCrane", name: "Pond Crane", icon: "🪶",
    era: 2, tier: "uncommon", encounterChance: 0.45, difficulty: 0.5,
    description: "Long-legged. Long-necked. Always watching something further off.",
    drops: [
      { resource: "bird_meat", qty: [2, 3], chance: 0.95 },
      { resource: "feathers",  qty: [3, 6], chance: 1.0 },
      { resource: "hollow_bone", qty: [1, 2], chance: 0.6 },
    ],
    xp: 7,
    huntFlavor: {
      opener: ["🪶 A crane unfolds from the pond, slow as a sail going up."],
      success: ["🪶 The bird falls into the water and is still. You wade for it."],
      fail: ["🪶 It catches the wind first. The pond keeps its secret."],
    },
  },

  // ─── Era 3 ─────────────────────────────────────────────────────────
  ghostOwl: {
    id: "ghostOwl", name: "Ghost Owl", icon: "🦉",
    era: 3, tier: "rare", encounterChance: 0.35, difficulty: 0.6,
    description: "White as a tooth. Doesn't blink. The forest goes quiet when it lands.",
    drops: [
      { resource: "bird_meat",  qty: [1, 2], chance: 0.6 },
      { resource: "feathers",   qty: [3, 6], chance: 1.0 },
      { resource: "hollow_bone", qty: [1, 2], chance: 0.8 },
      { resource: "spirit_essence", qty: 1, chance: 0.25 },
    ],
    xp: 14,
    appliesStatus: { id: "sanity", magnitude: -2, chance: 0.2 },
    huntFlavor: {
      opener: ["🦉 The owl is already looking at you. It has been, for a while."],
      success: ["🦉 The owl falls without sound. Your ears keep ringing."],
      fail: ["🦉 The owl vanishes between two breaths. The forest goes loud again."],
    },
  },

  paleStag: {
    id: "paleStag", name: "Pale Stag", icon: "🦌",
    era: 3, tier: "rare", encounterChance: 0.25, difficulty: 0.75,
    description: "Antlers like dead branches, eyes too far apart. Not a deer. Not anymore.",
    drops: [
      { resource: "food",    qty: [3, 5], chance: 0.9 },
      { resource: "hide",    qty: [2, 3], chance: 0.95 },
      { resource: "void_bone", qty: 1, chance: 0.4 },
      { resource: "spirit_essence", qty: [1, 2], chance: 0.3 },
    ],
    xp: 18,
    appliesStatus: { id: "sanity", magnitude: -3, chance: 0.3 },
    huntFlavor: {
      opener: ["🦌 The stag turns to face you. Its eyes are wrong."],
      success: ["🦌 The stag falls. The herd you didn't see vanishes."],
      fail: ["🦌 The stag walks into the trees. The trees close behind it."],
    },
  },

  hollowFox: {
    id: "hollowFox", name: "Hollow Fox", icon: "🦊",
    era: 3, tier: "uncommon", encounterChance: 0.4, difficulty: 0.55,
    description: "Smaller inside than it looks. Light shows through the eye-shine wrong.",
    drops: [
      { resource: "food",    qty: [1, 2], chance: 0.6 },
      { resource: "hide",    qty: 1, chance: 0.85 },
      { resource: "shadow_dust", qty: [1, 2], chance: 0.5 },
    ],
    xp: 10,
    huntFlavor: {
      opener: ["🦊 A fox watches from the rocks. Tail flicks. Doesn't run."],
      success: ["🦊 The fox falls. Its hide weighs less than it should."],
      fail: ["🦊 The fox blinks once and isn't there."],
    },
  },
};

export const getPrey = (id) => PREY[id] || null;
export const getAllPrey = () => Object.values(PREY);
export const getPreyForEra = (era) =>
  getAllPrey().filter((p) => (p.era || 1) <= era);
