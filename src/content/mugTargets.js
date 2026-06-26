// Mug targets (#180 / #181) — DATA, not code.
//
// Thievery is the "stalk and take" loop. Each role has THREE era tiers
// so the loot table tracks the player's progress: an Era 1 Peasant has
// food and water; an Era 3 Peasant has scrolls and coins. Same name —
// the world changes around them.
//
// Schema:
//   id, name, icon              — identity
//   era                         — earliest era this target exists
//   role                        — role family (peasant/hunter/...)
//   description                 — flavor on the picker card
//   difficulty                  — 0..1 chance the mug attempt fails
//   loot[]                      — { resource, qty: N|[lo,hi], chance } table
//   xp                          — thievery XP on success
//   alignmentEvil               — alignment evil gain on success (default 1)
//   failPenalty                 — { hp?, sanity? } applied on failure
//   flavor                      — opener / success / fail line pools

// Helper to declare a target with default flavor fallbacks.
function T(o) { return o; }

export const MUG_TARGETS = {
  // ─── PEASANT ─ Era 1 / 2 / 3 ─────────────────────────────────────────
  peasant_e1: T({
    id: "peasant_e1", name: "Peasant", role: "peasant", icon: "🧑‍🌾",
    era: 1, difficulty: 0.2,
    description: "A dirt-hand on the road. Carries little but parts with it easy. Hands shake. Eyes don't meet yours.",
    loot: [
      { resource: "food", qty: [1, 3], chance: 0.95 },
      { resource: "wood", qty: [1, 2], chance: 0.5 },
      { resource: "water_stagnant", qty: 1, chance: 0.4 },
    ],
    xp: 2, alignmentEvil: 1, failPenalty: { sanity: -2 },
    flavor: {
      opener: ["🧑‍🌾 A peasant trudges past with a bundle. They don't see you yet."],
      success: ["🧑‍🌾 You take what they have. They run. The road keeps the rest."],
      fail: ["🧑‍🌾 They scream before you reach them. You back off. The sound stays in your head."],
    },
  }),
  peasant_e2: T({
    id: "peasant_e2", name: "Settler", role: "peasant", icon: "🧑‍🌾",
    era: 2, difficulty: 0.3,
    description: "A settler with a cart. Better clothes than the cottars. Hands that have worked iron, not just dirt.",
    loot: [
      { resource: "food", qty: [2, 4], chance: 0.95 },
      { resource: "wood", qty: [2, 4], chance: 0.7 },
      { resource: "water_muddy", qty: [1, 2], chance: 0.6 },
      { resource: "rags", qty: 1, chance: 0.4 },
    ],
    xp: 4, alignmentEvil: 1, failPenalty: { hp: -3, sanity: -2 },
    flavor: {
      opener: ["🧑‍🌾 A settler walks the road, eyes on the cart wheel that keeps catching."],
      success: ["🧑‍🌾 The cart spills. You take what fell out and a little more."],
      fail: ["🧑‍🌾 The settler is faster than they look. The cart-pole catches your shin."],
    },
  }),
  peasant_e3: T({
    id: "peasant_e3", name: "Townsfolk", role: "peasant", icon: "🧑‍🌾",
    era: 3, difficulty: 0.4,
    description: "Walks with a charm at the neck. The clothes are dyed. The pouch is heavier than they let on.",
    loot: [
      { resource: "food", qty: [2, 4], chance: 0.95 },
      { resource: "water_boiled", qty: [1, 2], chance: 0.5 },
      { resource: "fragments", qty: 1, chance: 0.3 },
      { resource: "tarnished_coin", qty: [1, 3], chance: 0.55 },
      { resource: "rags", qty: 1, chance: 0.4 },
    ],
    xp: 6, alignmentEvil: 2, failPenalty: { hp: -5, sanity: -3 },
    flavor: {
      opener: ["🧑‍🌾 A townsfolk walks with the easy step of someone who pays for problems to go away."],
      success: ["🧑‍🌾 You take the pouch. The charm comes with it. The road keeps the cry."],
      fail: ["🧑‍🌾 They cry out. A doorway nearby opens. You run before what's behind it comes out."],
    },
  }),

  // ─── WOODCUTTER ─ Era 1 / 2 / 3 ─────────────────────────────────────
  woodcutter_e1: T({
    id: "woodcutter_e1", name: "Woodcutter", role: "woodcutter", icon: "🪓",
    era: 1, difficulty: 0.3,
    description: "Big arms, slow eyes. The axe is for trees. Mostly.",
    loot: [
      { resource: "wood", qty: [2, 5], chance: 1.0 },
      { resource: "hide", qty: 1, chance: 0.3 },
      { resource: "food", qty: 1, chance: 0.3 },
    ],
    xp: 3, alignmentEvil: 1, failPenalty: { hp: -4 },
    flavor: {
      opener: ["🪓 The woodcutter stops to wipe sweat. The axe leans against the tree."],
      success: ["🪓 You take the bundle and leave the axe. Even thieves have rules."],
      fail: ["🪓 You misjudge the reach. The axe handle catches your ribs."],
    },
  }),
  woodcutter_e2: T({
    id: "woodcutter_e2", name: "Lumberer", role: "woodcutter", icon: "🪓",
    era: 2, difficulty: 0.45,
    description: "A team of two — axe in one hand, drag-rope in the other. Skirts the workshop on the way out. Smells of resin and sweat.",
    loot: [
      { resource: "wood", qty: [4, 8], chance: 1.0 },
      { resource: "hide", qty: [1, 2], chance: 0.5 },
      { resource: "salt_crystal", qty: 1, chance: 0.2 },
      { resource: "broken_blade", qty: 1, chance: 0.2 },
    ],
    xp: 5, alignmentEvil: 1, failPenalty: { hp: -7 },
    flavor: {
      opener: ["🪓 Two lumberers haul a log. One sets it down to rest. You move."],
      success: ["🪓 You take the smaller bundle. They blame each other on the road."],
      fail: ["🪓 The second one swings around the log faster than you bargained for."],
    },
  }),
  woodcutter_e3: T({
    id: "woodcutter_e3", name: "Forester", role: "woodcutter", icon: "🪓",
    era: 3, difficulty: 0.55,
    description: "Wears a sigil-marked apron — the guild kind. Carries a hatchet too small for trees and too sharp for everything else.",
    loot: [
      { resource: "wood", qty: [4, 8], chance: 1.0 },
      { resource: "hide", qty: [1, 2], chance: 0.6 },
      { resource: "fragments", qty: 1, chance: 0.25 },
      { resource: "tarnished_coin", qty: [1, 3], chance: 0.5 },
      { resource: "scroll", qty: 1, chance: 0.1 },
    ],
    xp: 7, alignmentEvil: 2, failPenalty: { hp: -9, sanity: -2 },
    flavor: {
      opener: ["🪓 The forester whistles a code you don't know. Branches stir nearby. You have one breath to choose."],
      success: ["🪓 You take the apron's purse and the hatchet. The whistle stops behind you."],
      fail: ["🪓 The whistle answers. Three foresters break from the brush. You run."],
    },
  }),

  // ─── HUNTER ─ Era 1 / 2 / 3 ─────────────────────────────────────────
  hunter_e1: T({
    id: "hunter_e1", name: "Hunter", role: "hunter", icon: "🏹",
    era: 1, difficulty: 0.4,
    description: "Lean. Watchful. The kind of hunger that doesn't share. You'll have to be quiet.",
    loot: [
      { resource: "bird_meat", qty: [1, 2], chance: 0.7 },
      { resource: "feathers", qty: [2, 5], chance: 0.85 },
      { resource: "hide", qty: [1, 2], chance: 0.6 },
      { resource: "sinew", qty: 1, chance: 0.5 },
    ],
    xp: 4, alignmentEvil: 1, failPenalty: { hp: -6, sanity: -1 },
    flavor: {
      opener: ["🏹 You spot a hunter checking a snare line. Their back is to you. For now."],
      success: ["🏹 You take the line, the catch, and one good knife. You leave before they remember to look."],
      fail: ["🏹 An arrow grazes your arm before you understand. You run."],
    },
  }),
  hunter_e2: T({
    id: "hunter_e2", name: "Trapper", role: "hunter", icon: "🏹",
    era: 2, difficulty: 0.5,
    description: "Walks a route of snares older than they are. Reads the wind. Reads you, too.",
    loot: [
      { resource: "bird_meat", qty: [2, 3], chance: 0.8 },
      { resource: "feathers", qty: [3, 6], chance: 0.9 },
      { resource: "hide", qty: [1, 3], chance: 0.85 },
      { resource: "sinew", qty: [1, 2], chance: 0.6 },
      { resource: "tusks", qty: 1, chance: 0.2 },
    ],
    xp: 6, alignmentEvil: 1, failPenalty: { hp: -8, sanity: -2 },
    flavor: {
      opener: ["🏹 The trapper is bent at a snare, retying a knot. You count three breaths."],
      success: ["🏹 You take the catch and the cord. The snare resets without you needing to bother."],
      fail: ["🏹 They straighten faster than they bent. The arrow they didn't seem to be holding is already at your throat."],
    },
  }),
  hunter_e3: T({
    id: "hunter_e3", name: "Pale Hunter", role: "hunter", icon: "🏹",
    era: 3, difficulty: 0.6,
    description: "Eyes too steady. Hunts what doesn't run. The arrows are bone — older bone — and there are more of them than they should carry.",
    loot: [
      { resource: "bird_meat", qty: [2, 4], chance: 0.85 },
      { resource: "ancient_feather", qty: [1, 2], chance: 0.5 },
      { resource: "hollow_bone", qty: [1, 2], chance: 0.6 },
      { resource: "fragments", qty: 1, chance: 0.3 },
      { resource: "scales", qty: [1, 2], chance: 0.4 },
    ],
    xp: 9, alignmentEvil: 2, failPenalty: { hp: -10, sanity: -4 },
    flavor: {
      opener: ["🏹 The pale hunter is bent at a kill you can't quite name. They haven't seen you. They almost never haven't."],
      success: ["🏹 You take what they were keeping. The kill itself you leave. Even thieves have rules."],
      fail: ["🏹 They turn without rising. The bone arrow is already gone."],
    },
  }),

  // ─── FARMER ─ Era 1 / 2 / 3 ─────────────────────────────────────────
  farmer_e1: T({
    id: "farmer_e1", name: "Farmer", role: "farmer", icon: "🌾",
    era: 1, difficulty: 0.25,
    description: "A small holder, lean from a hard year. The basket is full anyway. The first instinct is to share — until it isn't.",
    loot: [
      { resource: "food", qty: [3, 6], chance: 0.95 },
      { resource: "bird_eggs", qty: [1, 2], chance: 0.5 },
      { resource: "water_muddy", qty: [1, 2], chance: 0.4 },
    ],
    xp: 4, alignmentEvil: 2, failPenalty: { sanity: -3 },
    flavor: {
      opener: ["🌾 A farmer leans on their hoe at the row's end. The basket sits in the dust beside them."],
      success: ["🌾 You take the basket. They watch you go without speaking. That's worse."],
      fail: ["🌾 They sing out for help. Three more come from the fields. You run."],
    },
  }),
  farmer_e2: T({
    id: "farmer_e2", name: "Steader", role: "farmer", icon: "🌾",
    era: 2, difficulty: 0.35,
    description: "Their fields run further than you can see. Walks the rows with a stick. Doesn't lean on it.",
    loot: [
      { resource: "food", qty: [4, 8], chance: 1.0 },
      { resource: "bird_eggs", qty: [2, 3], chance: 0.65 },
      { resource: "water_boiled", qty: 1, chance: 0.3 },
      { resource: "salt_crystal", qty: 1, chance: 0.3 },
      { resource: "rags", qty: 1, chance: 0.3 },
    ],
    xp: 6, alignmentEvil: 2, failPenalty: { hp: -4, sanity: -3 },
    flavor: {
      opener: ["🌾 The steader is reading a row. You don't know what they're reading."],
      success: ["🌾 You take what's near the basket. The steader doesn't look up."],
      fail: ["🌾 The stick they weren't leaning on comes around in a single sweep. Your ankle goes out."],
    },
  }),
  farmer_e3: T({
    id: "farmer_e3", name: "Hedge-witch", role: "farmer", icon: "🌾",
    era: 3, difficulty: 0.55,
    description: "A widow's garden. The herbs hang in bundles inside her door. She mutters as she walks. You can't make out the words.",
    loot: [
      { resource: "food", qty: [3, 6], chance: 0.95 },
      { resource: "bird_eggs", qty: [1, 2], chance: 0.5 },
      { resource: "fragments", qty: [1, 2], chance: 0.4 },
      { resource: "ink", qty: 1, chance: 0.4 },
      { resource: "torn_page", qty: 1, chance: 0.3 },
    ],
    xp: 8, alignmentEvil: 3, failPenalty: { hp: -3, sanity: -8 },
    flavor: {
      opener: ["🌾 The hedge-witch is bent over a row, talking to the row. The basket beside her is dark with rain."],
      success: ["🌾 You take the basket and the bundle from the doorframe. The mutter doesn't stop. You don't look back."],
      fail: ["🌾 She looks up. The muttering didn't stop while she walked over. Something in your head shifts."],
    },
  }),

  // ─── FISHERMAN ─ Era 1 / 2 / 3 ───────────────────────────────────
  fisherman_e1: T({
    id: "fisherman_e1", name: "Shore-picker", role: "fisherman", icon: "🎣",
    era: 1, difficulty: 0.25,
    description: "Wades the shallows with a stick. Carries the day's catch in a wet hand.",
    loot: [
      { resource: "food", qty: [1, 3], chance: 0.9 },
      { resource: "water_stagnant", qty: [1, 2], chance: 0.7 },
      { resource: "sinew", qty: 1, chance: 0.3 },
    ],
    xp: 3, alignmentEvil: 1, failPenalty: { hp: -3 },
    flavor: {
      opener: ["🎣 A shore-picker bends to pry something from the silt. They haven't looked up."],
      success: ["🎣 You take the catch from the wet hand. They watch the river. The river watches back."],
      fail: ["🎣 They straighten. The stick is already across the water like a bridge they walk."],
    },
  }),
  fisherman_e2: T({
    id: "fisherman_e2", name: "Fisherman", role: "fisherman", icon: "🎣",
    era: 2, difficulty: 0.35,
    description: "Patient at the bank, less so when surprised. The day's catch is in a wet sack at their hip.",
    loot: [
      { resource: "food", qty: [2, 4], chance: 0.95 },
      { resource: "water_muddy", qty: [2, 4], chance: 0.7 },
      { resource: "sinew", qty: 1, chance: 0.4 },
      { resource: "hide", qty: 1, chance: 0.25 },
    ],
    xp: 5, alignmentEvil: 1, failPenalty: { hp: -5 },
    flavor: {
      opener: ["🎣 The fisherman stares at their line. They haven't moved in an hour."],
      success: ["🎣 You take the sack. The line is still in the water when you leave."],
      fail: ["🎣 They turn faster than they look. The reel catches your hand."],
    },
  }),
  fisherman_e3: T({
    id: "fisherman_e3", name: "Reedwalker", role: "fisherman", icon: "🎣",
    era: 3, difficulty: 0.5,
    description: "Wades the deep reeds where the river runs slower than it should. Carries more than a day's catch — and is too calm about it.",
    loot: [
      { resource: "food", qty: [3, 5], chance: 0.95 },
      { resource: "water_boiled", qty: [1, 2], chance: 0.5 },
      { resource: "scales", qty: [1, 3], chance: 0.6 },
      { resource: "fragments", qty: 1, chance: 0.3 },
      { resource: "venom_gland", qty: 1, chance: 0.25 },
    ],
    xp: 8, alignmentEvil: 2, failPenalty: { hp: -7, sanity: -3 },
    flavor: {
      opener: ["🎣 The reedwalker drifts at the bank. The reeds part around them. They didn't push."],
      success: ["🎣 You take the catch and the bundle. The river makes a sound a river shouldn't."],
      fail: ["🎣 They reach into the water without looking. What they bring up is not a fish."],
    },
  }),

  // ─── MINER ─ Era 1 / 2 / 3 ───────────────────────────────────────
  miner_e1: T({
    id: "miner_e1", name: "Scrounger", role: "miner", icon: "⛏️",
    era: 1, difficulty: 0.35,
    description: "Picks the rubble at the cliff's foot with a stone in each hand. The bag is heavier than they let on.",
    loot: [
      { resource: "stone", qty: [2, 4], chance: 1.0 },
      { resource: "wood", qty: 1, chance: 0.4 },
      { resource: "hide", qty: 1, chance: 0.2 },
    ],
    xp: 3, alignmentEvil: 1, failPenalty: { hp: -4 },
    flavor: {
      opener: ["⛏️ A scrounger sits in the scree, sorting stones. They have their back to the road."],
      success: ["⛏️ You take the better half of the bag. They sort the rest without noticing."],
      fail: ["⛏️ One of the stones in their hand comes around faster than the other."],
    },
  }),
  miner_e2: T({
    id: "miner_e2", name: "Miner", role: "miner", icon: "⛏️",
    era: 2, difficulty: 0.5,
    description: "Coming out of the dark with stone-dust in their hair. Their pack is heavier than it looks.",
    loot: [
      { resource: "stone", qty: [3, 6], chance: 1.0 },
      { resource: "iron", qty: 1, chance: 0.25 },
      { resource: "wood", qty: 1, chance: 0.3 },
      { resource: "fangs", qty: 1, chance: 0.2 },
    ],
    xp: 7, alignmentEvil: 1, failPenalty: { hp: -8 },
    flavor: {
      opener: ["⛏️ The miner is just clearing the tunnel mouth. The pack drops off their shoulder."],
      success: ["⛏️ Pack swings down, then up onto your back. They never see the second hand."],
      fail: ["⛏️ The pickaxe comes around faster than you expect. You feel ribs go."],
    },
  }),
  miner_e3: T({
    id: "miner_e3", name: "Shardminer", role: "miner", icon: "⛏️",
    era: 3, difficulty: 0.65,
    description: "Coming up from the deep workings with a sack that hums faintly. Eyes adjusted to dark longer than skin should be that pale.",
    loot: [
      { resource: "stone", qty: [3, 5], chance: 0.95 },
      { resource: "iron", qty: [1, 2], chance: 0.5 },
      { resource: "fragments", qty: [2, 4], chance: 0.75 },
      { resource: "glass_shard", qty: 1, chance: 0.3 },
      { resource: "splinterRune", qty: 1, chance: 0.08 },
    ],
    xp: 11, alignmentEvil: 2, failPenalty: { hp: -12, sanity: -3 },
    flavor: {
      opener: ["⛏️ The shardminer sets the sack down to rest. The sack settles in a way sacks don't."],
      success: ["⛏️ You take the sack. It hums. You stop touching it as soon as the road is empty."],
      fail: ["⛏️ The pickaxe comes around with a glow you didn't see in their hand a moment ago."],
    },
  }),

  // ─── SMITH ─ Era 1 / 2 / 3 ──────────────────────────────────────
  smith_e1: T({
    id: "smith_e1", name: "Knapper", role: "smith", icon: "🔨",
    era: 1, difficulty: 0.4,
    description: "A flint-worker, hands cut a hundred times over and over again. Tools spread on a stone slab.",
    loot: [
      { resource: "stone", qty: [2, 4], chance: 1.0 },
      { resource: "fangs", qty: 1, chance: 0.4 },
      { resource: "hide", qty: 1, chance: 0.3 },
    ],
    xp: 4, alignmentEvil: 1, failPenalty: { hp: -6 },
    flavor: {
      opener: ["🔨 The knapper is bent at a stone, drawing flakes. The pile is finished work."],
      success: ["🔨 You take the finished pile. They keep working on the next one without looking."],
      fail: ["🔨 They pivot off the slab with the half-finished blade still in hand."],
    },
  }),
  smith_e2: T({
    id: "smith_e2", name: "Smith", role: "smith", icon: "⚒️",
    era: 2, difficulty: 0.6,
    description: "Arms like the bellows they pump. Slower than they look. Strong as anything that's lasted in this world.",
    loot: [
      { resource: "iron", qty: [1, 3], chance: 0.7 },
      { resource: "stone", qty: [2, 4], chance: 0.6 },
      { resource: "scrap_metal", qty: [1, 2], chance: 0.5 },
      { resource: "broken_blade", qty: 1, chance: 0.3 },
      { resource: "tarnished_coin", qty: [1, 3], chance: 0.4 },
    ],
    xp: 9, alignmentEvil: 2, failPenalty: { hp: -12, sanity: -2 },
    flavor: {
      opener: ["⚒️ The smith turns to dunk the blade. The forge hiss is loud. You move."],
      success: ["⚒️ You take what cools beside the anvil and the half-strip on the bench. You leave before the hiss ends."],
      fail: ["⚒️ A hammer rings off the floor by your foot. The second swing connects."],
    },
  }),
  smith_e3: T({
    id: "smith_e3", name: "Runesmith", role: "smith", icon: "⚒️",
    era: 3, difficulty: 0.75,
    description: "Works in a forge that burns colder than it should. The bellows are pumped by no one. The tongs hold what isn't there.",
    loot: [
      { resource: "iron", qty: [1, 3], chance: 0.7 },
      { resource: "fragments", qty: [2, 4], chance: 0.7 },
      { resource: "coin", qty: [1, 3], chance: 0.4 },
      { resource: "ink", qty: 1, chance: 0.3 },
      { resource: "emberRune", qty: 1, chance: 0.10 },
    ],
    xp: 14, alignmentEvil: 3, failPenalty: { hp: -16, sanity: -5 },
    flavor: {
      opener: ["⚒️ The runesmith doesn't turn when you approach. The bellows pump anyway."],
      success: ["⚒️ You take the rune from the cooling-dish. The tongs put a new one in its place."],
      fail: ["⚒️ The runesmith turns. The hammer comes around with a sound you remember from somewhere you've never been."],
    },
  }),

  // ─── MERCHANT ─ Era 1 / 2 / 3 ────────────────────────────────────
  merchant_e1: T({
    id: "merchant_e1", name: "Drifter", role: "merchant", icon: "🛍️",
    era: 1, difficulty: 0.35,
    description: "A wanderer trading dust-trinkets for food. Pockets jingle when they walk fast.",
    loot: [
      { resource: "food", qty: [1, 2], chance: 0.8 },
      { resource: "rags", qty: [1, 2], chance: 0.7 },
      { resource: "tarnished_coin", qty: [1, 3], chance: 0.55 },
      { resource: "fangs", qty: 1, chance: 0.3 },
    ],
    xp: 4, alignmentEvil: 1, failPenalty: { hp: -3, sanity: -2 },
    flavor: {
      opener: ["🛍️ The drifter is laying out their wares on a folded blanket. The blanket is the most valuable thing on it."],
      success: ["🛍️ You take the small bundle of coins. They watch you take it. They've watched worse."],
      fail: ["🛍️ They are not as alone as you thought. A second drifter steps from behind the cart."],
    },
  }),
  merchant_e2: T({
    id: "merchant_e2", name: "Caravaner", role: "merchant", icon: "🐎",
    era: 2, difficulty: 0.5,
    description: "Three carts and a guard. The carts smell of grain and tanned leather. The guard smells of nothing.",
    loot: [
      { resource: "food", qty: [3, 5], chance: 0.8 },
      { resource: "hide", qty: [1, 3], chance: 0.6 },
      { resource: "tarnished_coin", qty: [2, 5], chance: 0.8 },
      { resource: "coin", qty: [1, 2], chance: 0.4 },
      { resource: "broken_blade", qty: 1, chance: 0.3 },
    ],
    xp: 8, alignmentEvil: 2, failPenalty: { hp: -10, sanity: -3 },
    flavor: {
      opener: ["🐎 The caravan rests at the road's bend. The guard turns his back for one moment."],
      success: ["🐎 You take the smaller chest. The wheels start moving again before they notice."],
      fail: ["🐎 The guard turns. The crossbow is already up."],
    },
  }),
  merchant_e3: T({
    id: "merchant_e3", name: "Guild Merchant", role: "merchant", icon: "🪙",
    era: 3, difficulty: 0.6,
    description: "Walking with two guards even on a road this empty. Eyes already on you before you decide.",
    loot: [
      { resource: "fragments", qty: [1, 3], chance: 0.6 },
      { resource: "food", qty: [2, 4], chance: 0.5 },
      { resource: "tarnished_coin", qty: [1, 5], chance: 0.7 },
      { resource: "coin", qty: [1, 3], chance: 0.45 },
      { resource: "obol", qty: 1, chance: 0.1 },
      { resource: "scroll", qty: 1, chance: 0.15 },
    ],
    xp: 13, alignmentEvil: 3, failPenalty: { hp: -12, sanity: -5 },
    flavor: {
      opener: ["🪙 The merchant slows the cart. The guards are already looking left and right. You have one breath."],
      success: ["🪙 You take the purse and a fistful from the cart. The guards never see the second hand."],
      fail: ["🪙 You misjudge the second guard. The clubs come down once, then again."],
    },
  }),
};

export const getMugTarget = (id) => MUG_TARGETS[id] || null;
export const getAllMugTargets = () => Object.values(MUG_TARGETS);
export const getMugTargetsForEra = (era) =>
  getAllMugTargets().filter((t) => (t.era || 1) <= era);
