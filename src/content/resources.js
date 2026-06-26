// Resource definitions — DATA, not code.

import { TOOLS } from "./tools.js";

export const RESOURCE_CATEGORIES = {
  materials:     { id: "materials",     name: "Materials",         order: 1 },
  drink:         { id: "drink",         name: "Drink",             order: 2 },
  food:          { id: "food",          name: "Food",              order: 3 },
  tool:          { id: "tool",          name: "Tools",             order: 4 },
  // Craft materials are intermediate products — crafted from raw materials,
  // then consumed by *other* crafts or by Arcane Studies. Scrolls and ink
  // are the seed of this category (see ERA_PLAN.md "Arcane Studies").
  craftMaterial: { id: "craftMaterial", name: "Craft Materials",   order: 4.5 },
  fragment:      { id: "fragment",      name: "Arcane",            order: 5 },
  mystic:        { id: "mystic",        name: "Mystic",            order: 6 },
  unknown:       { id: "unknown",       name: "Unknown",           order: 99 },
};

// The set of resource ids that represent drinkable water, ordered from
// worst to best. Used by the virtual-water cost helper (see
// totalWater/spendWater in this file) and by DrinkButton.
//
// Tier ladder (Era 1–2 vertical slice — Era 3+ tiers Filtered/Purified/Beer
// come later, see ERA_PLAN.md "Water tiers + dysentery"):
//   water_stagnant — what you scoop from gathering puddles. Risky.
//   water_muddy    — Water Hole production. Less risky.
//   water_boiled   — fire + boiling research. Clean.
export const WATER_TIERS = ["water_stagnant", "water_muddy", "water_boiled"];

