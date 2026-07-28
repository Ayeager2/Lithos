// Building definitions — DATA, not code.

export const BUILDING_CATEGORIES = {
  shelter:     { id: "shelter",     name: "Shelter",     order: 1 },
  comfort:     { id: "comfort",     name: "Comfort",     order: 2 },
  tools:       { id: "tools",       name: "Tools",       order: 3 },
  industry:    { id: "industry",    name: "Industry",    order: 4 },
  arcane:      { id: "arcane",      name: "Arcane",      order: 5 },
  sovereignty: { id: "sovereignty", name: "Sovereignty", order: 6 },
  cosmos:      { id: "cosmos",      name: "Cosmos",      order: 7 },
};

export const BUILDINGS = {
  hut: {
    id: "hut", name: "Hut", icon: "🛖", category: "shelter",
    description: "A simple shelter of stone and wood.",
    cost: { wood: 50, stone: 25, water: 2 },
    requires: { rockAwakened: true },
    effect: { gatherBonus: 1, gatherSpeedup: 150 },
    housing: 1, // #182 — first villager (you).
    effectSummary: "+1 gather yield · -150ms gather cooldown · activates survival · houses 1.",
    onBuiltMessage: "You raise a small hut from gathered timber and stone. The wasteland is no longer empty.",
    whisperOnAvailable: "The stone whispers: shelter, warmth, a place to call your own. Build a hut.",
    whisperOnBuilt: "The stone whispers: there are skills to learn. Listen, and the world will open.",
    tier: 1, col: 0, parents: [],
  },

  // #182 — Era 1 housing extension. Cheap, +1 capacity. Lets the
  // settlement scale beyond just the hut.
  lean_to: {
    id: "lean_to", name: "Lean-to", icon: "⛺", category: "shelter",
    description: "Branches against a stone, a hide thrown over. Not much, but a place out of the wind.",
    cost: { wood: 20, stone: 5, hide: 1 },
    requires: { hasBuilding: "hut" },
    effect: {},
    housing: 1,
    effectSummary: "+1 housing — room for one more villager.",
    onBuiltMessage: "⛺ The lean-to leans true. Someone could live here now.",
    whisperOnBuilt: "The stone whispers: a place for one more. The settlement begins.",
    tier: 2, col: -1, parents: ["hut"],
  },

  // Era 2 cottage — proper roofed dwelling, +3.
  cottage: {
    id: "cottage", name: "Cottage", icon: "🏠", category: "shelter",
    description: "Daub walls, thatched roof, a real hearth. Three can sleep under it, more if the floor is clean.",
    cost: { wood: 80, stone: 40, water_muddy: 4, hide: 2 },
    requires: { researched: "home", hasBuilding: "home" },
    effect: {},
    housing: 3,
    effectSummary: "+3 housing — a cottage holds a small family.",
    onBuiltMessage: "🏠 You raise the cottage. The thatch settles. Three more can live here now.",
    whisperOnBuilt: "The stone whispers: walls thick enough to keep the cold and quiet enough to keep the dreams.",
    tier: 6, col: 3, parents: ["home"],
  },

  // ─── Era 2 production (#183) ───────────────────────────────────────
  // Each building has a productionRecipe (or perVillager passive) that
  // ticks via systems/town.js tickRecipeProduction. Output scales with
  // assigned villagers (auto-staffed from idle pop, capped by staffSlots).
  sawmill: {
    id: "sawmill", name: "Sawmill", icon: "🪚", category: "production",
    description: "A pit and a saw. Two strong arms above, one below. Wood comes out faster than the forest can run from you.",
    cost: { wood: 60, stone: 30, hide: 2 },
    requires: { researched: "home", hasBuilding: "home" },
    effect: {},
    staffSlots: 2,
    productionRecipe: { input: {}, output: { wood: 2 }, perVillagerPerMinute: 1 },
    effectSummary: "Each villager produces +2 wood / minute. Staff up to 2.",
    onBuiltMessage: "🪚 The sawmill stands. The first plank falls.",
    tier: 6, col: 4, parents: ["home"],
  },

  quarry: {
    id: "quarry", name: "Quarry", icon: "⛰️", category: "production",
    description: "A cut into the hillside. The stone shows its grain. Patient work, hard work.",
    cost: { wood: 40, stone: 80 },
    requires: { researched: "home", hasBuilding: "home" },
    effect: {},
    staffSlots: 2,
    productionRecipe: { input: {}, output: { stone: 2 }, perVillagerPerMinute: 1 },
    effectSummary: "Each villager produces +2 stone / minute. Staff up to 2.",
    onBuiltMessage: "⛰️ The first cut into the cliff. The hill bleeds stone.",
    tier: 6, col: 5, parents: ["home"],
  },

  bakery: {
    id: "bakery", name: "Bakery", icon: "🍞", category: "production",
    description: "Stone oven, wooden trough. The first warm thing that wasn't survival.",
    cost: { wood: 50, stone: 60, water_muddy: 5 },
    requires: { researched: "home", hasBuilding: "home" },
    effect: {},
    staffSlots: 1,
    productionRecipe: { input: { food: 2 }, output: { bread: 1 }, perVillagerPerMinute: 1 },
    effectSummary: "Converts 2 food → 1 bread per villager per minute (bread is 10× more nutritious + keeps longer).",
    onBuiltMessage: "🍞 The oven warms. The first loaf comes out dark and dense and warm.",
    tier: 7, col: 4, parents: ["cottage"],
  },

  tannery: {
    id: "tannery", name: "Tannery", icon: "🟫", category: "production",
    description: "A row of pits, a row of frames. Smells worse than it looks. Looks worse than it smells.",
    cost: { wood: 40, stone: 20, hide: 4 },
    requires: { researched: "home", hasBuilding: "home" },
    effect: {},
    staffSlots: 1,
    productionRecipe: { input: { hide: 1 }, output: { leather: 1 }, perVillagerPerMinute: 1 },
    effectSummary: "Converts 1 hide → 1 leather per villager per minute.",
    onBuiltMessage: "🟫 The tannery stands. The first hide goes in. The wait begins.",
    tier: 7, col: 5, parents: ["cottage"],
  },

  brewery: {
    id: "brewery", name: "Brewery", icon: "🍺", category: "production",
    description: "Vats and pipes. A patience that makes water do unexpected things.",
    cost: { wood: 70, stone: 50, water_boiled: 5, food: 5 },
    requires: { researched: "home", hasBuilding: "home" },
    effect: {},
    staffSlots: 1,
    productionRecipe: { input: { water_boiled: 1, food: 1 }, output: { ale: 1 }, perVillagerPerMinute: 0.5 },
    effectSummary: "Converts 1 boiled water + 1 food → 1 ale per villager per 2 minutes.",
    onBuiltMessage: "🍺 The first batch ferments slow. The first cup is the best one.",
    tier: 7, col: 6, parents: ["cottage"],
  },

  firepit: {
    id: "firepit", name: "Fire Pit", icon: "🔥", category: "comfort",
    description: "A ring of stones and a hollow of ember. The cold no longer rules you here.",
    cost: { wood: 8, stone: 10 },
    requires: { researched: "fire" },
    effect: { gatherBonus: 1, gatherSpeedup: 100 },
    effectSummary: "+1 gather yield · -100ms gather cooldown · +20 rest recovery",
    onBuiltMessage: "You strike sparks until something catches. The fire watches you back.",
    whisperOnBuilt: "The stone whispers: the cold is no longer your master. What else will you ask of the world?",
    tier: 2, col: 0, parents: ["hut"],
  },

  // NOTE: keyed as `well` for backward-save-compat. Display name and
  // production are the Era-1 "Water Hole" (muddy water) — see ERA_PLAN.md
  // "Water tiers + dysentery". A later, cleaner Well building can be
  // introduced as the upgrade tier when Era 2+ filtration content lands.
  well: {
    id: "well", name: "Water Hole", icon: "🪣", category: "comfort",
    description: "A pit dug deep, lined with stone. The earth holds water in its bones — what comes up is muddy, but it comes up.",
    cost: { wood: 30, stone: 40 },
    requires: { researched: "waterCarrying" },
    effect: {},
    passiveProduce: { water_muddy: { perMinute: 1 } },
    effectSummary: "+1 muddy water / minute — passive trickle, even while away.",
    onBuiltMessage: "🪣 The water hole goes deep. Muddy water seeps in slow.",
    whisperOnBuilt: "The stone whispers: the earth has been thirsty too. What you draw from it carries the dust.",
    tier: 3, col: 0, parents: ["hut"],
  },

  garden: {
    id: "garden", name: "Garden", icon: "🌱", category: "comfort",
    description: "A patch of soil, turned and tended. Grubs nest where the dirt is loosened.",
    cost: { wood: 25, stone: 15, water: 20, food: 10 },
    requires: { researched: "foraging" },
    effect: {},
    passiveProduce: { food: { perMinute: 3 } },
    effectSummary: "+3 grubs / minute · halved while a flock is feeding.",
    onBuiltMessage: "🌱 You break the dust into soil. Something pale wriggles up.",
    whisperOnBuilt: "The stone whispers: the dust remembers being a garden, once.",
    tier: 3, col: 1, parents: ["hut"],
  },

  forge: {
    id: "forge", name: "Forge", icon: "⚒️", category: "industry",
    description: "Stones stacked into a hollow. Coal and bellows. Heat enough to soften the world's hardest pieces.",
    cost: { stone: 80, wood: 50, water: 10 },
    requires: { researched: "smithing" },
    effect: {},
    effectSummary: "Required for Era 2 tools (Stone Axe, Pickaxe, Bone Knife, Bow).",
    onBuiltMessage: "⚒️ The forge takes shape. The first heat rises. The wasteland's old shapes give way.",
    whisperOnBuilt: "The stone whispers: now there is no edge the world can hold against you that you cannot break.",
    tier: 5, col: 0, parents: ["firepit"],
  },

  cairn: {
    id: "cairn", name: "Cairn", icon: "🗿", category: "shelter",
    description: "A stacked-stone cellar dug half into the dust. Holds what you would otherwise lose.",
    cost: { wood: 30, stone: 50 },
    requires: { researched: "hiddenStores" },
    effect: {},
    storageCaps: {
      wood: 50, stone: 50,
      // Water-tier ladder (see resources.js): muddy is the main Era-1 storage
      // target; stagnant should be drunk/used quickly; boiled is rare.
      water_muddy: 20, water_stagnant: 10, water_boiled: 5,
      food: 15, bird_meat: 10, feathers: 20,
    },
    effectSummary: "+50 wood/stone · +20 muddy water · +10 stagnant · +5 boiled · +15 grubs · +10 bird meat · +20 feathers — caps raised.",
    onBuiltMessage: "🗿 You stack the cairn slow, fitting stone to stone.",
    whisperOnBuilt: "The stone whispers: keeping is its own kind of work.",
    tier: 4, col: 0, parents: ["hut"],
  },

  home: {
    id: "home", name: "Home", icon: "🏡", category: "shelter",
    description: "Daub and timber. Rough thatching. A door that closes. Not a place you sleep — a place you live.",
    cost: { wood: 60, stone: 50, water: 5 },
    requires: { researched: "home" },
    effect: { gatherBonus: 1, restBonus: { energy: 10, happiness: 3, sanity: 2 } },
    housing: 2, // #182 — fits a small family.
    effectSummary: "+1 gather yield · Rest restores more here · Resolve & Sanity boost on build · houses 2.",
    onBuiltMessage: "🏡 You raise a true house. The roof sets. The door swings true.",
    whisperOnBuilt: "The stone whispers: now you have a place to return to. Even the wasteland respects that.",
    tier: 5, col: 1, parents: ["hut"],
  },

  walls: {
    id: "walls", name: "Stone Walls", icon: "🧱", category: "shelter",
    description: "Stacked stone, packed earth. Low at first, then waist-high. The wasteland gets in slower now.",
    cost: { stone: 100, wood: 30 },
    requires: { researched: "home", hasBuilding: "home" },
    effect: { defense: 3, foodStealReduction: 2 },
    effectSummary: "+3 defense vs. threats · -2 food stolen per raid.",
    onBuiltMessage: "🧱 You stack the wall slow, lifting each stone until your shoulders burn.",
    whisperOnBuilt: "The stone whispers: a line drawn against the dust. They will still come — but slower, now.",
    tier: 6, col: 0, parents: ["home"],
  },

  silo: {
    id: "silo", name: "Rudimentary Silo", icon: "🏚️", category: "shelter",
    description: "Stones laid in a ring, a wooden lid above. Cool air settles inside. What you store keeps longer.",
    cost: { stone: 50, wood: 40 },
    requires: { researched: "home", hasBuilding: "home" },
    effect: { spoilageMultiplier: 0.7 },
    storageCaps: { food: 30, bird_meat: 20 },
    effectSummary: "+30 grubs · +20 bird meat caps · food spoils ~30% slower.",
    onBuiltMessage: "🏚️ You ring the silo with stone and seal the lid. The food keeps longer here.",
    whisperOnBuilt: "The stone whispers: keeping is more than holding. Keeping is patience.",
    tier: 6, col: 1, parents: ["home", "garden"],
  },

  farmhouse: {
    id: "farmhouse", name: "Rudimentary Farmhouse", icon: "🏘️", category: "shelter",
    description: "Rough timber framing. A hearth at the heart of it. The earth here knows you now.",
    cost: { stone: 30, wood: 60, food: 5 },
    requires: { researched: "home", hasBuilding: "home" },
    effect: { gardenBoost: 0.5 },
    passiveProduce: { wood: { perMinute: 0.5 } },
    effectSummary: "+50% Garden output · +0.5 wood / minute (scrub clearing).",
    onBuiltMessage: "🏘️ You frame the farmhouse, raise the hearth, and stand in the doorway.",
    whisperOnBuilt: "The stone whispers: now the dust remembers you. The soil pays attention.",
    tier: 6, col: 2, parents: ["home", "garden"],
  },

  alembic: {
    id: "alembic", name: "Alembic", icon: "⚗️", category: "arcane",
    description: "Copper kettle, glass coil. Heat and patience and a hand steadier than your own. What enters as water leaves as something else.",
    cost: { stone: 30, wood: 30, fragments: 5 },
    requires: { researched: "alchemy", hasBuilding: "forge" },
    effect: {},
    effectSummary: "Required for brewing potions (Mending, Stillness, Spirit Draught).",
    onBuiltMessage: "⚗️ The Alembic stands. The coil catches the firelight and bends it strange.",
    whisperOnBuilt: "The stone whispers: now you can make what the world will not give.",
    tier: 7, col: 0, parents: ["forge"],
  },

  // ─── Era 2 deepening — Stone Altar ──────────────────────────────────
  // Gate to Arcane Studies (see ERA_PLAN.md). A flat-topped stone you
  // raise inside your home, knee-high. The stone — your stone — sits on
  // it. Passive sanity + spirit trickle while it stands. Later, this is
  // where timed magic study happens (Tasks #27, #30) and where weapon
  // enchants get applied (Task #37).
  //
  // Etching milestones: as you complete major milestones (huts built,
  // tools crafted, awakening, future studies completed), the altar
  // accrues etchings on its surface — see persistent.altarEtchings
  // (introduced when the etching system lands).
  stoneAltar: {
    id: "stoneAltar", name: "Stone Altar", icon: "🕯️", category: "arcane",
    description: "Flat-topped stone, knee-high, polished smooth. The stone — your stone — sits on it now. When you sit with it, the world goes quiet. The lessons that take real time live here.",
    cost: { stone: 80, wood: 40, fragments: 5 },
    requires: { researched: "altarWork", hasBuilding: "home" },
    effect: { sanityPerMinute: 0.2, spiritPerMinute: 0.1 },
    effectSummary: "+0.2 sanity / min · +0.1 spirit / min · gates Arcane Studies (later).",
    onBuiltMessage: "🕯️ The Altar takes shape — flat stone, polished, knee-high. You set the stone on it. It looks at you, then closes its eye.",
    whisperOnBuilt: "The stone whispers: now there is a place. Sit with me. There is work that does not end when you stand up.",
    tier: 6, col: 3, parents: ["home"],
  },

  // ─── Era 3 magical production (#184) ──────────────────────────────
  // Each gates on Stone Altar + Era 3-tier research. They reuse the
  // productionRecipe + staffSlots schema from #183 (sawmill etc.) — the
  // same tick handles arcane and mundane production.
  apothecary: {
    id: "apothecary", name: "Apothecary", icon: "🧪", category: "production",
    description: "Glass alembics catch the firelight. The smell is bitter and faintly sweet. The wares heal, when they work.",
    cost: { wood: 60, stone: 50, fragments: 8, water_boiled: 5 },
    requires: { researched: "altarWork", hasBuilding: "stoneAltar" },
    effect: {},
    staffSlots: 1,
    productionRecipe: { input: { fragments: 2, food: 3, water_muddy: 2 }, output: { potionMending: 1 }, perVillagerPerMinute: 0.2 },
    effectSummary: "1 villager: 2 fragments + 3 food + 2 muddy water → 1 Potion of Mending per 5 min.",
    onBuiltMessage: "🧪 The apothecary stands. The first vial steams.",
    tier: 8, col: 1, parents: ["stoneAltar"],
  },

  scriptorium: {
    id: "scriptorium", name: "Scriptorium", icon: "📜", category: "production",
    description: "Long benches under the window-light. Pen-strokes that are not all yours. Knowledge made portable.",
    cost: { wood: 80, stone: 40, ink: 3, torn_page: 5 },
    requires: { researched: "altarWork", hasBuilding: "stoneAltar" },
    effect: {},
    staffSlots: 1,
    productionRecipe: { input: { torn_page: 2, ink: 1 }, output: { scroll: 1 }, perVillagerPerMinute: 0.25 },
    effectSummary: "1 villager: 2 torn pages + 1 ink → 1 scroll per 4 min.",
    onBuiltMessage: "📜 The scriptorium is set. The first page is bound.",
    tier: 8, col: 2, parents: ["stoneAltar"],
  },

  runeForge: {
    id: "runeForge", name: "Rune Forge", icon: "🪬", category: "production",
    description: "Cold fire, hot stone. A villager who can hold a chisel and a name can leave both on the world.",
    cost: { stone: 100, wood: 60, fragments: 10, iron: 4 },
    requires: { researched: "altarWork", hasBuilding: "stoneAltar" },
    effect: {},
    staffSlots: 1,
    productionRecipe: { input: { fragments: 4, stone: 3 }, output: { splinterRune: 1 }, perVillagerPerMinute: 0.1 },
    effectSummary: "1 villager: 4 fragments + 3 stone → 1 Splinter Rune per 10 min.",
    onBuiltMessage: "🪬 The rune forge stands. The first rune cools blue.",
    tier: 8, col: 3, parents: ["stoneAltar"],
  },

  // Pure passive trickle — like the Stone Altar itself, this building
  // contributes via building.effect.spiritPerMinute (read by
  // systems/passive.js getBuildingStatRates). No staffing needed.
  spiritCenserWorkshop: {
    id: "spiritCenserWorkshop", name: "Spirit Censer Workshop", icon: "🪔", category: "arcane",
    description: "Hanging censers that swing without wind. Each breath the room takes returns a little of itself to you.",
    cost: { wood: 60, stone: 50, fragments: 6, sinew: 3 },
    requires: { researched: "altarWork", hasBuilding: "stoneAltar" },
    effect: { spiritPerMinute: 0.5 },
    effectSummary: "+0.5 spirit / min — passive, no staffing required.",
    onBuiltMessage: "🪔 The censers hang. The smoke that rises is not all from the burning.",
    tier: 8, col: 4, parents: ["stoneAltar"],
  },

  temple: {
    id: "temple", name: "Temple", icon: "⛪", category: "arcane",
    description: "Stone pillars at the head of the village. A place for the things that have no name. The walls hold a quiet that hands cannot.",
    cost: { stone: 200, wood: 100, fragments: 15, hide: 5 },
    requires: { researched: "altarWork", hasBuilding: "stoneAltar" },
    effect: { sanityPerMinute: 0.8 },
    effectSummary: "+0.8 sanity / min — passive. The settlement breathes easier.",
    onBuiltMessage: "⛪ The temple stands. The first night under it, the dreams are kinder.",
    tier: 8, col: 5, parents: ["stoneAltar"],
  },

  // ─── Era 2/3 civic buildings (#189) ───────────────────────────────
  // Non-production support: defense, faster pop growth, trade,
  // research/study speedup. Each plugs into an existing system hook.
  watchtower: {
    id: "watchtower", name: "Watchtower", icon: "🗼", category: "comfort",
    description: "Stone column at the settlement's edge. The first to see what comes; the first to ring the bell. Garrisons up to 3.",
    cost: { wood: 60, stone: 80, iron: 2 },
    requires: { researched: "home", hasBuilding: "walls" },
    effect: { defense: 5 },
    staffSlots: 3,
    effectSummary: "+5 defense + critical raid protection. Garrison up to 3 villagers as guards (each guard = 3 army points). Without this, raids sweep 90% of your inventory.",
    onBuiltMessage: "🗼 The watchtower stands. The horizon is no longer unobserved.",
    tier: 7, col: 0, parents: ["walls"],
  },

  mootHall: {
    id: "mootHall", name: "Moot Hall", icon: "🏛️", category: "comfort",
    description: "A roof over the gathering circle. People stay longer when they have somewhere to argue.",
    cost: { wood: 100, stone: 60, hide: 4, food: 10 },
    requires: { researched: "home", hasBuilding: "home" },
    effect: { populationGrowthMult: 1.5 },
    effectSummary: "Population grows 50% faster while this stands.",
    onBuiltMessage: "🏛️ The moot hall is built. The first night, people stay later than they used to.",
    tier: 7, col: 7, parents: ["cottage"],
  },

  marketplace: {
    id: "marketplace", name: "Marketplace", icon: "🪙", category: "production",
    description: "Stalls under awnings. Hands change goods for coin. Coin changes hands again.",
    cost: { wood: 60, stone: 30, hide: 3, tarnished_coin: 5 },
    requires: { researched: "home", hasBuilding: "cottage" },
    effect: {},
    staffSlots: 1,
    productionRecipe: { input: { food: 5 }, output: { tarnished_coin: 1 }, perVillagerPerMinute: 1 },
    // #197 — trade route. Every cycleMs, if EACH listed resource has
    // more than `threshold` in inventory, exchange `take` of each for
    // `give` of the output. Surplus → coin pipeline.
    tradeRoute: {
      cycleMs: 5 * 60 * 1000,
      trades: [
        { take: { wood: 20 }, give: { tarnished_coin: 5 }, threshold: 40 },
        { take: { stone: 20 }, give: { tarnished_coin: 5 }, threshold: 40 },
        { take: { hide: 5 }, give: { tarnished_coin: 3 }, threshold: 10 },
      ],
    },
    effectSummary: "Converts 5 food → 1 tarnished coin / villager / minute. Plus every 5 min: trades surplus wood/stone/hide for coins.",
    onBuiltMessage: "🪙 The marketplace opens. By noon, the first deal is done.",
    tier: 7, col: 8, parents: ["cottage"],
  },

  university: {
    id: "university", name: "University", icon: "🎓", category: "arcane",
    description: "Halls of patient instruction. The lessons take less time when there is somewhere to take them.",
    cost: { wood: 150, stone: 120, fragments: 10, scroll: 3, ink: 2 },
    requires: { researched: "altarWork", hasBuilding: "scriptorium" },
    effect: { studySpeedMult: 1.25 },
    effectSummary: "Arcane Studies complete 25% faster while this stands.",
    onBuiltMessage: "🎓 The university opens. The first class fills the hall by morning.",
    tier: 9, col: 2, parents: ["scriptorium"],
  },

  // ─── Storage cap buildings (#194) ──────────────────────────────
  granary: {
    id: "granary", name: "Granary", icon: "🌾", category: "comfort",
    description: "A raised, vented shed. Mice can't climb the stilts. The dry stays inside.",
    cost: { wood: 80, stone: 30, hide: 2 },
    requires: { researched: "home", hasBuilding: "home" },
    effect: {},
    storageCaps: { food: 50, bread: 20, bird_meat: 15, bird_eggs: 10 },
    effectSummary: "+50 food, +20 bread, +15 bird meat, +10 eggs storage cap.",
    onBuiltMessage: "🌾 The granary is up. The first sacks go in.",
    tier: 7, col: 9, parents: ["home"],
  },

  cistern: {
    id: "cistern", name: "Cistern", icon: "🪣", category: "comfort",
    description: "Stone-lined, lidded, deeper than a man stands. Water that goes in stays drinkable longer.",
    cost: { stone: 100, wood: 30 },
    requires: { researched: "home", hasBuilding: "well" },
    effect: {},
    storageCaps: { water_muddy: 30, water_boiled: 20, water_stagnant: 10 },
    effectSummary: "+30 muddy, +20 boiled, +10 stagnant water storage cap.",
    onBuiltMessage: "🪣 The cistern fills slow. The water keeps.",
    tier: 7, col: 10, parents: ["well"],
  },

  lumberStack: {
    id: "lumberStack", name: "Lumber Stack", icon: "🪵", category: "comfort",
    description: "Stacked square and roofed. The wood dries instead of rotting.",
    cost: { wood: 30, stone: 20 },
    requires: { hasBuilding: "hut" },
    effect: {},
    storageCaps: { wood: 50 },
    effectSummary: "+50 wood storage cap.",
    onBuiltMessage: "🪵 The lumber stack is squared. The wood will keep.",
    tier: 3, col: 7, parents: ["hut"],
  },

  mint: {
    id: "mint", name: "Mint", icon: "💰", category: "arcane",
    description: "A small forge. Smaller hammers. The coins come out marked and bright.",
    cost: { stone: 100, iron: 6, fragments: 8 },
    requires: { researched: "altarWork", hasBuilding: "marketplace" },
    effect: {},
    passiveProduce: { tarnished_coin: { perMinute: 0.5 } },
    effectSummary: "+0.5 tarnished coin / minute — passive, no staffing.",
    onBuiltMessage: "💰 The mint stamps its first coin. The metal rings.",
    tier: 9, col: 3, parents: ["marketplace"],
  },

  // ─── Era 4 — Arcane Industry (#206 / #207) ─────────────────────────
  aetherFoundry: {
    id: "aetherFoundry", name: "Aether Foundry", icon: "🔥", category: "production",
    description: "Cold fires in lined crucibles. The metal that comes out is heavier than the metal that went in.",
    cost: { stone: 200, iron: 20, fragments: 30, wood: 80 },
    requires: { researched: "altarWork", hasBuilding: "forge", era: 4 },
    effect: {},
    staffSlots: 2,
    productionRecipe: { input: { fragments: 3, iron: 1 }, output: { aether_iron: 1 }, perVillagerPerMinute: 0.4 },
    tradeRoute: { cycleMs: 8 * 60 * 1000, trades: [ { take: { aether_iron: 5 }, give: { tarnished_coin: 12 }, threshold: 10 } ] },
    effectSummary: "Smelts 3 fragments + 1 iron -> 1 aether iron / villager / min.",
    onBuiltMessage: "🔥 The Aether Foundry catches.",
    tier: 10, col: 0, parents: ["forge"],
  },
  conduitArray: {
    id: "conduitArray", name: "Conduit Array", icon: "⚡", category: "arcane",
    description: "Copper-wound posts in a hexagram. The hum is constant.",
    cost: { stone: 120, iron: 12, fragments: 25, aether_iron: 4 },
    requires: { hasBuilding: "stoneAltar", era: 4 },
    effect: { spiritPerMinute: 3, worldScorePerMinute: -0.5 },
    effectSummary: "+3 spirit / min · -0.5 worldScore / min.",
    onBuiltMessage: "⚡ The Conduit Array hums.",
    tier: 10, col: 1, parents: ["stoneAltar"],
  },
  automatonBay: {
    id: "automatonBay", name: "Automaton Bay", icon: "🤖", category: "production",
    description: "Long workbenches. Pieces that move when no one is touching them.",
    cost: { iron: 25, aether_iron: 6, fragments: 15, wood: 60 },
    requires: { hasBuilding: "forge", era: 4 },
    effect: { artificeBypass: 4 },
    staffSlots: 4,
    effectSummary: "Each staffed slot becomes an artificed laborer (no food/water/wood consumption).",
    onBuiltMessage: "🤖 The Automaton Bay opens.",
    tier: 10, col: 2, parents: ["forge"],
  },
  echoMill: {
    id: "echoMill", name: "Echo Mill", icon: "🌀", category: "production",
    description: "Stone wheels that turn whether the wind blows or not.",
    cost: { stone: 100, wood: 70, fragments: 12, iron: 6 },
    requires: { hasBuilding: "bakery", era: 4 },
    effect: { moralePerMinute: -0.1 },
    staffSlots: 1,
    productionRecipe: { input: { fragments: 1, food: 1 }, output: { ration: 1 }, perVillagerPerMinute: 1 },
    effectSummary: "1 villager: 1 fragment + 1 food -> 1 ration / min. -0.1 morale/min.",
    onBuiltMessage: "🌀 The Echo Mill turns.",
    tier: 10, col: 3, parents: ["bakery"],
  },
  councilHall: {
    id: "councilHall", name: "Council Hall", icon: "🏛️", category: "comfort",
    description: "A long building with a slate roof.",
    cost: { stone: 200, wood: 120, iron: 8, fragments: 10 },
    requires: { hasBuilding: "mootHall", era: 4 },
    effect: { populationGrowthMult: 1.25 },
    housing: 5,
    effectSummary: "+25% population growth · +5 housing · gates Era 4 companions.",
    onBuiltMessage: "🏛️ The Council Hall opens.",
    tier: 10, col: 4, parents: ["mootHall"],
  },
  universityWing: {
    id: "universityWing", name: "University Wing", icon: "🎓", category: "arcane",
    description: "A second hall, an upper gallery.",
    cost: { stone: 180, wood: 100, fragments: 20, scroll: 5, ink: 4, aether_iron: 2 },
    requires: { hasBuilding: "university", era: 4 },
    effect: { studySpeedMult: 1.2 },
    effectSummary: "x1.20 study speed.",
    onBuiltMessage: "🎓 The University Wing opens.",
    tier: 11, col: 2, parents: ["university"],
  },
  ironBastion: {
    id: "ironBastion", name: "Iron Bastion", icon: "🏰", category: "comfort",
    description: "Black iron-bound stone.",
    cost: { stone: 300, iron: 30, aether_iron: 6, wood: 80 },
    requires: { hasBuilding: "watchtower", era: 4 },
    effect: { defense: 10, raidLossMult: 0.20 },
    staffSlots: 5,
    effectSummary: "+10 defense · raid sweep cut to 0.20x. Garrison up to 5.",
    onBuiltMessage: "🏰 The Iron Bastion is finished.",
    tier: 11, col: 0, parents: ["watchtower"],
  },
  sigilWards: {
    id: "sigilWards", name: "Sigil Wards", icon: "🛡️", category: "arcane",
    description: "Carved posts at the settlement's corners.",
    cost: { stone: 80, fragments: 25, aether_iron: 4, ink: 5 },
    requires: { hasBuilding: "stoneAltar", era: 4 },
    effect: { raidFrequencyMult: 0.85, raidSweepReduction: 0.20 },
    effectSummary: "Raids fire 15% less often · sweeps reduced by additional 20%.",
    onBuiltMessage: "🛡️ The Sigil Wards are set.",
    tier: 11, col: 1, parents: ["stoneAltar"],
  },
  summoningCircle: {
    id: "summoningCircle", name: "Summoning Circle", icon: "🪐", category: "arcane",
    description: "A ring of inscribed stones.",
    cost: { stone: 100, aether_iron: 30, conduit_core: 5, fragments: 30 },
    requires: { hasBuilding: "stoneAltar", era: 4 },
    effect: {},
    effectSummary: "Required for any summoning ritual.",
    onBuiltMessage: "🪐 The Summoning Circle is set.",
    tier: 11, col: 3, parents: ["stoneAltar"],
  },
  // ═══════════════════════════════════════════════════════════════════
  // ── Era 5 — Eldritch Reckoning (#227) ──────────────────────────────
  // Path-flavored buildings + sanctuary + spire. Each path-building
  // slows the reckoning clock by 25% while standing.
  // ═══════════════════════════════════════════════════════════════════

  skyAnchor: {
    id: "skyAnchor", name: "Sky Anchor", icon: "🌌", category: "arcane",
    description: "Posts of aether iron reaching toward something high. The light bends around them; the night, when it comes, comes a little later. Mending-path.",
    cost: { aether_iron: 50, conduit_core: 20, fragments: 100, lightRune: 5 },
    requires: { hasBuilding: "summoningCircle", era: 5 },
    effect: { worldScorePerMinute: -1, clockSlowMult: 0.75 },
    effectSummary: "Mending-path. Drains 1 worldScore/min, but slows the reckoning clock by 25%.",
    onBuiltMessage: "🌌 The Sky Anchor stands. The light bends around it. The clock slows.",
    tier: 12, col: 0, parents: ["summoningCircle"],
  },

  blackGarden: {
    id: "blackGarden", name: "Black Garden", icon: "🌑", category: "arcane",
    description: "Soil that does not grow what is planted in it. The plants come up anyway. Communion-path.",
    cost: { aether_iron: 50, conduit_core: 20, fragments: 100, voidRune: 5 },
    requires: { hasBuilding: "summoningCircle", era: 5 },
    effect: { spiritPerMinute: 3, alignmentEvilPerMinute: 0.5, clockSlowMult: 0.75 },
    effectSummary: "Communion-path. +3 spirit/min, +0.5 evil alignment/min, slows the clock by 25%.",
    onBuiltMessage: "🌑 The Black Garden is planted. The villagers notice the green is wrong but cannot say why.",
    tier: 12, col: 1, parents: ["summoningCircle"],
  },

  bastionOfStone: {
    id: "bastionOfStone", name: "Bastion of Stone", icon: "🛡️", category: "comfort",
    description: "A wall of black stone twice as tall as a person. The wall does not need anyone to defend it; it watches. Defiance-path.",
    cost: { stone: 200, iron: 80, aether_iron: 30, conduit_core: 5 },
    requires: { hasBuilding: "ironBastion", era: 5 },
    effect: { defense: 20, raidLossMult: 0.05, clockSlowMult: 0.75 },
    effectSummary: "Defiance-path. +20 defense, raid sweep x 0.05, slows the clock by 25%.",
    onBuiltMessage: "🛡️ The Bastion stands. The wall is taller than the watchman. The watchman is glad.",
    tier: 12, col: 2, parents: ["ironBastion"],
  },

  echoSanctum: {
    id: "echoSanctum", name: "Echo Sanctum", icon: "🕯️", category: "comfort",
    description: "A safe room of stone and quiet. Houses 3. The sanity inside it remembers what sanity is.",
    cost: { stone: 100, wood: 50, fragments: 20 },
    requires: { era: 5 },
    effect: { sanityPerMinute: 1 },
    housing: 3,
    effectSummary: "+1 sanity/min · +3 housing · a safe room during the reckoning.",
    onBuiltMessage: "🕯️ The Echo Sanctum closes. The candles burn straight.",
    tier: 12, col: 3, parents: ["councilHall"],
  },

  conduitSpire: {
    id: "conduitSpire", name: "Conduit Spire", icon: "⚡", category: "arcane",
    description: "A tall version of the Conduit Array. Tall enough that it does not need the ground to hold it. Required for the apex ritual.",
    cost: { aether_iron: 60, conduit_core: 10, fragments: 50 },
    requires: { hasBuilding: "conduitArray", era: 5 },
    effect: { spiritPerMinute: 6, worldScorePerMinute: -1 },
    effectSummary: "+6 spirit/min · -1 worldScore/min · enables the apex ritual.",
    onBuiltMessage: "⚡ The Spire goes up. The Spire stays up. The Spire is not held up by anything visible.",
    tier: 12, col: 4, parents: ["conduitArray"],
  },
};

export const getBuilding = (id) => BUILDINGS[id] || null;
export const getAllBuildings = () => Object.values(BUILDINGS);

export function getBuildingTreeBounds() {
  const all = getAllBuildings();
  let maxTier = 0;
  let maxCol = 0;
  for (const b of all) {
    maxTier = Math.max(maxTier, b.tier);
    maxCol = Math.max(maxCol, b.col);
  }
  return { tiers: maxTier, cols: maxCol + 1 };
}
