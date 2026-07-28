// RUN state — wipes on prestige (and on RESET_RUN).

import { freshEquipped } from "../systems/equipment.js";

export const RUN_DEFAULTS = {
  startedAt: 0,
  era: 0,
  inventory: {
    wood: 0, stone: 0, fragments: 0,
    water_stagnant: 0, water_muddy: 0, water_boiled: 0,
  },
  gathered: {
    wood: 0, stone: 0, fragments: 0,
    water_stagnant: 0, water_muddy: 0, water_boiled: 0,
  },
  gatherCount: 0,
  lastGatheredAt: 0,
  rockFound: false,
  rockAwakened: false,
  rockAwakenedAt: 0,
  built: {},
  researched: {},
  stats: {
    hunger: 0, thirst: 0, energy: 100, hp: 100, happiness: 50, sanity: 50,
    spirit: 50,
  },
  splashSeen: false,
  events: { cooldowns: {}, lastIntervalMs: 0 },
  activeEvent: null,
  alignment: { good: 0, evil: 0 },

  skills: {},
  toolsCrafted: {},
  toolDurability: {},
  lastHuntAt: 0,

  lastPatrolAt: 0,
  mobsDefeated: {},

  activeLoop: null,
  workersLastTickAt: 0,
  activePile: { targetKey: null, drops: {} },

  lastPassiveTickAt: 0,
  passiveAccum: {},

  activePests: {},

  lastSpoilTickAt: 0,
  spoilAccum: {},

  eraMilestonesSeen: {},

  spellCooldowns: {},
  statuses: {},

  studyProgress: {},
  activeStudyId: null,

  activeCraft: null,

  weaponImbues: {},
  enchantments: {},

  // Town / Economy
  population: 0,
  populationGrowAccum: 0,
  lastPopulationTickAt: 0,
  recipeAccum: {},
  lastRecipeTickAt: 0,
  consumptionAccum: {},
  lastConsumptionTickAt: 0,
  shortageMs: {},
  shortageLastLossAt: {},
  destroyedBuildings: {},
  tradeRouteLastAt: {},

  // #202 — companions / pets. One active at a time, full roster in owned.
  companions: { active: null, owned: {} },
  // #212 — active summon (Era 4). Temporary realm-pulled ally; own slot,
  // stacks with companion. Shape: { id, bindAt, expiresAt, productionTarget? }
  activeSummon: null,
  // #223 — queued tinker item (consumed on next patrol/combat). Shape:
  // { id, useKind: "combat-throw"|"patrol-set"|"exit", effect, queuedAt }
  activeTinker: null,
  // #213 — rebellion tracking.
  moraleLowSince: 0,
  rebellionActiveSince: null,
  lastRebellionTickAt: 0,
  // #214 — tainted buildings (Era 4 raid corruption).
  taintedBuildings: {},
  // #225 — Era 5 reckoning clock + Heralds.
  reckoningClock: null,           // wall-clock ms when apex fires
  reckoningStartedAt: 0,          // wall-clock ms when clock started
  reckoningDurationMs: 0,         // mirrors RECKONING_DURATION_MS; tunable
  reckoningPhase: null,           // "shudders" | "heralds" | "apex" | null
  reckoningClockPaused: false,
  heraldsSpawned: [],
  heraldsSurvived: [],
  activeHerald: null,             // { id, kind, shape, spawnedAt }
  eraArc: null,                   // "mending" | "communion" | "defiance"
  apexSummonBound: false,         // set by summoning.js on apex bind
  lastListenerDrainAt: 0,         // throttle the Listener's per-min drain
  // #205 — cached era + distinct paths count for Era 4 gate.
  // (era is written by SYNC_ERA; mirror of computeEra(state).)

  morale: 50,
  lastMoraleTickAt: 0,
  assignments: {},
  blessings: {},
  studiesCompleted: {},
  lastStudyTickAt: 0,
  studyStatBonuses: {},
  lastActionAt: 0,

  // World Score
  worldScore: 0,
  worldScoreAccum: 0,
  lastWorldScoreTickAt: 0,
  worldScoreRevealed: false,

  // #205 — distinct-paths cache for Era 4 entry gate.
  _era4PathsCount: 0,

  // Equipment.
  equipped: freshEquipped(),

  // Combat style (#82) — melee / ranged / magic.
  combatStyle: "melee",

  log: [],
};

export function freshRun() {
  return {
    ...structuredClone(RUN_DEFAULTS),
    equipped: freshEquipped(),
    startedAt: Date.now(),
  };
}
