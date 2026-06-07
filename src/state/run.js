// RUN state — wipes on prestige (and on RESET_RUN).

import { freshEquipped } from "../systems/equipment.js";

export const RUN_DEFAULTS = {
  startedAt: 0,
  era: 0,
  inventory: {
    wood: 0, stone: 0, fragments: 0,
    // Water tier ladder — see content/resources.js WATER_TIERS.
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

  // Patrol (#66) — combat-loop action. Cooldown + lifetime mob-kill
  // counts that gate boss unlocks. Shape: { [mobId]: integer }.
  lastPatrolAt: 0,
  mobsDefeated: {},

  // Auto-loop (#68) — single active idle action. When set, the loop
  // runner re-fires the action every `cycleMs`. Clicking any other
  // action replaces this (interrupt model). Shape:
  //   { kind: "patrol", target: { mobId? bossId? }, startedAt, cycleMs }
  // null = no active loop.
  activeLoop: null,

  // Town workers (#71) — passive patrol drip from Echo-Shop-hired
  // townspeople. Cycles every WORKER_CYCLE_MS per worker. Catches up to
  // a cap on each TICK_LOOP. See systems/workers.js.
  workersLastTickAt: 0,

  // Pile of goods (#69) — drops accumulated from the *current* active
  // loop. Resets when the loop target changes (or the loop ends). Keyed
  // by resource id, value is qty looted since loop start.
  //   { targetKey: "mob:wildDog" | "boss:era1_main_…", drops: { resId: N } }
  activePile: { targetKey: null, drops: {} },

  // Passive production
  lastPassiveTickAt: 0,
  passiveAccum: {},

  // Pests
  activePests: {},

  // Spoilage
  lastSpoilTickAt: 0,
  spoilAccum: {},

  // Era milestones already seen this run.
  eraMilestonesSeen: {},

  // Per-spell cooldowns.
  spellCooldowns: {},

  // Active status effects from spells.
  statuses: {},

  // ─── Arcane Studies (Tasks #27, #31) ────────────────────────────────
  // Multiple studies can be in-progress at once; only one accrues time.
  // See systems/studies.js for the full state shape + lifecycle.
  studyProgress: {},      // { [nodeId]: { startedAt, accumulatedMs } }
  activeStudyId: null,    // single active study (nullable)
  studiesCompleted: {},   // { [nodeId]: { completedAt } } — permanent
  lastStudyTickAt: 0,     // for offline-catchup elapsed math
  // Cached stat bumps from study `addsStat` effects (e.g. Wardweave +2 armor).
  // The same values can be recomputed via systems/studies.js
  // getStudyStatBonuses — this field exists so combat systems can read it
  // synchronously without iterating studies each frame.
  studyStatBonuses: {},
  // Stamped on every player-initiated reducer case. Drives the study
  // pause-on-action mechanic — clock only advances when
  // `now - lastActionAt > IDLE_THRESHOLD_MS` (default 5s).
  lastActionAt: 0,

  // ─── World Score (Tasks #29, #31) ───────────────────────────────────
  // Hidden world-restoration score. Contributed by Elemental + Sigilcraft
  // + Memory + Stoneword study completions, event helpfulness, and the
  // Ash Cleanse passive trickle. Eroded by Voidcall casts. See systems/
  // world.js for thresholds and effects, and ERA_PLAN.md "Arcane Studies
  // → World Score".
  worldScore: 0,
  // Fractional accumulator for the Ash Cleanse passive's slow per-minute
  // contribution. Carries the partial point between TICKs until it
  // crosses a whole integer (parallel to passiveAccum for resources).
  worldScoreAccum: 0,
  lastWorldScoreTickAt: 0,
  // One-shot flag set the first time worldScore crosses the apex
  // threshold. Drives the one-time reveal log event in systems/world.js.
  // Resets on prestige (run-local) — the player can re-discover.
  worldScoreRevealed: false,

  // ─── Combat / Equipment (Task #32) ─────────────────────────────────
  // Equipped weapon/armor slot state. See systems/equipment.js for the
  // slot layout (8 main + 13 accessories) and ERA_PLAN.md "Combat +
  // Weapons + Specialized Skills" for the design. We call freshEquipped()
  // here so save.js migrate() spread merges a *valid* default into old
  // saves that don't have the field yet.
  equipped: freshEquipped(),


  // Combat style (#82) — melee / ranged / magic toggle. Drives which
  // weapon slot is consulted, which combat skill earns XP, and which stat
  // scales damage. Magic attacks additionally drain Spirit per swing.
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
