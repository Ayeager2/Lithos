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
};

export const getResource = (id) => RESOURCES[id] || null;
export const getAllResources = () => Object.values(RESOURCES);
export const getResourcesByCategory = (category) =>
  getAllResources().filter((r) => r.category === category);

// ─── Virtual-water cost helpers ───────────────────────────────────────
// Buildings, research, tools, and survival actions all carry
// `cost: { water: N }`. With the tier ladder, the "water" key is virtual:
// total = sum across the ladder; spend = lowest tier first.
export function totalWater(inventory) {
  let n = 0;
  for (const id of WATER_TIERS) n += inventory?.[id] || 0;
  return n;
}

export function spendWater(inventory, qty) {
  const out = { ...(inventory || {}) };
  let remaining = qty;
  for (const id of WATER_TIERS) {
    if (remaining <= 0) break;
    const have = out[id] || 0;
    if (have <= 0) continue;
    const take = Math.min(have, remaining);
    out[id] = have - take;
    remaining -= take;
  }
  return out;
}

export function isResourceHidden(state, resource) {
  const h = resource.hiddenUntil;
  if (!h) return false;
  if (state.persistent?.permanentlyKnown?.[resource.id]) return false;
  if (h.researched && !state.run.researched?.[h.researched]) return true;
  if (h.built && !state.run.built?.[h.built]) return true;
  return false;
}

export function getDisplayResource(state, resource) {
  if (!resource) return null;
  if (isResourceHidden(state, resource)) {
    return {
      ...resource,
      name: resource.hiddenName || "???",
      icon: resource.hiddenIcon || "❓",
      description: resource.hiddenDescription || "Unknown.",
      _displayCategory: resource.hiddenCategory || "unknown",
    };
  }
  return { ...resource, _displayCategory: resource.category };
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
      kind: "tool",
      id,
      raw: tool,
      displayed: { ...tool, _displayCategory: "tool" },
    };
  }
  return null;
}
