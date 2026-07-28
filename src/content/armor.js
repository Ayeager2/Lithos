// Class armor definitions (#210) — DATA, not code.
//
// 3 classes × 3 tiers × 5 slots = 45 armor pieces across Era 2-4.
//
// Classes:
//   warrior — melee. +damage, +HP, +defense. (Plate-style: tusks, leather over iron).
//   ranger  — ranged. +accuracy, +ranged crit, +evasion. (Hide-style: sinew, hide, feathers).
//   mage    — magic. +max spirit, +rune drop, +magic damage. (Robe-style: rags, scrolls, ink).
//
// Tiers:
//   bronze — Era 2. Cheap. Bronze-tier ingredients.
//   iron   — Era 3. Iron + class-specific intermediate (leather / sinew / scrolls).
//   aether — Era 4. Aether iron + conduit cores. +1 enchant slot per piece.
//
// Slots: head, chest, leggings, boots, gloves.
//
// Schema (mirrors weapons + tools, but armor-specific):
//   id, name, icon
//   category: "warriorArmor" | "rangerArmor" | "mageArmor"
//   armorClass: "warrior" | "ranger" | "mage"
//   tier: "bronze" | "iron" | "aether"
//   armorStats: { slot, defense?, hp?, evasion?, acc?, critBonus?,
//                 maxSpiritBonus?, runeChanceBonus?, magicDamageBonus? }
//   durability: { max, wearsOn: "combat" }
//   cost, requires, enchantSlots, effectSummary, tier(layout), col(layout)
//
// Equipment.js getEquippable() reads this via getArmor().

const SLOTS = ["head", "chest", "leggings", "boots", "gloves"];

// Per-class per-tier stat budget. Numbers are total across the 5 pieces;
// each slot gets a fraction (head 20%, chest 30%, leggings 20%, boots 15%,
// gloves 15%). Stats round to ints.
const CLASS_STATS = {
  warrior: {
    bronze: { defense: 5,  hp: 20, primary: { stat: "damageBonus", total: 5 } },
    iron:   { defense: 10, hp: 40, primary: { stat: "damageBonus", total: 12 } },
    aether: { defense: 15, hp: 60, primary: { stat: "damageBonus", total: 20 } },
  },
  ranger: {
    bronze: { defense: 3,  evasion: 0.05, primary: { stat: "accBonus", total: 0.10 } },
    iron:   { defense: 6,  evasion: 0.10, primary: { stat: "accBonus", total: 0.20 } },
    aether: { defense: 10, evasion: 0.15, primary: { stat: "accBonus", total: 0.30 } },
  },
  mage: {
    bronze: { defense: 2,  maxSpiritBonus: 10, primary: { stat: "magicDamageBonus", total: 4 } },
    iron:   { defense: 4,  maxSpiritBonus: 20, primary: { stat: "magicDamageBonus", total: 10 } },
    aether: { defense: 8,  maxSpiritBonus: 30, primary: { stat: "magicDamageBonus", total: 18 } },
  },
};

const SLOT_FRACTIONS = { head: 0.20, chest: 0.30, leggings: 0.20, boots: 0.15, gloves: 0.15 };

const SLOT_DURABILITY = { head: 80, chest: 120, leggings: 100, boots: 80, gloves: 70 };
const TIER_DURA_MULT = { bronze: 1.0, iron: 1.4, aether: 2.0 };

const CLASS_ICON = { warrior: "🛡️", ranger: "🏹", mage: "🪄" };
const SLOT_ICON = {
  head: "🪖", chest: "🦺", leggings: "🦵", boots: "🥾", gloves: "🧤",
};

// Class-specific slot name. Mage uses "Robe" for chest, "Hood" for head, etc.
const CLASS_SLOT_NAMES = {
  warrior: { head: "Helm", chest: "Cuirass", leggings: "Greaves", boots: "Sabatons", gloves: "Gauntlets" },
  ranger:  { head: "Hood", chest: "Vest",   leggings: "Trousers", boots: "Boots",    gloves: "Bracers" },
  mage:    { head: "Hood", chest: "Robe",   leggings: "Skirt",    boots: "Slippers", gloves: "Cuffs" },
};

const TIER_NAME = { bronze: "Bronze", iron: "Iron", aether: "Aether" };

