// Era 5 — Reckoning clock config (#225).
//
// Single source of truth for the doomsday-clock duration + phase
// fractions. Tunable here so playtest can find the sweet spot.

// Total clock duration from Era 5 entry to apex event. Tune via playtest.
// Default 3 hours of online playtime; dev panel can override at runtime.
export const RECKONING_DURATION_MS = 3 * 60 * 60 * 1000;

// Phase fractions of the total clock. The Heralds spawn at these points.
export const RECKONING_PHASES = {
  shudders: { start: 0.0,  end: 0.33 },
  heralds:  { start: 0.33, end: 0.66 },
  apex:     { start: 0.66, end: 1.0  },
};

// Herald spawn marks (fractions of total clock).
export const HERALD_SPAWN_FRACTIONS = [0.33, 0.50, 0.66];

// Path-switch penalty (stacks all four).
export const PATH_SWITCH_PENALTY = {
  clockTimeOffMs: 20 * 60 * 1000,           // -20 min off remaining clock
  cost: { aether_iron: 30, conduit_core: 5, fragments: 50 },
  sanityHit: 20,                             // -20 sanity
  // Plus: opposite alignment counter zeroed (handled in penalty fn)
  // Plus: all surviving Heralds re-spawn (handled in penalty fn)
};

// Touched Memory echo upgrade ladder — preserves Era 5 resources across
// prestige.  Wiring lives in systems/echoes.js.
export const TOUCHED_MEMORY_TIERS = {
  touched_memory_i:   { cost: 8,   keep: 1   },
  touched_memory_ii:  { cost: 25,  keep: 3   },
  touched_memory_iii: { cost: 75,  keep: 10  },
  touched_memory_iv:  { cost: 150, keep: -1  }, // -1 = all
};

// Path-flavored apex events.
export const APEX_EVENTS = {
  mending: {
    id: "apex_mending",
    name: "The First Light Returns",
    arc: "mending",
    ritualCost: { firstLightShard: 10 },
    requires: { worldScoreMin: 100, summonBound: "aspectOfTheFirstLight" },
    onCompleteMessage: "☀️ The First Light returns. The world remembers itself.",
  },
  communion: {
    id: "apex_communion",
    name: "The Embrace",
    arc: "communion",
    ritualCost: { voidResidue: 5 },
    requires: { alignmentEvilMin: 40, summonBound: "wraithOfTheHollow" },
    villagerCost: 15, // TBD via playtest — currently 15 (was 30 in v1)
    onCompleteMessage: "🌀 The cosmos embraces you. The settlement is part of something larger now.",
  },
  defiance: {
    id: "apex_defiance",
    name: "The Last Stand",
    arc: "defiance",
    ritualCost: { voidResidue: 3 },
    requires: { populationMin: 50, hasBuilding: "bastionOfStone", weaponMin: 20 },
    onCompleteMessage: "⚔️ You stood. The world bent, and you did not. Some of you. Most of you.",
  },
};