export const RESOURCES = {
  wood: {
    id: "wood",
    name: "Wood",
    icon: "🪵",
    category: "materials",
    description: "Splintered remnants of dead trees.",
    baseCap: 50,
  },
  stone: {
    id: "stone",
    name: "Stone",
    icon: "🪨",
    category: "materials",
    description: "Cracked, weathered rock from the wasteland.",
    baseCap: 50,
  },
  // ─── Drink tier ladder ─────────────────────────────────────────────────
  //
  // `thirstRelief` — how much thirst the drink removes (lower thirst = better;
  //                  these values are passed straight to applyEffect as a
  //                  negative thirst delta).
  // `dysenteryChance` — probability (0..1) that drinking this tier triggers
  //                     the dysentery status. Rolled in performDrink.
  // `tier` — 1 = stagnant, 2 = muddy, 3 = boiled. DrinkButton sorts by tier
  //          for the "best available" auto-select.
  //
  // Stagnant and muddy water spoil — the dust gets in, things grow. Boiled
  // water is stable. (Era 3+ tiers Filtered/Purified will also be stable.)
  water_stagnant: {
    id: "water_stagnant",
    name: "Stagnant Water",
    icon: "🩸",
    category: "drink",
    description:
      "Whatever you scooped from a puddle or hollow. The taste is the taste of the dust. Drinkable, but the body remembers.",
    baseCap: 20,
    thirstRelief: 20,
    dysenteryChance: 0.25,
    tier: 1,
    spoilage: { perMinute: 0.15, atCapMultiplier: 3 },
  },

  water_muddy: {
    id: "water_muddy",
    name: "Muddy Water",
    icon: "💧",
    category: "drink",
    description:
      "From the Water Hole — sediment-streaked, but cool. Better than the puddle. Not by enough.",
    baseCap: 20,
    thirstRelief: 35,
    dysenteryChance: 0.1,
    tier: 2,
    spoilage: { perMinute: 0.08, atCapMultiplier: 3 },
  },

  water_boiled: {
    id: "water_boiled",
    name: "Boiled Water",
    icon: "🫖",
    category: "drink",
    description:
      "Driven over fire until whatever lived in it does not. Clean enough that the body answers.",
    baseCap: 15,
    thirstRelief: 50,
    dysenteryChance: 0.02,
    tier: 3,
    // Boiled water doesn't spoil — the fire took out what spoils it.
  },
  fragments: {
    id: "fragments",
    name: "Arcane Shards",
    icon: "✨",
    category: "fragment",
    description: "Pieces of a thing that broke, and remembers being whole. They hum against the skin and dim against your pulse. They are the fuel of every spell.",
    hiddenUntil: { researched: "arcaneAwakening" },
    hiddenName: "???",
    hiddenIcon: "❓",
    hiddenDescription: "Strange shards. They hum against the skin.",
    hiddenCategory: "unknown",
  },

  food: {
    id: "food",
    name: "Grubs",
    icon: "🪱",
    category: "food",
    nutrition: 3,
    tier: 1,
    description: "Pale, wriggling. They squirm in the palm. Better than nothing. Barely.",
    baseCap: 15,
    spoilage: { perMinute: 0.2, atCapMultiplier: 4 },
    // Death-debuff recovery (Task #50). Grubs help a little. The point
    // of #50 is *every food gives something back* — even worms.
    deathDebuffRecovery: 0.05,
  },

  bird_meat: {
    id: "bird_meat",
    name: "Bird Meat",
    icon: "🍗",
    category: "food",
    nutrition: 22,
    tier: 2,
    description: "Stringy, dark, faintly metallic. The first warm meal in a long time.",
    baseCap: 10,
    spoilage: { perMinute: 0.4, atCapMultiplier: 5 },
    // Protein — the bridge to STR (future #47) AND the most effective
    // food-side recovery from a death-debuff cascade. See systems/death.js.
    deathDebuffRecovery: 0.12,
  },

  bird_eggs: {
    id: "bird_eggs",
    name: "Bird Eggs",
    icon: "🥚",
    category: "food",
    nutrition: 8,
    tier: 1,
    description: "Speckled, still warm. Crack one and you can taste where it has been hiding.",
    baseCap: 8,
    // Eggs spoil quickly — a faster perMinute than bird meat.
    spoilage: { perMinute: 0.6, atCapMultiplier: 5 },
    deathDebuffRecovery: 0.08,
  },

  feathers: {
    id: "feathers",
    name: "Feathers",
    icon: "🪶",
    category: "materials",
    description: "Stiff vanes still flecked with old blood. Light. Useful, somehow.",
    baseCap: 30,
  },

  // ─── Craft materials (Era 2+) ──────────────────────────────────────────
  //
  // Intermediate goods crafted from raw resources, then consumed by *other*
  // crafts or by Arcane Studies (timed magic study at the Stone Altar — see
  // ERA_PLAN.md "Arcane Studies"). Hidden until the player has researched
  // altarWork, so they don't clutter the inventory pre-Era-2.
  //
  // No spoilage — parchment and ink keep.
  scroll: {
    id: "scroll",
    name: "Scroll",
    icon: "📜",
    category: "craftMaterial",
    description:
      "Rolled parchment of beaten wood-fiber. Blank until something is written on it. The Stone says: write what I tell you, and the world will listen.",
    baseCap: 10,
    hiddenUntil: { researched: "altarWork" },
    hiddenName: "???",
    hiddenIcon: "❓",
    hiddenDescription: "A material you don't yet know how to make.",
    hiddenCategory: "unknown",
  },

  ink: {
    id: "ink",
    name: "Ink",
    icon: "🖋️",
    category: "craftMaterial",
    description:
      "Char and crushed grub-dark, mixed to a sluggish black. It thinks slower than you. That's the point.",
    baseCap: 10,
    hiddenUntil: { researched: "altarWork" },
    hiddenName: "???",
    hiddenIcon: "❓",
    hiddenDescription: "A material you don't yet know how to make.",
    hiddenCategory: "unknown",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Patrol drops (#66) — mob spoils
  // ═══════════════════════════════════════════════════════════════════

  // ─── Era 1 mob drops ───────────────────────────────────────────────
  dog_meat:       { id: "dog_meat",       name: "Dog Meat",        icon: "🥩", category: "food",      description: "Lean and stringy. Tastes of the dust the dog ran on.", baseCap: 20 },
  dog_fur:        { id: "dog_fur",        name: "Dog Fur",         icon: "🐕", category: "materials", description: "Coarse hide and fur. Bound, it warms; sewn, it lasts.", baseCap: 15 },
  fangs:          { id: "fangs",          name: "Fangs",           icon: "🦷", category: "materials", description: "Yellowed canines. Sharp enough still.", baseCap: 30 },
  hollow_bone:    { id: "hollow_bone",    name: "Hollow Bone",     icon: "🦴", category: "materials", description: "Light, thin, ringing when struck. Bird-bone or older.", baseCap: 30 },
  scales:         { id: "scales",         name: "Scales",          icon: "🐍", category: "materials", description: "Translucent, hard at the edge. Layer them and they hold.", baseCap: 30 },
  venom_gland:    { id: "venom_gland",    name: "Venom Gland",     icon: "🧪", category: "materials", description: "A pinprick of bitter sting. Dries to a brown crust.", baseCap: 12 },
  tough_meat:     { id: "tough_meat",     name: "Tough Meat",      icon: "🍖", category: "food",      description: "From a beast that ate other beasts. Chew long.", baseCap: 20 },
  sinew:          { id: "sinew",          name: "Sinew",           icon: "🧵", category: "materials", description: "Tendon, strung-out and dried. Holds knots that wood cannot.", baseCap: 20 },
  bile_sac:       { id: "bile_sac",       name: "Bile Sac",        icon: "🟢", category: "materials", description: "Foul-smelling, useful in small measures.", baseCap: 10 },
  salt_crystal:   { id: "salt_crystal",   name: "Salt Crystal",    icon: "🧂", category: "materials", description: "Coarse, white. Preserves what would otherwise rot.", baseCap: 20 },
  rags:           { id: "rags",           name: "Rags",            icon: "🧶", category: "materials", description: "Cloth that has been on someone. The someone is no longer.", baseCap: 20 },
  ancient_feather:{ id: "ancient_feather",name: "Ancient Feather", icon: "🪶", category: "materials", description: "Older than feathers should be. The light it catches isn't ours.", baseCap: 15 },
  marrow:         { id: "marrow",         name: "Marrow",          icon: "🦴", category: "materials", description: "What was meant to stay inside the bone.", baseCap: 12 },
  chitin:         { id: "chitin",         name: "Chitin",          icon: "🪲", category: "materials", description: "Beetle-shell plate. Cracks under hard impact, otherwise tough.", baseCap: 25 },
  lizard_meat:    { id: "lizard_meat",    name: "Lizard Meat",     icon: "🍖", category: "food",      description: "Pale, springy. Better cooked. Even then, barely.", baseCap: 20 },
  tarnished_coin: { id: "tarnished_coin", name: "Tarnished Coin",  icon: "🪙", category: "materials", description: "Old coinage from before. The face is worn through. The metal is still metal.", baseCap: 99 },

  scrap_metal:    { id: "scrap_metal",    name: "Scrap Metal",     icon: "🔩", category: "materials", description: "Twisted bits of forged things. Worth re-forging.", baseCap: 30 },
  hide:           { id: "hide",           name: "Hide",            icon: "🟫", category: "materials", description: "Tanned thicker than human leather. Better than dog fur.", baseCap: 20 },
  dirty_water:    { id: "dirty_water",    name: "Dirty Water",     icon: "🩸", category: "drink",     description: "Carried in skins, gone foul. Drinkable in extremis. Not advised.", baseCap: 10, thirstRelief: 10, dysenteryChance: 0.5, tier: 0, spoilage: { perMinute: 0.20, atCapMultiplier: 2 } },
  raider_token:   { id: "raider_token",   name: "Raider Token",    icon: "🏷️", category: "materials", description: "A scrap of band identity. Trade with the right kind.", baseCap: 20 },
  coin:           { id: "coin",           name: "Coin",            icon: "🪙", category: "materials", description: "Settler currency. Round, stamped, honest. Mostly.", baseCap: 999 },
  black_candle:   { id: "black_candle",   name: "Black Candle",    icon: "🕯️", category: "mystic",    description: "Wax that smokes too much. The flame leans in a wind that isn't there.", baseCap: 15 },
  torn_page:      { id: "torn_page",      name: "Torn Page",       icon: "📃", category: "craftMaterial", description: "Hand-written, in a language you partly recognize.", baseCap: 25 },
  broken_blade:   { id: "broken_blade",   name: "Broken Blade",    icon: "🗡️", category: "materials", description: "Half a sword. Re-forgeable, or repurposeable.", baseCap: 15 },
  bog_iron:       { id: "bog_iron",       name: "Bog Iron",        icon: "⛓️", category: "materials", description: "Heavy, wet-smelling. Smelts ugly but holds an edge.", baseCap: 20 },
  iron:           { id: "iron",           name: "Iron",            icon: "🔩", category: "materials", description: "Forge-iron ingots. Hammered out of bog ore over fire. Heavier than the stone tier; sharper than the bone.", baseCap: 30, hiddenUntil: { researched: "smithing" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "A worked metal you don't yet know how to make.", hiddenCategory: "unknown" },
  glass_shard:    { id: "glass_shard",    name: "Glass Shard",     icon: "🔻", category: "materials", description: "A piece from an eye, or what was where the eye used to be.", baseCap: 15 },
  pale_worm:      { id: "pale_worm",      name: "Pale Worm",       icon: "🪱", category: "mystic",    description: "Finger-long. Twitches when nothing touches it.", baseCap: 15 },
  boar_meat:      { id: "boar_meat",      name: "Boar Meat",       icon: "🍖", category: "food",      description: "Heavy with fat. Keeps long if salted.", baseCap: 20 },
  tusks:          { id: "tusks",          name: "Tusks",           icon: "🦷", category: "materials", description: "Long, ivory-yellow. Carve to knife-handles or charm-tokens.", baseCap: 20 },
  rat_tail:       { id: "rat_tail",       name: "Rat Tail",        icon: "🐀", category: "materials", description: "Pink, scaled, more useful than it looks.", baseCap: 30 },

  spirit_essence: { id: "spirit_essence", name: "Spirit Essence",  icon: "💜", category: "mystic",    description: "A vial of what was once a presence. Cool to the touch over flame.", baseCap: 15 },
  shadow_dust:    { id: "shadow_dust",    name: "Shadow Dust",     icon: "🌫️", category: "mystic",    description: "Fine, dark, settles in jars but stays light.", baseCap: 20 },
  void_bone:      { id: "void_bone",      name: "Void Bone",       icon: "🦴", category: "mystic",    description: "Bone from something with no inside.", baseCap: 15 },
  shattered_glyph:{ id: "shattered_glyph",name: "Shattered Glyph", icon: "🔮", category: "mystic",    description: "A symbol broken into parts that still want to be whole.", baseCap: 12 },
  corrupted_flesh:{ id: "corrupted_flesh",name: "Corrupted Flesh", icon: "🥩", category: "mystic",    description: "Not for eating. Ritual component, when burned.", baseCap: 12 },
  lidless_eye:    { id: "lidless_eye",    name: "Lidless Eye",     icon: "👁️", category: "mystic",    description: "A wet, perfect orb that does not blink.", baseCap: 8 },
  pale_tendon:    { id: "pale_tendon",    name: "Pale Tendon",     icon: "🧬", category: "mystic",    description: "Long, white, slippery. Holds impossible knots.", baseCap: 12 },
  wax_mask:       { id: "wax_mask",       name: "Wax Mask",        icon: "🎭", category: "mystic",    description: "A featureless face. Holds the shape of whatever wore it last.", baseCap: 8 },
  inverted_glyph: { id: "inverted_glyph", name: "Inverted Glyph",  icon: "♅", category: "mystic",    description: "A ward turned inside out. Undoes other wards.", baseCap: 10 },
  hollow_garment: { id: "hollow_garment", name: "Hollow Garment",  icon: "👘", category: "mystic",    description: "A robe that fits no body. Cold no matter what's in it.", baseCap: 8 },
  starlit_fragment:{id: "starlit_fragment",name: "Starlit Fragment",icon: "🌟",category: "mystic",    description: "A fragment older than the stone you woke.", baseCap: 5 },
  cherub_feather: { id: "cherub_feather", name: "Cherub Feather",  icon: "🪽", category: "mystic",    description: "Small, soft, hums in a child's voice.", baseCap: 6 },
  obol:           { id: "obol",           name: "Obol",            icon: "🥮", category: "materials", description: "Black-iron coin from a thing that did not need money.", baseCap: 99 },

  // ─── Arrows (#124) — Fletching outputs. Stackable ammo for ranged.
  arrows:      { id: "arrows",      name: "Arrows",       icon: "🏹", category: "materials", description: "Wood-shaft arrows. Plain. Lethal at twenty paces.", baseCap: 50 },
  ironArrows:  { id: "ironArrows",  name: "Iron Arrows",  icon: "🎯", category: "materials", description: "Iron-tipped shafts. Heavier draw, harder bite.", baseCap: 40 },
  shardArrows: { id: "shardArrows", name: "Shard Arrows", icon: "✨", category: "mystic",    description: "Arrows tipped with bound fragment-shards. They sing in the quiver.", baseCap: 30, hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "A worked arrow you don't yet know how to make.", hiddenCategory: "unknown" },

  // ─── Runes (#115) — Runesmithing outputs.
  lightRune:      { id: "lightRune",      name: "Light Rune",       icon: "✨", category: "mystic", description: "A bound shard inscribed with a sigil of mending. Imbue a weapon to heal on hit.", baseCap: 12, imbueEffect: { hpReturnOnHit: 2, label: "+2 HP on hit" }, rarity: "uncommon", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "A worked rune you don't yet know how to make.", hiddenCategory: "unknown" },
  bendRune:       { id: "bendRune",       name: "Bend Rune",        icon: "🌑", category: "mystic", description: "A shard etched in dark-grained ink. Imbue a weapon to drain Spirit from foes.", baseCap: 12, imbueEffect: { spiritReturnOnHit: 2, label: "+2 Spirit on hit" }, rarity: "uncommon", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "A worked rune you don't yet know how to make.", hiddenCategory: "unknown" },
  elementalRune:  { id: "elementalRune",  name: "Elemental Rune",   icon: "🌿", category: "mystic", description: "A green-veined rune. Cool in summer, warm in winter. Imbue for slow HP regen out of combat.", baseCap: 12, imbueEffect: { hpRegenPerMinute: 1, label: "+1 HP / min" }, rarity: "uncommon", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "A worked rune you don't yet know how to make.", hiddenCategory: "unknown" },
  memoryRune:     { id: "memoryRune",     name: "Memory Rune",      icon: "🔔", category: "mystic", description: "A rune that holds the shape of something gone. Imbue for a chance to strike twice.", baseCap: 12, imbueEffect: { echoChance: 0.10, label: "10% chance to strike twice" }, rarity: "uncommon", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  stonewordRune:  { id: "stonewordRune",  name: "Stoneword Rune",   icon: "👂", category: "mystic", description: "A rune that listens before it speaks. Imbue to skip wear ticks — the weapon lasts longer.", baseCap: 12, imbueEffect: { durabilitySaveChance: 0.20, label: "20% chance to skip wear" }, rarity: "uncommon", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
voidRune:       { id: "voidRune",       name: "Void Rune",        icon: "⚫", category: "mystic", description: "A rune carved from absent stone. Imbue for crushing damage at the cost of Sanity per swing.", baseCap: 8, imbueEffect: { damageBonus: 4, sanityCostOnHit: 1, label: "+4 dmg, −1 Sanity / swing" }, rarity: "uncommon", hiddenUntil: { researched: "voidcall" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },

  // ─── #136 expanded rune roster — 50 runes across 7 rarity tiers.
  // Common → Uncommon → Rare → Epic → Legendary → Mythic → God.

  // Common tier — small, single-stat bonuses.
  mendingChip: { id: "mendingChip", name: "Mending Chip", icon: "🩹", category: "mystic", description: "A worn shard with the faintest healing sigil. Modest but kind.", baseCap: 12, imbueEffect: { hpReturnOnHit: 1, label: "+1 HP on hit" }, rarity: "common", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  whisperChip: { id: "whisperChip", name: "Whisper Chip", icon: "🪶", category: "mystic", description: "A pale flake that hums when you breathe near it.", baseCap: 12, imbueEffect: { spiritReturnOnHit: 1, label: "+1 Spirit on hit" }, rarity: "common", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  seedlingShard: { id: "seedlingShard", name: "Seedling Shard", icon: "🌱", category: "mystic", description: "A rune-fragment with a green vein. It wants to live.", baseCap: 12, imbueEffect: { hpRegenPerMinute: 1, label: "+1 HP / min" }, rarity: "common", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  truestrikeMark: { id: "truestrikeMark", name: "Truestrike Mark", icon: "🎯", category: "mystic", description: "A simple bow-sigil. Steady the hand.", baseCap: 12, imbueEffect: { accBonus: 0.03, label: "+3% accuracy" }, rarity: "common", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  echoFragment: { id: "echoFragment", name: "Echo Fragment", icon: "🔉", category: "mystic", description: "A chip that hums after you strike it.", baseCap: 12, imbueEffect: { echoChance: 0.05, label: "5% chance to strike twice" }, rarity: "common", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  pebbleWard: { id: "pebbleWard", name: "Pebble Ward", icon: "🪨", category: "mystic", description: "A small carved pebble. Keeps the metal from cracking.", baseCap: 12, imbueEffect: { durabilitySaveChance: 0.1, label: "10% chance to skip wear" }, rarity: "common", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  splinterRune: { id: "splinterRune", name: "Splinter Rune", icon: "🥢", category: "mystic", description: "A rune that hates softness. Adds a little bite.", baseCap: 12, imbueEffect: { damageBonus: 2, label: "+2 damage" }, rarity: "common", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  emberRune: { id: "emberRune", name: "Ember Rune", icon: "🔥", category: "mystic", description: "A faint heat. The hand grips a little tighter.", baseCap: 12, imbueEffect: { damageBonus: 1, critChanceBonus: 0.01, label: "+1 dmg, +1% crit" }, rarity: "common", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },

  // Uncommon — extra runes complementing the existing six.
  frostveinRune: { id: "frostveinRune", name: "Frostvein Rune", icon: "❄️", category: "mystic", description: "A cold-blue line through a shard. The metal blunts incoming blows.", baseCap: 12, imbueEffect: { damageReduction: 0.05, label: "−5% damage taken" }, rarity: "uncommon", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  horizonRune: { id: "horizonRune", name: "Horizon Rune", icon: "🌅", category: "mystic", description: "A pale arc inscribed by a sigil-thinking hand.", baseCap: 12, imbueEffect: { critChanceBonus: 0.03, accBonus: 0.02, label: "+3% crit, +2% accuracy" }, rarity: "uncommon", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },

  // Rare — clearly stronger; some combine two stats.
  radiantRune: { id: "radiantRune", name: "Radiant Rune", icon: "☀️", category: "mystic", description: "A bright sigil that warms anyone near it.", baseCap: 12, imbueEffect: { hpReturnOnHit: 5, hpRegenPerMinute: 1, label: "+5 HP on hit, +1 HP/min" }, rarity: "rare", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  nullingRune: { id: "nullingRune", name: "Nulling Rune", icon: "🌒", category: "mystic", description: "A dark crescent that pulls the will out of strikes.", baseCap: 12, imbueEffect: { spiritReturnOnHit: 5, critChanceBonus: 0.02, label: "+5 Spirit on hit, +2% crit" }, rarity: "rare", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  greenwoodRune: { id: "greenwoodRune", name: "Greenwood Rune", icon: "🌳", category: "mystic", description: "A growing vein. Healing and bite together.", baseCap: 12, imbueEffect: { hpRegenPerMinute: 3, damageBonus: 1, label: "+3 HP/min, +1 dmg" }, rarity: "rare", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  inscribedSigil: { id: "inscribedSigil", name: "Inscribed Sigil", icon: "✒️", category: "mystic", description: "A tight braid of ink-lines that finds the eye.", baseCap: 12, imbueEffect: { accBonus: 0.06, critChanceBonus: 0.05, label: "+6% accuracy, +5% crit" }, rarity: "rare", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  mirrorEchoRune: { id: "mirrorEchoRune", name: "Mirror Echo Rune", icon: "🪞", category: "mystic", description: "A polished shard that strikes back the way you came in.", baseCap: 12, imbueEffect: { echoChance: 0.18, damageBonus: 1, label: "18% echo, +1 dmg" }, rarity: "rare", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  bedrockRune: { id: "bedrockRune", name: "Bedrock Rune", icon: "⛰️", category: "mystic", description: "A heavy chunk of inscribed bedrock. Holds gear together.", baseCap: 12, imbueEffect: { durabilitySaveChance: 0.35, hpRegenPerMinute: 1, label: "35% wear save, +1 HP/min" }, rarity: "rare", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  ravenousVoidRune: { id: "ravenousVoidRune", name: "Ravenous Void Rune", icon: "🕳️", category: "mystic", description: "A hungry shard. The hand pays for swings.", baseCap: 10, imbueEffect: { damageBonus: 7, sanityCostOnHit: 2, label: "+7 dmg, −2 Sanity / swing" }, rarity: "rare", hiddenUntil: { researched: "voidcall" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  huntermarkRune: { id: "huntermarkRune", name: "Huntermark Rune", icon: "🦌", category: "mystic", description: "A predator's sigil. Steady. Hungry.", baseCap: 12, imbueEffect: { damageBonus: 3, critChanceBonus: 0.04, label: "+3 dmg, +4% crit" }, rarity: "rare", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },

  // Epic — multi-effect or strong single. Visible mid-late Era 3.
  searingRune: { id: "searingRune", name: "Searing Rune", icon: "🌞", category: "mystic", description: "A burn-rune. Heals you, scorches them.", baseCap: 12, imbueEffect: { hpReturnOnHit: 8, hpRegenPerMinute: 3, label: "+8 HP on hit, +3 HP/min" }, rarity: "epic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  chasmRune: { id: "chasmRune", name: "Chasm Rune", icon: "🌑", category: "mystic", description: "A rune that reaches down and pulls Spirit up.", baseCap: 12, imbueEffect: { spiritReturnOnHit: 8, spiritRegenPerMinute: 2, label: "+8 Spirit on hit, +2 Spirit/min" }, rarity: "epic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  worldrootRune: { id: "worldrootRune", name: "Worldroot Rune", icon: "🌲", category: "mystic", description: "Roots threaded through stone. Stable and lethal.", baseCap: 12, imbueEffect: { hpRegenPerMinute: 5, accBonus: 0.05, damageBonus: 2, label: "+5 HP/min, +5% acc, +2 dmg" }, rarity: "epic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  masterSigil: { id: "masterSigil", name: "Master Sigil", icon: "📐", category: "mystic", description: "A sigil drawn by a hand that knows its own.", baseCap: 12, imbueEffect: { accBonus: 0.1, critChanceBonus: 0.08, label: "+10% acc, +8% crit" }, rarity: "epic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  temporalRune: { id: "temporalRune", name: "Temporal Rune", icon: "⌛", category: "mystic", description: "A rune that argues with the second-hand.", baseCap: 12, imbueEffect: { echoChance: 0.25, damageBonus: 2, label: "25% echo, +2 dmg" }, rarity: "epic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  monolithRune: { id: "monolithRune", name: "Monolith Rune", icon: "🗿", category: "mystic", description: "A rune the size of a fist. The weapon doesn't dare break.", baseCap: 12, imbueEffect: { durabilitySaveChance: 0.5, hpRegenPerMinute: 3, label: "50% wear save, +3 HP/min" }, rarity: "epic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  malignVoidRune: { id: "malignVoidRune", name: "Malign Void Rune", icon: "👁️", category: "mystic", description: "A rune that watches you. Strikes harder for it.", baseCap: 8, imbueEffect: { damageBonus: 10, sanityCostOnHit: 3, critChanceBonus: 0.05, label: "+10 dmg, −3 San / hit, +5% crit" }, rarity: "epic", hiddenUntil: { researched: "voidcall" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  sunkenRune: { id: "sunkenRune", name: "Sunken Rune", icon: "🌊", category: "mystic", description: "A rune pulled from a flooded shrine. Both blade and balm.", baseCap: 12, imbueEffect: { damageBonus: 5, hpReturnOnHit: 5, label: "+5 dmg, +5 HP on hit" }, rarity: "epic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },

  // Legendary — defining runes. Few but powerful.
  dawnbreaker: { id: "dawnbreaker", name: "Dawnbreaker Rune", icon: "🌄", category: "mystic", description: "A rune of the first light. Heals through anything.", baseCap: 12, imbueEffect: { hpReturnOnHit: 12, hpRegenPerMinute: 5, critChanceBonus: 0.05, label: "+12 HP on hit, +5 HP/min, +5% crit" }, rarity: "legendary", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  chasmlordRune: { id: "chasmlordRune", name: "Chasmlord Rune", icon: "🌌", category: "mystic", description: "A rune that holds the chasm. Spirit pours from it.", baseCap: 12, imbueEffect: { spiritReturnOnHit: 12, spiritRegenPerMinute: 5, label: "+12 Spirit on hit, +5 Spirit/min" }, rarity: "legendary", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  gaiaRune: { id: "gaiaRune", name: "Gaia Rune", icon: "🌍", category: "mystic", description: "A rune carved into living stone. The world is on your side.", baseCap: 12, imbueEffect: { hpRegenPerMinute: 8, damageBonus: 5, accBonus: 0.05, label: "+8 HP/min, +5 dmg, +5% acc" }, rarity: "legendary", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  archmageSigil: { id: "archmageSigil", name: "Archmage Sigil", icon: "🔮", category: "mystic", description: "A sigil bound by a name no one remembers.", baseCap: 12, imbueEffect: { accBonus: 0.15, critChanceBonus: 0.12, damageBonus: 3, label: "+15% acc, +12% crit, +3 dmg" }, rarity: "legendary", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  echofallRune: { id: "echofallRune", name: "Echofall Rune", icon: "🎐", category: "mystic", description: "A rune that lets the strike fall twice.", baseCap: 12, imbueEffect: { echoChance: 0.35, damageBonus: 5, label: "35% echo, +5 dmg" }, rarity: "legendary", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  worldstoneRune: { id: "worldstoneRune", name: "Worldstone Rune", icon: "💎", category: "mystic", description: "A rune cut from the lowest layer. Nothing breaks.", baseCap: 12, imbueEffect: { durabilitySaveChance: 0.7, hpRegenPerMinute: 5, damageBonus: 3, label: "70% wear save, +5 HP/min, +3 dmg" }, rarity: "legendary", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  nullVoidRune: { id: "nullVoidRune", name: "Null Void Rune", icon: "♾️", category: "mystic", description: "A rune that says the word for absence and means it.", baseCap: 6, imbueEffect: { damageBonus: 15, sanityCostOnHit: 4, echoChance: 0.2, label: "+15 dmg, −4 San / hit, 20% echo" }, rarity: "legendary", hiddenUntil: { researched: "voidcall" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  starforgeRune: { id: "starforgeRune", name: "Starforge Rune", icon: "⭐", category: "mystic", description: "Forged in a place where stars die. The strike crits like one.", baseCap: 12, imbueEffect: { damageBonus: 8, critChanceBonus: 0.1, label: "+8 dmg, +10% crit" }, rarity: "legendary", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },

  // Mythic — game-bending. Hard to acquire.
  sunlordRune: { id: "sunlordRune", name: "Sunlord Rune", icon: "🌟", category: "mystic", description: "A rune that wears the noon sky.", baseCap: 12, imbueEffect: { hpReturnOnHit: 18, hpRegenPerMinute: 8, critChanceBonus: 0.08, label: "+18 HP on hit, +8 HP/min, +8% crit" }, rarity: "mythic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  abyssalRune: { id: "abyssalRune", name: "Abyssal Rune", icon: "🌀", category: "mystic", description: "A rune that learned to drown. The Spirit it returns is yours and not.", baseCap: 12, imbueEffect: { spiritReturnOnHit: 18, spiritRegenPerMinute: 8, damageBonus: 5, label: "+18 Spirit on hit, +8 Spirit/min, +5 dmg" }, rarity: "mythic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  worldheartRune: { id: "worldheartRune", name: "Worldheart Rune", icon: "❤️‍🔥", category: "mystic", description: "Forged in the heart of the world. Everything obeys.", baseCap: 12, imbueEffect: { hpRegenPerMinute: 12, damageBonus: 8, accBonus: 0.08, label: "+12 HP/min, +8 dmg, +8% acc" }, rarity: "mythic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  runelordSigil: { id: "runelordSigil", name: "Runelord Sigil", icon: "🪄", category: "mystic", description: "The sigil of the one who taught all sigils.", baseCap: 12, imbueEffect: { accBonus: 0.2, critChanceBonus: 0.18, damageBonus: 6, label: "+20% acc, +18% crit, +6 dmg" }, rarity: "mythic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  timewovenRune: { id: "timewovenRune", name: "Timewoven Rune", icon: "⏳", category: "mystic", description: "A rune that braids the second and the next.", baseCap: 12, imbueEffect: { echoChance: 0.5, damageBonus: 8, hpReturnOnHit: 5, label: "50% echo, +8 dmg, +5 HP on hit" }, rarity: "mythic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  bedrocklordRune: { id: "bedrocklordRune", name: "Bedrocklord Rune", icon: "🏔️", category: "mystic", description: "A rune that owns the floor of the world.", baseCap: 12, imbueEffect: { durabilitySaveChance: 0.85, hpRegenPerMinute: 8, damageBonus: 6, label: "85% wear save, +8 HP/min, +6 dmg" }, rarity: "mythic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  annihilateRune: { id: "annihilateRune", name: "Annihilation Rune", icon: "💥", category: "mystic", description: "A rune that says: nothing remains.", baseCap: 4, imbueEffect: { damageBonus: 20, sanityCostOnHit: 5, echoChance: 0.3, critChanceBonus: 0.05, label: "+20 dmg, −5 San / hit, 30% echo, +5% crit" }, rarity: "mythic", hiddenUntil: { researched: "voidcall" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  soulreaverRune: { id: "soulreaverRune", name: "Soulreaver Rune", icon: "💀", category: "mystic", description: "A rune that drinks. The blade is fed.", baseCap: 12, imbueEffect: { damageBonus: 12, hpReturnOnHit: 10, spiritReturnOnHit: 5, label: "+12 dmg, +10 HP, +5 Spirit / hit" }, rarity: "mythic", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },

  // God — the apex. Each is essentially a single-rune build.
  godrune_ofTheSun: { id: "godrune_ofTheSun", name: "Godrune of the Sun", icon: "🌞", category: "mystic", description: "The Sun's own rune. The day is on your side and stays.", baseCap: 3, imbueEffect: { hpReturnOnHit: 25, hpRegenPerMinute: 12, critChanceBonus: 0.1, damageBonus: 8, label: "+25 HP / hit, +12 HP/min, +10% crit, +8 dmg" }, rarity: "god", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  godrune_ofTheBend: { id: "godrune_ofTheBend", name: "Godrune of the Bend", icon: "🌑", category: "mystic", description: "The Moon's own rune. Spirit floods you.", baseCap: 3, imbueEffect: { spiritReturnOnHit: 25, spiritRegenPerMinute: 12, damageBonus: 10, label: "+25 Spirit / hit, +12 Spirit/min, +10 dmg" }, rarity: "god", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  godrune_ofTheWorld: { id: "godrune_ofTheWorld", name: "Godrune of the World", icon: "🌐", category: "mystic", description: "The world's name in rune-form. Everything goes your way.", baseCap: 3, imbueEffect: { hpRegenPerMinute: 20, damageBonus: 12, accBonus: 0.12, critChanceBonus: 0.1, label: "+20 HP/min, +12 dmg, +12% acc, +10% crit" }, rarity: "god", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  godrune_ofTheSigil: { id: "godrune_ofTheSigil", name: "Godrune of the Sigil", icon: "🪐", category: "mystic", description: "The rune that ends all rune-arguments.", baseCap: 3, imbueEffect: { accBonus: 0.25, critChanceBonus: 0.25, damageBonus: 12, label: "+25% acc, +25% crit, +12 dmg" }, rarity: "god", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  godrune_ofTheVoid: { id: "godrune_ofTheVoid", name: "Godrune of the Void", icon: "⚫", category: "mystic", description: "The rune that knows what nothing means.", baseCap: 2, imbueEffect: { damageBonus: 30, sanityCostOnHit: 6, echoChance: 0.5, critChanceBonus: 0.15, label: "+30 dmg, −6 San / hit, 50% echo, +15% crit" }, rarity: "god", hiddenUntil: { researched: "voidcall" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  godrune_ofTheStone: { id: "godrune_ofTheStone", name: "Godrune of the Stone", icon: "🗿", category: "mystic", description: "The first rune the world ever made.", baseCap: 3, imbueEffect: { hpRegenPerMinute: 15, durabilitySaveChance: 0.95, damageBonus: 10, hpReturnOnHit: 8, label: "+15 HP/min, 95% wear save, +10 dmg, +8 HP / hit" }, rarity: "god", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  godrune_ofMemory: { id: "godrune_ofMemory", name: "Godrune of Memory", icon: "🔔", category: "mystic", description: "The rune that holds every echo ever made.", baseCap: 3, imbueEffect: { echoChance: 0.75, damageBonus: 15, label: "75% echo, +15 dmg" }, rarity: "god", hiddenUntil: { researched: "arcaneAwakening" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
  godrune_oblivion: { id: "godrune_oblivion", name: "Godrune of Oblivion", icon: "🩸", category: "mystic", description: "The last rune. The apex. The one the world fears.", baseCap: 1, imbueEffect: { damageBonus: 50, sanityCostOnHit: 10, echoChance: 0.6, critChanceBonus: 0.2, accBonus: 0.2, label: "+50 dmg, −10 San / hit, 60% echo, +20% crit/acc" }, rarity: "god", hiddenUntil: { researched: "voidcall" }, hiddenName: "???", hiddenIcon: "❓", hiddenDescription: "An unknown rune.", hiddenCategory: "unknown" },
};

export const getResource = (id) => RESOURCES[id] || null;
export const getAllResources = () => Object.values(RESOURCES);
export const getResourcesByCategory = (cat) => Object.values(RESOURCES).filter((r) => r.category === cat);
export function isResourceHidden(state, resource) { if (!resource?.hiddenUntil) return false; const { researched } = resource.hiddenUntil; if (researched && state.run?.researched?.[researched]) return false; if (state.persistent?.permanentlyKnown?.[resource.id]) return false; return true; }

// Virtual water — sum across the WATER_TIERS ladder.
export function totalWater(inv) {
  if (!inv) return 0;
  let n = 0;
  for (const id of WATER_TIERS) n += inv[id] || 0;
  return n;
}

// Spend from worst tier first (stagnant before muddy before boiled).
export function spendWater(inv, qty) {
  let remaining = qty;
  const next = { ...inv };
  for (const id of WATER_TIERS) {
    if (remaining <= 0) break;
    const have = next[id] || 0;
    if (have <= 0) continue;
    const taken = Math.min(have, remaining);
    next[id] = have - taken;
    remaining -= taken;
  }
  return next;
}

// Display-time resource — swaps in the hidden{Name,Icon,Description,Category}
// payload when the hide condition is still true. Also tags ._displayCategory
// so inventory grouping uses the masked category.
export function getDisplayResource(state, resource) {
  if (!resource?.hiddenUntil) {
    return { ...resource, _displayCategory: resource.category };
  }
  const { researched } = resource.hiddenUntil;
  const known = !!(researched && state.run.researched?.[researched])
              || !!state.persistent?.permanentlyKnown?.[resource.id];
  if (known) return { ...resource, _displayCategory: resource.category };
  return {
    ...resource,
    name: resource.hiddenName || resource.name,
    icon: resource.hiddenIcon || resource.icon,
    description: resource.hiddenDescription || resource.description,
    _displayCategory: resource.hiddenCategory || resource.category,
  };
}

export function getInventoryItem(state, id) {
  const res = getResource(id);
  if (res) {
    const displayed = getDisplayResource(state, res);
    return { kind: "resource", id, raw: res, displayed };
  }
  const tool = TOOLS[id];
  if (tool) {
    return {
      kind: "tool", id, raw: tool,
      displayed: { ...tool, _displayCategory: "tool" },
    };
  }
  return null;
}