// Tier-specific cost recipes by class.
const COST_RECIPES = {
  warrior: {
    bronze: { stone: 8, iron: 2, hide: 2 },
    iron:   { iron: 6, leather: 2, tusks: 1 },
    aether: { aether_iron: 3, iron: 4, leather: 3, tusks: 2 },
  },
  ranger: {
    bronze: { hide: 3, sinew: 2, wood: 4 },
    iron:   { iron: 2, leather: 3, sinew: 3, feathers: 4 },
    aether: { aether_iron: 2, leather: 4, sinew: 4, feathers: 6 },
  },
  mage: {
    bronze: { rags: 4, sinew: 1 },
    iron:   { rags: 4, ink: 2, scroll: 1, fragments: 3 },
    aether: { aether_iron: 1, rags: 4, scroll: 2, ink: 3, fragments: 6, conduit_core: 1 },
  },
};

// Requires (tier-scoped). Bronze gates on forge, iron on smithing, aether
// on aetherFoundry + Era 4.
const TIER_REQUIRES = {
  bronze: { hasBuilding: "forge" },
  iron:   { researched: "smithing", hasBuilding: "forge" },
  aether: { hasBuilding: "aetherFoundry", era: 4 },
};

const ENCHANT_SLOTS = { bronze: 0, iron: 1, aether: 2 };

// Build a piece def from (class, tier, slot).
function makePiece(armorClass, tier, slot) {
  const stats = CLASS_STATS[armorClass][tier];
  const frac = SLOT_FRACTIONS[slot];
  const armorStats = { slot };

  // Defensive stats — split by slot fraction.
  if (stats.defense) {
    armorStats.defense = Math.max(1, Math.round(stats.defense * frac));
  }
  if (stats.hp) {
    armorStats.hp = Math.max(1, Math.round(stats.hp * frac));
  }
  if (stats.evasion) {
    armorStats.evasion = +(stats.evasion * frac).toFixed(3);
  }
  if (stats.maxSpiritBonus) {
    armorStats.maxSpiritBonus = Math.max(1, Math.round(stats.maxSpiritBonus * frac));
  }
  // Primary stat — gloves/head split (where stats actually live for class).
  // Convention: warrior gloves+head get most of damageBonus; ranger boots+gloves
  // get accBonus; mage hood+cuffs get magicDamageBonus. Use a small offset for
  // distribution.
  const PRIMARY_FRAC = { gloves: 0.30, head: 0.25, chest: 0.20, boots: 0.15, leggings: 0.10 };
  const pf = PRIMARY_FRAC[slot];
  const primaryRaw = stats.primary.total * pf;
  if (stats.primary.stat === "accBonus" || stats.primary.stat === "critBonus") {
    armorStats[stats.primary.stat] = +primaryRaw.toFixed(3);
  } else {
    armorStats[stats.primary.stat] = Math.max(1, Math.round(primaryRaw));
  }
  // Ranger also gets a small rangedCritBonus on chest+head.
  if (armorClass === "ranger" && (slot === "chest" || slot === "head")) {
    armorStats.critBonus = (armorClass === "ranger" && tier === "aether") ? 0.04 : 0.02;
  }
  // Mage also gets runeChanceBonus on chest+gloves at iron+aether.
  if (armorClass === "mage" && tier !== "bronze" && (slot === "chest" || slot === "gloves")) {
    armorStats.runeChanceBonus = tier === "aether" ? 0.03 : 0.02;
  }

  // Discipline routes armor into a craft tab.
  const discipline = armorClass === "mage" ? "tailoring" : (armorClass === "ranger" ? "tailoring" : "blacksmithing");
  const id = `${armorClass}_${tier}_${slot}`;
  const name = `${TIER_NAME[tier]} ${armorClass[0].toUpperCase() + armorClass.slice(1)} ${CLASS_SLOT_NAMES[armorClass][slot]}`;
  const dur = Math.round(SLOT_DURABILITY[slot] * TIER_DURA_MULT[tier]);

  return {
    id, name, icon: CLASS_ICON[armorClass],
    category: `${armorClass}Armor`,
    armorClass, tier, discipline,
    armorStats,
    durability: { max: dur, wearsOn: "combat" },
    cost: { ...COST_RECIPES[armorClass][tier] },
    requires: { ...TIER_REQUIRES[tier] },
    enchantSlots: ENCHANT_SLOTS[tier],
    description: armorDescription(armorClass, tier, slot),
    effectSummary: armorSummary(armorStats, ENCHANT_SLOTS[tier]),
    onCraftedMessage: `${CLASS_ICON[armorClass]} ${name} is whole.`,
    onBrokenMessage: `${CLASS_ICON[armorClass]} The ${CLASS_SLOT_NAMES[armorClass][slot].toLowerCase()} breaks past mending.`,
  };
}

