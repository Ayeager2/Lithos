// Primitive + Era 2 + Era 3 tool definitions — DATA, not code.

export const TOOL_CATEGORIES = {
  primitive:  { id: "primitive",  name: "Primitive",  order: 1 },
  bronze:     { id: "bronze",     name: "Bronze",     order: 2 },
  iron:       { id: "iron",       name: "Iron",       order: 3 },
  arcane:     { id: "arcane",     name: "Arcane",     order: 4 },
  alchemy:    { id: "alchemy",    name: "Alchemy",    order: 4.5 },
  consumable: { id: "consumable", name: "Potions",    order: 5 },
};

export const TOOLS = {
  net: {
    id: "net", name: "Net", icon: "🕸️", category: "primitive",
    description: "A loose weave of cordage and lashings. Throw it; pray.",
    cost: { wood: 6, stone: 2 },
    requires: { researched: "netWeaving" },
    effect: { unlocksAction: "hunt" },
    durability: { max: 6, wearsOn: "hunt" },
    effectSummary: "Unlocks the Hunt action. · 6 hunts before it frays.",
    onCraftedMessage: "🕸️ You finish the net. The lashings hold.",
    onBrokenMessage: "🕸️ The net comes apart in your hands.",
    tier: 1, col: 0,
  },

  snare: {
    id: "snare", name: "Snare", icon: "🪤", category: "primitive",
    description: "A loop of cordage hidden where birds land.",
    cost: { wood: 8, stone: 3, feathers: 2 },
    requires: { researched: "trapping", skill: { hunting: 2 } },
    effect: { huntYieldBonus: 1, huntCooldownReduction: 1500, huntBetterBirds: 4 },
    durability: { max: 10, wearsOn: "hunt" },
    effectSummary: "+1 hunt yield · -1500ms hunt cooldown · 10 hunts.",
    onCraftedMessage: "🪤 The snare is set.",
    onBrokenMessage: "🪤 The snare line snaps.",
    tier: 1, col: 1,
  },

  diggingStick: {
    id: "diggingStick", name: "Digging Stick", icon: "🥢", category: "primitive",
    description: "A hardwood shaft, fire-tempered.",
    cost: { wood: 5, stone: 2 },
    requires: { researched: "diggingStickCraft" },
    effect: { gatherSpeedup: 100, waterBonus: 1 },
    durability: { max: 12, wearsOn: "gather" },
    effectSummary: "-100ms gather · +1 water on water gathers · 12 gathers.",
    onCraftedMessage: "🥢 You shape the stick and harden the tip.",
    onBrokenMessage: "🥢 The tip splinters and snaps off.",
    tier: 1, col: 2,
  },

  waterSkin: {
    id: "waterSkin", name: "Water Skin", icon: "🧴", category: "primitive",
    description: "A bladder of stretched hide, sealed with sap.",
    cost: { water: 3, feathers: 1, stone: 1 },
    requires: { researched: "waterCarrying" },
    effect: { waterBonus: 1 },
    durability: { max: 15, wearsOn: "waterGather" },
    effectSummary: "+1 water on water gathers · 15 water-fills.",
    onCraftedMessage: "🧴 You stitch and seal. The skin holds.",
    onBrokenMessage: "🧴 The seal gives way.",
    tier: 1, col: 3,
  },

  // DUAL-USE: hatchet pattern — wood-leaning. Modest combat stats so the
  // player can wield it if needed (subfamily axe; battle axe variant in
  // Phase 5 trades wood-yield for damage). See content/weapons.js for
  // the subfamily pattern.
  stoneAxe: {
    id: "stoneAxe", name: "Stone Axe", icon: "🪓", category: "bronze",
    subfamily: "axe",
    description: "A shaped stone bound to a hardwood haft. The trees give up wood twice as easily now. Wielded, it does its uglier work.",
    cost: { wood: 15, stone: 20 },
    requires: { researched: "smithing", builtBuilding: "forge" },
    effect: { gatherSpeedup: 150, woodBonus: 2 },
    // Combat (Task #33 reads this): hatchet-leaning. Decent damage band,
    // moderate accuracy, low crit. A worse battle axe by design.
    weaponStats: { type: "melee", damage: [3, 6], acc: 0.7, crit: 0.04 },
    durability: { max: 35, wearsOn: "gather" },
    effectSummary: "-150ms gather · +2 wood on wood gathers · 35 gathers. Wieldable: 3-6 dmg.",
    onCraftedMessage: "🪓 The axe head is bound. Weight in the hand. Edges that bite.",
    onBrokenMessage: "🪓 The axe head splits from the haft. Time to make another.",
    tier: 2, col: 0,
  },

  // DUAL-USE: pickaxe — stone-leaning. Bad as a weapon. The player CAN
  // wield it but the numbers won't reward them. War-pick variant in
  // Phase 5 (#36) trades stone-yield for damage.
  stonePickaxe: {
    id: "stonePickaxe", name: "Stone Pickaxe", icon: "⛏️", category: "bronze",
    subfamily: "pickaxe",
    description: "Heavy. Pointed. Made for breaking rock into more rock. Awkward to swing at anything else.",
    cost: { wood: 12, stone: 25 },
    requires: { researched: "smithing", builtBuilding: "forge" },
    effect: { gatherSpeedup: 100, stoneBonus: 2 },
    // Combat: heavy, slow, poor accuracy. Why would you? Mostly so the
    // player CAN if they have to. Numbers say: don't.
    weaponStats: { type: "melee", damage: [2, 5], acc: 0.55, crit: 0.02 },
    durability: { max: 35, wearsOn: "gather" },
    effectSummary: "-100ms gather · +2 stone on stone gathers · 35 gathers. Wieldable (poorly): 2-5 dmg.",
    onCraftedMessage: "⛏️ The pickaxe is whole. The earth's bones look softer now.",
    onBrokenMessage: "⛏️ The pick chips and breaks at the head.",
    tier: 2, col: 1,
  },

  // DUAL-USE: cooking knife pattern — food-leaning. Decent crit (it's a
  // knife). Dagger variant in Phase 5 trades food-bonus for damage + crit.
  boneKnife: {
    id: "boneKnife", name: "Bone Knife", icon: "🔪", category: "bronze",
    subfamily: "knife",
    description: "Sharpened femur, lashed to a stone grip. Better for skinning than swinging — but it'll bite when it has to.",
    cost: { stone: 10, feathers: 3, food: 5 },
    requires: { researched: "smithing", builtBuilding: "forge" },
    effect: { huntYieldBonus: 1, foodBonus: 1 },
    // Combat: high accuracy (it's a known shape in your hand), good crit
    // (sharp), low damage band (it's small).
    weaponStats: { type: "melee", damage: [2, 5], acc: 0.85, crit: 0.1 },
    durability: { max: 40, wearsOn: "hunt" },
    effectSummary: "+1 hunt yield · +1 food on food gathers · 40 hunts. Wieldable: 2-5 dmg, +crit.",
    onCraftedMessage: "🔪 The knife is keen. The bird gives up more meat under your hand now.",
    onBrokenMessage: "🔪 The blade chips and falls from the grip.",
    tier: 2, col: 2,
  },

  // DUAL-USE: ranged. The bow's combat role IS its hunt role — reach.
  // Goes in the ranged slot (`type: "ranged"`). Two-handed in narrative
  // but slot-system-wise it's a single ranged-slot equip.
  bow: {
    id: "bow", name: "Bow", icon: "🏹", category: "bronze",
    subfamily: "bow",
    description: "Curved wood, sinew strung. Reach is not strength — it's better.",
    cost: { wood: 20, feathers: 8, stone: 5 },
    requires: { researched: "fletching", builtBuilding: "forge" },
    effect: { huntCooldownReduction: 2500, huntYieldBonus: 2, huntBetterBirds: 8 },
    // Combat: ranged. High damage, good accuracy, modest crit.
    weaponStats: { type: "ranged", damage: [5, 9], acc: 0.8, crit: 0.05 },
    durability: { max: 40, wearsOn: "hunt" },
    effectSummary: "+2 hunt yield · -2500ms hunt cooldown · way more birds · 40 hunts. Ranged: 5-9 dmg.",
    onCraftedMessage: "🏹 The bow is finished. You draw, release. The arrow flies. Something far falls.",
    onBrokenMessage: "🏹 The string snaps and the limb cracks. A bow's work is done.",
    tier: 2, col: 3,
  },

  // ===== Arcane tier (Era 3) =====

  // DUAL-USE arcane: a dagger that's also a great food-gather tool. Combat
  // stats are dagger-tier (high crit, decent acc) with arcane damage band.
  fragmentKnife: {
    id: "fragmentKnife", name: "Fragment Knife", icon: "🗡️", category: "arcane",
    subfamily: "knife",
    description: "A bone knife rebound. The blade is veined with shard, and the shard hums against the back of your skull when you draw it. The cut is cleaner. The cost is paid elsewhere.",
    cost: { fragments: 5, stone: 10, food: 5 },
    requires: { researched: "arcaneAwakening", builtBuilding: "forge" },
    effect: { huntYieldBonus: 2, foodBonus: 2, sanityPerFoodGather: -1 },
    weaponStats: { type: "melee", damage: [4, 8], acc: 0.88, crit: 0.15 },
    durability: { max: 100, wearsOn: "hunt" },
    effectSummary: "+2 hunt yield · +2 food on food gathers · -1 sanity per food gather (the blade hums) · 100 hunts. Wieldable: 4-8 dmg, high crit.",
    onCraftedMessage: "🗡️ The Fragment Knife is whole. Light bends along the edge.",
    onBrokenMessage: "🗡️ The shard inlay shatters. The blade goes quiet, then breaks.",
    tier: 3, col: 0,
  },

  spiritCenser: {
    id: "spiritCenser", name: "Spirit Censer", icon: "🪔", category: "arcane",
    description: "A small censer of cold metal. It does not burn anything. It hums faintly, and the air around it remembers what air used to feel like.",
    cost: { fragments: 8, stone: 15, water: 5 },
    requires: { researched: "arcaneAwakening", builtBuilding: "alembic" },
    effect: { spiritPerMinute: 1 },
    effectSummary: "+1 Spirit / minute, passive while carried. No durability.",
    onCraftedMessage: "🪔 The Censer is finished. It hums when you carry it.",
    tier: 3, col: 1,
  },

  wardingTalisman: {
    id: "wardingTalisman", name: "Warding Talisman", icon: "🧿", category: "arcane",
    description: "A small carved disc on a cord. The eye watches the dark for you. The dark watches it back, and steps lighter.",
    cost: { fragments: 6, feathers: 5, stone: 10 },
    requires: { researched: "banishSpell", builtBuilding: "alembic" },
    effect: { demonDamageMult: 0.5, demonSanityMult: 0.5 },
    effectSummary: "Demons deal HALF damage AND half sanity drain. No durability.",
    onCraftedMessage: "🧿 The Talisman is bound. You can feel the air thin around it.",
    tier: 3, col: 2,
  },

  // ===== Consumables / Potions (Era 3, require Alembic built) =====

  potionMending: {
    id: "potionMending", name: "Potion of Mending", icon: "🧪",
    category: "consumable",
    consumable: true,
    isStackable: true,
    description: "Cloudy and warm. Tastes of stone. Closes wounds the body had given up on.",
    cost: { fragments: 2, food: 5, water: 3 },
    requires: { researched: "alchemy", builtBuilding: "alembic" },
    useEffect: { hp: 40 },
    // Big death-debuff hit — the panic button. 3-4 doses fully clears
    // a fresh death cascade. See systems/death.js + Task #50.
    deathDebuffRecovery: 0.30,
    effectSummary: "Instant +40 HP. Strong death-debuff recovery. Single use.",
    onCraftedMessage: "🧪 A vial of Mending. The cork seats. The fluid steadies.",
    onUseMessage: "🧪 You drink the Mending. The body answers.",
    tier: 3, col: 3,
  },

  potionStillness: {
    id: "potionStillness", name: "Potion of Stillness", icon: "🫧",
    category: "consumable",
    consumable: true,
    isStackable: true,
    description: "Pale. Almost still. Drink, and the panicked mind stops circling.",
    cost: { fragments: 2, feathers: 5, water: 3 },
    requires: { researched: "alchemy", builtBuilding: "alembic" },
    useEffect: { sanity: 30 },
    effectSummary: "Instant +30 Sanity. Single use.",
    onCraftedMessage: "🫧 A vial of Stillness. It does not move when you tilt it.",
    onUseMessage: "🫧 You drink the Stillness. The world stops doing whatever it was doing.",
    tier: 3, col: 4,
  },

  potionSpirit: {
    id: "potionSpirit", name: "Spirit Draught", icon: "💜",
    category: "consumable",
    consumable: true,
    isStackable: true,
    description: "Violet, almost humming. Expensive. Drink it when the spells must keep coming and Rest is not an option.",
    cost: { fragments: 3, water: 10 },
    requires: { researched: "alchemy", builtBuilding: "alembic" },
    useEffect: { spirit: 100 },
    effectSummary: "Instant full Spirit. Single use. Expensive.",
    onCraftedMessage: "💜 A Spirit Draught. The vial hums faintly.",
    onUseMessage: "💜 You drink the Spirit Draught. The Spirit returns in a rush.",
    tier: 3, col: 5,
  },

  // ─── Alchemy recipes that produce craft-material resources (Era 2+) ────
  //
  // These entries live in TOOLS by code-location convenience, but they don't
  // produce tools — they produce *resources*. The `producesResource` field
  // tells the crafting system "when this recipe runs, increment THIS resource
  // in inventory instead of creating a tool instance." See systems/crafting.js
  // canCraft + performCraft producesResource branches.
  //
  // Both gate on `altarWork` researched — same gate as the Stone Altar itself,
  // so when the player learns altarWork they immediately see how to make the
  // materials for studying at the altar.
  //
  // `recipeFamily: "alchemy"` will route these to the Alchemy subtab when the
  // Crafting page (Task #48) lands. See ERA_PLAN.md "Arcane Studies".
  scrollCraft: {
    id: "scrollCraft", name: "Scroll", icon: "📜",
    category: "alchemy",
    isStackable: true,
    recipeFamily: "alchemy",
    description: "Beaten wood-fiber rolled thin. The Stone says it's listening when ink touches it.",
    cost: { wood: 2, fragments: 1 },
    requires: { researched: "altarWork" },
    producesResource: { id: "scroll", qty: 1 },
    effectSummary: "Craft +1 Scroll. Consumed when you begin a study at the Altar.",
    onCraftedMessage: "📜 You roll the parchment thin. It waits for ink.",
    tier: 1, col: 0,
  },

  inkCraft: {
    id: "inkCraft", name: "Ink", icon: "🖋️",
    category: "alchemy",
    isStackable: true,
    recipeFamily: "alchemy",
    description: "Charred wood and crushed grub-dark, stirred until even. Stays black; doesn't dry the way ordinary ink does.",
    cost: { wood: 1, food: 1 },
    requires: { researched: "altarWork" },
    producesResource: { id: "ink", qty: 1 },
    effectSummary: "Craft +1 Ink. Consumed when you begin a study at the Altar.",
    onCraftedMessage: "🖋️ You crush the wood to char, the grub to bitter dark. The ink takes.",
    tier: 1, col: 1,
  },
};

