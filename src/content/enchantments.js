// Weapon enchantments (#37) — DATA, not code.
//
// The second-pathway buff system that the original #37 spec called for.
// Distinct from runes:
//   • Runes (Runesmithing): consumable, removable, multi-slot per weapon
//     tier (1–4), broad effects, available from Era 3 onward.
//   • Enchants (this file):  PERMANENT once applied, study-gated, fewer
//     slots per weapon tier (1–3), single focused effect, granted at
//     the Stone Altar after the player has walked the matching path.
//
// Each enchantment lives on a specific Study path so completing that
// path unlocks the enchant in the UI. Cost is paid in fragments +
// spirit (the same "deep magic" currencies used by Arcane Studies).
//
// Combat math reads `effect` via systems/combat.js getEffectiveImbueEffects
// — same schema as rune.imbueEffect, so the existing aggregator picks up
// enchantments transparently.

export const ENCHANTMENTS = {
  // ─── Light path ──────────────────────────────────────────────────
  mendingAura: {
    id: "mendingAura",
    name: "Mending Aura",
    icon: "💗",
    path: "light",
    description: "The blade hums in time with the bearer's heartbeat. Wounds close as you strike.",
    requires: { studied: "greaterMending" },
    cost: { fragments: 8, spirit: 30 },
    effect: { hpReturnOnHit: 4, hpRegenPerMinute: 2, label: "+4 HP / hit, +2 HP / min" },
  },
  blessingMark: {
    id: "blessingMark",
    name: "Blessing Mark",
    icon: "🌅",
    path: "light",
    description: "The first sun's light, etched into the steel. The blade refuses to land badly.",
    requires: { studied: "blessing" },
    cost: { fragments: 12, spirit: 40 },
    effect: { accBonus: 0.08, critChanceBonus: 0.06, label: "+8% acc, +6% crit" },
  },

  // ─── Bend path ───────────────────────────────────────────────────
  drainSigil: {
    id: "drainSigil",
    name: "Drain Sigil",
    icon: "🌑",
    path: "bend",
    description: "Each blow pulls a thread of will from what it touches. The blade keeps a little.",
    requires: { studied: "greaterBend" },
    cost: { fragments: 8, spirit: 30 },
    effect: { spiritReturnOnHit: 4, spiritRegenPerMinute: 2, label: "+4 Spirit / hit, +2 Spirit / min" },
  },
  dominanceWard: {
    id: "dominanceWard",
    name: "Dominance Ward",
    icon: "👁️",
    path: "bend",
    description: "The weapon carries a fragment of the dominator's mind. Strikes find the gap in resolve.",
    requires: { studied: "dominate" },
    cost: { fragments: 12, spirit: 40 },
    effect: { damageBonus: 6, sanityCostOnHit: 1, label: "+6 dmg, −1 Sanity / hit" },
  },

  // ─── Elemental path ──────────────────────────────────────────────
  greenward: {
    id: "greenward",
    name: "Greenward",
    icon: "🌿",
    path: "elemental",
    description: "Vines of bound shard wrap the haft. The world steadies its bearer.",
    requires: { studied: "stoneMend" },
    cost: { fragments: 8, spirit: 30 },
    effect: { hpRegenPerMinute: 3, damageReduction: 0.05, label: "+3 HP / min, −5% dmg taken" },
  },

  // ─── Sigilcraft path ─────────────────────────────────────────────
  trueStrikeSigil: {
    id: "trueStrikeSigil",
    name: "Truestrike Sigil",
    icon: "✒️",
    path: "sigilcraft",
    description: "A sigil the eye learns to trace mid-swing. The hand follows.",
    requires: { studied: "firstSigil" },
    cost: { fragments: 8, spirit: 30 },
    effect: { accBonus: 0.10, critChanceBonus: 0.08, label: "+10% acc, +8% crit" },
  },

  // ─── Memory path ─────────────────────────────────────────────────
  echoWeave: {
    id: "echoWeave",
    name: "Echo Weave",
    icon: "🔔",
    path: "memory",
    description: "The blade remembers every cut. Some strikes ring twice.",
    requires: { studied: "firstEcho" },
    cost: { fragments: 10, spirit: 35 },
    effect: { echoChance: 0.20, damageBonus: 2, label: "20% echo, +2 dmg" },
  },

  // ─── Stoneword path ──────────────────────────────────────────────
  wardward: {
    id: "wardward",
    name: "Wardward",
    icon: "👂",
    path: "stoneword",
    description: "The metal listens to the bone it strikes. Both endure longer.",
    requires: { studied: "firstStoneword" },
    cost: { fragments: 8, spirit: 30 },
    effect: { durabilitySaveChance: 0.30, hpRegenPerMinute: 1, label: "30% wear save, +1 HP / min" },
  },

  // ─── Voidcall path (apex) ───────────────────────────────────────
  voidmark: {
    id: "voidmark",
    name: "Voidmark",
    icon: "⚫",
    path: "voidcall",
    description: "A mark that is also an absence. The strike cuts what isn't there.",
    requires: { studied: "voidcall", alignment: { evil: 5 } },
    cost: { fragments: 20, spirit: 60 },
    effect: {
      damageBonus: 12, critChanceBonus: 0.10, sanityCostOnHit: 2,
      label: "+12 dmg, +10% crit, −2 Sanity / hit",
    },
  },
};

export function getEnchantment(id) { return ENCHANTMENTS[id] || null; }
export function getAllEnchantments() { return Object.values(ENCHANTMENTS); }
