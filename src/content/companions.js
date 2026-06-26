// Companions / pets (#202) — DATA, not code.
//
// A companion is a creature or follower that walks with the player.
// One is "active" at a time; the rest sit in the roster. Each provides
// a passive bonus through fields the various systems read.
//
// Schema:
//   id, name, icon, description       — identity
//   era                               — earliest era this companion appears
//   bond                              — relationship flavor ("loyal", "wary", etc.)
//   bonuses: {                        — read by various systems
//     hpRegenPerMin?
//     spiritPerMin?
//     defense?                        — adds to settlement defense (incl. army)
//     gatherDropMult?                 — multiplies gather drop yields
//     gatherChanceBonus?              — adds to gather success roll
//     runeChanceBonus?                — adds to rune drops on combat
//     weaponDropChance?               — chance of bonus weapon on patrol victory
//     storageCapMult?                 — multiplies inventory caps
//   }
//   requires: { ... }                 — gate for canRecruit (research/built/mob kills)
//   cost: { fragments?, food?, ... }  — one-time recruit cost
//   flavor: { onRecruit, onActivate } — log lines

export const COMPANIONS = {
  // ─── Era 1 ─────────────────────────────────────────────────────────
  strayDog: {
    id: "strayDog", name: "Stray Dog", icon: "🐕",
    era: 1, bond: "wary",
    description: "Half-feral, ribs showing. Follows at a distance until you leave it half a rabbit by the fire. Then it's yours.",
    bonuses: {
      hpRegenPerMin: 1,
      gatherChanceBonus: 0.05,
    },
    requires: { mobsDefeated: { wildDog: 1 }, hasBuilding: "hut" },
    cost: { food: 10 },
    flavor: {
      onRecruit: "🐕 You set out the meat and don't watch. By morning the dog has chosen you.",
      onActivate: "🐕 The dog falls in at your heel.",
    },
  },

  petCrow: {
    id: "petCrow", name: "Pet Crow", icon: "🐦‍⬛",
    era: 1, bond: "curious",
    description: "Black-eyed, head cocked, dropping things at your feet — buttons, bones, the occasional shard. It seems to want to be useful.",
    bonuses: {
      gatherDropMult: 1.1,
      runeChanceBonus: 0.03,
    },
    requires: { hasBuilding: "hut" },
    cost: { food: 5, feathers: 3 },
    flavor: {
      onRecruit: "🐦‍⬛ The crow lands on your shoulder. It hasn't been invited but it isn't leaving.",
      onActivate: "🐦‍⬛ The crow lifts off and circles. Wherever you go, it sees first.",
    },
  },

  // ─── Era 2 ─────────────────────────────────────────────────────────
  oldVeteran: {
    id: "oldVeteran", name: "Old Veteran", icon: "🪖",
    era: 2, bond: "steady",
    description: "Walks with a limp. Knows the names of dead generals. Won't say which side they were on. The sword they carry is older than they are.",
    bonuses: {
      defense: 4,
      weaponDropChance: 0.10,
      hpRegenPerMin: 1,
    },
    requires: { hasBuilding: "walls" },
    cost: { tarnished_coin: 8, food: 20 },
    flavor: {
      onRecruit: "🪖 They count the coins twice. Then they nod once. That's the deal.",
      onActivate: "🪖 The veteran walks at your shoulder. The road is quieter when they\'re looking down it.",
    },
  },

  stableMule: {
    id: "stableMule", name: "Stable Mule", icon: "🐴",
    era: 2, bond: "indifferent",
    description: "Not friendly. Not particularly cooperative. But it carries more than you can, and it doesn\'t complain. Mostly.",
    bonuses: {
      storageCapMult: 1.15,
      gatherDropMult: 1.05,
    },
    requires: { hasBuilding: "marketplace" },
    cost: { tarnished_coin: 12, food: 15, hide: 3 },
    flavor: {
      onRecruit: "🐴 The mule looks at you, then at the road, then back at you. Acceptable.",
      onActivate: "🐴 The mule clops along behind you. The pack rides easier with it carrying the weight.",
    },
  },

  // ─── Era 3 ─────────────────────────────────────────────────────────
  spiritFamiliar: {
    id: "spiritFamiliar", name: "Spirit Familiar", icon: "🦋",
    era: 3, bond: "bound",
    description: "Pale wings, paler eyes. A piece of the world that has decided it likes the look of you. Or has been told to.",
    bonuses: {
      spiritPerMin: 0.3,
      runeChanceBonus: 0.05,
      hpRegenPerMin: 1,
    },
    requires: { hasBuilding: "stoneAltar", researched: "arcaneAwakening" },
    cost: { fragments: 8, spirit: 20 },
    flavor: {
      onRecruit: "🦋 You speak the binding name once. The familiar settles onto the altar like it always lived there.",
      onActivate: "🦋 The familiar lifts off. The light moves around it strangely.",
    },
  },
};

export const getCompanion = (id) => COMPANIONS[id] || null;
export const getAllCompanions = () => Object.values(COMPANIONS);