export const getTool = (id) => TOOLS[id] || null;
export const getAllTools = () => Object.values(TOOLS);

export function getOwnedTools(run) {
  const owned = [];
  for (const t of getAllTools()) {
    if ((run?.inventory?.[t.id] || 0) > 0) owned.push(t);
  }
  return owned;
}

export function getToolEffects(run) {
  const eff = {
    unlocksAction: {},
    gatherSpeedup: 0,
    gatherBonus: 0,
    waterBonus: 0,
    woodBonus: 0,
    stoneBonus: 0,
    foodBonus: 0,
    huntYieldBonus: 0,
    huntCooldownReduction: 0,
    huntBetterBirds: 0,
    // Era 3 arcane.
    spiritPerMinute: 0,
    sanityPerFoodGather: 0,
    demonDamageMult: 1.0,
    demonSanityMult: 1.0,
  };
  for (const t of getOwnedTools(run)) {
    if (t.consumable) continue;
    const e = t.effect || {};
    if (e.unlocksAction) eff.unlocksAction[e.unlocksAction] = true;
    if (e.gatherSpeedup) eff.gatherSpeedup += e.gatherSpeedup;
    if (e.gatherBonus) eff.gatherBonus += e.gatherBonus;
    if (e.waterBonus) eff.waterBonus += e.waterBonus;
    if (e.woodBonus) eff.woodBonus += e.woodBonus;
    if (e.stoneBonus) eff.stoneBonus += e.stoneBonus;
    if (e.foodBonus) eff.foodBonus += e.foodBonus;
    if (e.huntYieldBonus) eff.huntYieldBonus += e.huntYieldBonus;
    if (e.huntCooldownReduction) eff.huntCooldownReduction += e.huntCooldownReduction;
    if (e.huntBetterBirds) eff.huntBetterBirds += e.huntBetterBirds;
    if (e.spiritPerMinute) eff.spiritPerMinute += e.spiritPerMinute;
    if (e.sanityPerFoodGather) eff.sanityPerFoodGather += e.sanityPerFoodGather;
    if (typeof e.demonDamageMult === "number") eff.demonDamageMult *= e.demonDamageMult;
    if (typeof e.demonSanityMult === "number") eff.demonSanityMult *= e.demonSanityMult;
  }
  return eff;
}

// ─── Discipline router (#112) — maps a tool to one of the six Crafting
// tabs (blacksmithing / alchemy / fletching / farming / woodworking /
// tailoring). Prefer an explicit `tool.discipline` field; otherwise
// fall back to a category-+-id heuristic so existing content keeps
// working without per-tool edits. Mirrored in CraftingView for the tab
// strip — change both if the rules change.
export function getToolDiscipline(tool) {
  if (!tool) return "blacksmithing";
  if (tool.discipline) return tool.discipline;
  if (tool.category === "consumable" || tool.category === "alchemy") return "alchemy";
  if (tool.id === "bow") return "fletching";
  if (tool.category === "primitive") {
    if (tool.id === "net" || tool.id === "snare" || tool.id === "waterSkin") return "tailoring";
    return "woodworking";
  }
  if (tool.id === "wardingTalisman") return "tailoring";
  if (tool.id === "spiritCenser") return "alchemy";
  // bronze / iron / arcane edged tools default to blacksmithing.
  return "blacksmithing";
}