function armorSummary(s, ench) {
  const parts = [];
  if (s.defense) parts.push(`+${s.defense} def`);
  if (s.hp) parts.push(`+${s.hp} HP`);
  if (s.evasion) parts.push(`+${(s.evasion*100).toFixed(0)}% evasion`);
  if (s.accBonus) parts.push(`+${(s.accBonus*100).toFixed(0)}% acc`);
  if (s.critBonus) parts.push(`+${(s.critBonus*100).toFixed(0)}% crit`);
  if (s.damageBonus) parts.push(`+${s.damageBonus} dmg`);
  if (s.magicDamageBonus) parts.push(`+${s.magicDamageBonus} magic dmg`);
  if (s.maxSpiritBonus) parts.push(`+${s.maxSpiritBonus} max Spirit`);
  if (s.runeChanceBonus) parts.push(`+${(s.runeChanceBonus*100).toFixed(0)}% rune`);
  if (ench) parts.push(`${ench} enchant slot${ench>1?"s":""}`);
  return parts.join(" · ");
}

function armorDescription(c, t, s) {
  const tierDesc = t === "bronze"
    ? "Plain craft. The fit is honest."
    : t === "iron"
      ? "Iron-banded, well-shaped. The metal sits where it should."
      : "Aether-iron seams. The air around it carries the forge's residual hum.";
  const classDesc = c === "warrior"
    ? "Built for the line. Stops what doesn't stop on its own."
    : c === "ranger"
      ? "Cut close to the body. Lets you move without telling the world you moved."
      : "Robed, layered, thread-bound with sigils. The cloth listens.";
  return `${tierDesc} ${classDesc}`;
}

// Build the full ARMOR map.
export const ARMOR = {};
for (const armorClass of ["warrior", "ranger", "mage"]) {
  for (const tier of ["bronze", "iron", "aether"]) {
    for (const slot of SLOTS) {
      const piece = makePiece(armorClass, tier, slot);
      ARMOR[piece.id] = piece;
    }
  }
}

export const ARMOR_CATEGORIES = {
  warriorArmor: { id: "warriorArmor", name: "Warrior Armor", order: 1 },
  rangerArmor:  { id: "rangerArmor",  name: "Ranger Armor",  order: 2 },
  mageArmor:    { id: "mageArmor",    name: "Mage Armor",    order: 3 },
};

export const getArmor = (id) => ARMOR[id] || null;
export const getAllArmor = () => Object.values(ARMOR);
export const getArmorByClassAndTier = (armorClass, tier) =>
  Object.values(ARMOR).filter((a) => a.armorClass === armorClass && a.tier === tier);

// Set-bonus matcher — if all 5 pieces of one class+tier are equipped,
// the set bonus applies. Read by combat math.
export const SET_BONUSES = {
  warrior_bronze: { hp: 5, defense: 2 },
  warrior_iron:   { hp: 15, defense: 5, damageBonus: 3 },
  warrior_aether: { hp: 25, defense: 8, damageBonus: 6 },
  ranger_bronze:  { evasion: 0.03, accBonus: 0.02 },
  ranger_iron:    { evasion: 0.08, accBonus: 0.05, critBonus: 0.05 },
  ranger_aether:  { evasion: 0.15, accBonus: 0.10, critBonus: 0.10 },
  mage_bronze:    { maxSpiritBonus: 5, runeChanceBonus: 0.02 },
  mage_iron:      { maxSpiritBonus: 15, runeChanceBonus: 0.05, magicDamageBonus: 4 },
  mage_aether:    { maxSpiritBonus: 30, runeChanceBonus: 0.10, magicDamageBonus: 8 },
};

export function getActiveSetBonus(equipped) {
  // equipped is the run.equipped state object.
  if (!equipped) return null;
  const slots = ["head", "chest", "leggings", "boots", "gloves"];
  // Group equipped armor ids by class+tier.
  const counts = {};
  for (const slot of slots) {
    const inst = equipped[slot];
    if (!inst?.id) continue;
    const def = ARMOR[inst.id];
    if (!def) continue;
    const key = `${def.armorClass}_${def.tier}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  for (const [key, n] of Object.entries(counts)) {
    if (n === 5) return { key, bonus: SET_BONUSES[key] || null };
  }
  return null;
}
