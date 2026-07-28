// Era 5 Heralds (#228) — DATA, not code.
//
// Three Heralds, each appearing at a clock-fraction (0.33 / 0.50 / 0.66).
// Each Herald has THREE path-flavored shapes:
//   • Mending  → dialog (choice prompt + alignment-correct answer)
//   • Communion → ritual combat (obsession meter: claim or push back)
//   • Defiance → straight combat (mortal hero stands against)
//
// Schema:
//   id, name, icon, spawnFraction
//   shapes: { mending: {...}, communion: {...}, defiance: {...} }
//   reward: { resource: qty, ... } (granted on survive)
//
// Survive payouts grant void_residue, conduit_core, fragments + a stat
// bonus. Failing doubles the drain but doesn't end the run.

export const HERALDS = {
  mouthAtTheGate: {
    id: "mouthAtTheGate", name: "Mouth at the Gate", icon: "👁️",
    spawnFraction: 0.33,
    shapes: {
      mending: {
        kind: "dialog",
        prompt: "A tall mouth-shape *asks* at the perimeter. What do you offer it?",
        choices: [
          { id: "mending", label: "Speak a name of light", alignmentCorrect: "mending", reward: { firstLightShard: 1, fragments: 30 } },
          { id: "communion", label: "Offer a fragment of yourself", alignmentCorrect: "communion", reward: { voidResidue: 1, fragments: 30 } },
          { id: "defiance", label: "Refuse — drive it back", alignmentCorrect: "defiance", reward: { voidResidue: 1, fragments: 20 } },
        ],
      },
      communion: {
        kind: "ritual",
        obsessionMax: 100,
        rounds: 5,
        description: "An obsession that wants in. Fill its hunger to satisfy it (claim) or push back (deny).",
        reward: { voidResidue: 2, fragments: 50 },
      },
      defiance: {
        kind: "combat",
        mob: {
          name: "Mouth at the Gate",
          hp: 80, defense: 5, attackDamage: [8, 14], accuracy: 0.80, crit: 0.10,
        },
        reward: { voidResidue: 1, conduit_core: 1, fragments: 40 },
      },
    },
    failureDrain: { sanity: 10, morale: 10, villagers: 1 },
    onSpawnMessage: "👁️ A tall shape at the perimeter. It has no body, only a mouth, and the mouth is asking.",
  },

  shapeOfWhatYouBuilt: {
    id: "shapeOfWhatYouBuilt", name: "The Shape of What You Built", icon: "🏛️",
    spawnFraction: 0.50,
    shapes: {
      mending: {
        kind: "dialog",
        prompt: "A *whole* version of your settlement appears, glowing. It asks what you want kept.",
        choices: [
          { id: "mending", label: "Everything stays, even the broken parts", alignmentCorrect: "mending", reward: { firstLightShard: 2, fragments: 50 } },
          { id: "communion", label: "Take it. Let me build the next one.", alignmentCorrect: "communion", reward: { voidResidue: 2, fragments: 50 } },
          { id: "defiance", label: "What you see is what we earned.", alignmentCorrect: "defiance", reward: { voidResidue: 2, fragments: 30 } },
        ],
      },
      communion: {
        kind: "ritual",
        obsessionMax: 150,
        rounds: 7,
        description: "A *consumed* version of your settlement, beautiful. PROVE you can possess it.",
        reward: { voidResidue: 3, conduit_core: 1, fragments: 70 },
      },
      defiance: {
        kind: "combat",
        mob: {
          name: "Mirror Settlement",
          hp: 140, defense: 10, attackDamage: [12, 20], accuracy: 0.82, crit: 0.12,
        },
        reward: { voidResidue: 2, conduit_core: 1, fragments: 50 },
      },
    },
    failureDrain: { sanity: 15, morale: 10, taintBuildings: 2 },
    onSpawnMessage: "🏛️ A version of your settlement walks out of the dust. It is what you built, only finished. It asks to be let in.",
  },

  theListener: {
    id: "theListener", name: "The Listener", icon: "🕯️",
    spawnFraction: 0.66,
    shapes: {
      mending: {
        kind: "dialog",
        prompt: "A figure that does nothing but listen. It phases through walls. What do you say?",
        choices: [
          { id: "mending", label: "Tell it the name of one villager you loved", alignmentCorrect: "mending", reward: { firstLightShard: 3, fragments: 80 } },
          { id: "communion", label: "Tell it everything. Become a record.", alignmentCorrect: "communion", reward: { voidResidue: 3, fragments: 80 } },
          { id: "defiance", label: "Tell it nothing. Stare back.", alignmentCorrect: "defiance", reward: { voidResidue: 3, fragments: 50 } },
        ],
      },
      communion: {
        kind: "ritual",
        obsessionMax: 200,
        rounds: 10,
        description: "A presence that wants to possess YOU. Fight its will or invite it in.",
        reward: { voidResidue: 4, conduit_core: 2, fragments: 100 },
      },
      defiance: {
        kind: "combat",
        mob: {
          name: "The Listener",
          hp: 220, defense: 12, attackDamage: [18, 28], accuracy: 0.85, crit: 0.15,
        },
        reward: { voidResidue: 3, conduit_core: 2, fragments: 80 },
      },
    },
    failureDrain: { sanity: 0.5, morale: 0.5, perMinute: true }, // for rest of era
    onSpawnMessage: "🕯️ A figure stands inside the wall. It does not breathe. It listens. The villagers stop hearing each other.",
  },
};

export const getHerald = (id) => HERALDS[id] || null;
export const getAllHeralds = () => Object.values(HERALDS);
