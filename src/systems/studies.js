// Arcane Studies — timed magic study at the Stone Altar.
//
// Layered ON TOP of the existing Stone's Teachings (listen-once research).
// Where Teachings is instant — listen, pay the cost, you know it forever —
// Studies is *slow*. You sit with the stone. The clock turns over only
// while you're idle. The lesson takes minutes, sometimes more. You can
// keep multiple lessons started; only one accrues time at a time.
//
// See ERA_PLAN.md "Arcane Studies" for the full design.
//
// ─── State shape (lives under run) ─────────────────────────────────────
//
//   run.studyProgress[nodeId] = { startedAt, accumulatedMs }
//     One entry per in-progress study. Persists indefinitely until the
//     study completes or the player explicitly cancels.
//
//   run.activeStudyId
//     The single study currently accruing time. nullable.
//
//   run.lastActionAt
//     Timestamp of the player's most recent world-affecting action
//     (gather/hunt/eat/etc.). Study clock only advances when
//     now - lastActionAt > IDLE_THRESHOLD_MS.
//
//   run.studiesCompleted[nodeId] = { completedAt }
//     Permanent. The study is done; its effect is applied. Studies that
//     have completed don't re-appear as startable.
//
//   run.lastStudyTickAt
//     For elapsed-since-last-tick math. Capped by MAX_CATCHUP_MS.
//
// ─── Public API ─────────────────────────────────────────────────────────
//
//   canStartStudy(state, nodeId)         { ok, reason }
//   performStartStudy(state, nodeId)     { run, persistent, events }
//   performSetActiveStudy(state, nodeId) { run, persistent, events }
//   performCancelStudy(state, nodeId)    { run, persistent, events }
//   tickStudies(state, now?)             { run, events }
//   getStudyState(run, nodeId)           "not-started"|"in-progress"|"complete"
//   getActiveStudyProgress(run)          { nodeId, accumulatedMs, durationMs, pct }|null
//   markActionTaken(run, now?)           returns updated run (helper for reducer)

import {
  getStudy,
  getAllStudies,
  getPathCompletionDelta,
} from "../content/studies.js";
import { totalWater, spendWater } from "../content/resources.js";
import { getAllBuildings } from "../content/buildings.js";

// 5 seconds of doing nothing before the study clock resumes. Keeps the
// rhythm honest — finishing a quick gather doesn't pause your study, but
// real activity does.
export const IDLE_THRESHOLD_MS = 5 * 1000;

// Same cap as passive production. Stops a 6-hour absence from instantly
// completing 6 hours of study.
const MAX_CATCHUP_MS = 30 * 60 * 1000;

// ─── Pure helpers ──────────────────────────────────────────────────────

export function getStudyState(run, nodeId) {
  if (run.studiesCompleted?.[nodeId]) return "complete";
  if (run.studyProgress?.[nodeId]) return "in-progress";
  return "not-started";
}

export function getActiveStudyProgress(run, now = Date.now()) {
  const id = run.activeStudyId;
  if (!id) return null;
  const prog = run.studyProgress?.[id];
  if (!prog) return null;
  const def = getStudy(id);
  if (!def) return null;
  const dur = def.durationMs || 0;

  // Live extrapolation — the reducer only commits accumulatedMs every TICK
  // (currently 15s). For a smooth-moving progress bar, add the live elapsed
  // time since the last study tick to the stored value (clamped to dur).
  // The actual commit still happens on TICK; this is just for display.
  // We only extrapolate when the player has been idle long enough that the
  // clock would actually be running (matching tickStudies' gating).
  const last = run.lastStudyTickAt || prog.startedAt || now;
  const lastAction = run.lastActionAt || 0;
  const idle = now - lastAction >= IDLE_THRESHOLD_MS;
  const liveElapsed = idle ? Math.max(0, now - last) : 0;
  const accumulatedMs = Math.min(
    dur || Infinity,
    (prog.accumulatedMs || 0) + liveElapsed
  );
  return {
    nodeId: id,
    accumulatedMs,
    durationMs: dur,
    pct: dur > 0 ? Math.min(1, accumulatedMs / dur) : 0,
  };
}

// Update the lastActionAt timestamp. Reducer calls this on every player-
// initiated action. Pure function — returns a new run.
export function markActionTaken(run, now = Date.now()) {
  return { ...run, lastActionAt: now };
}

// ─── Gating ────────────────────────────────────────────────────────────

function checkAltarBuilt(state) {
  if (!state.run.built?.stoneAltar) {
    return { ok: false, reason: "You need the Stone Altar first." };
  }
  return { ok: true };
}

function checkRequires(state, def) {
  const req = def.requires || {};
  if (req.parents) {
    for (const pid of req.parents) {
      if (!state.run.studiesCompleted?.[pid]) {
        return { ok: false, reason: "An earlier lesson must come first." };
      }
    }
  }
  if (req.researched && !state.run.researched?.[req.researched]) {
    return { ok: false, reason: "A teaching is missing." };
  }
  if (req.alignment) {
    const align = state.run.alignment || { good: 0, evil: 0 };
    if (req.alignment.good && (align.good || 0) < req.alignment.good) {
      return { ok: false, reason: "Not the soul for this." };
    }
    if (req.alignment.evil && (align.evil || 0) < req.alignment.evil) {
      return { ok: false, reason: "Not the soul for this." };
    }
  }
  return { ok: true };
}

function checkCost(state, def) {
  for (const [res, qty] of Object.entries(def.cost || {})) {
    // Virtual "water" key sums across the tier ladder (see resources.js).
    if (res === "water") {
      if (totalWater(state.run.inventory) < qty) {
        return { ok: false, reason: "Not enough offerings." };
      }
      continue;
    }
    if ((state.run.inventory?.[res] || 0) < qty) {
      return { ok: false, reason: "Not enough offerings." };
    }
  }
  return { ok: true };
}

export function canStartStudy(state, nodeId) {
  const def = getStudy(nodeId);
  if (!def) return { ok: false, reason: "Unknown lesson." };

  if (state.run.studiesCompleted?.[nodeId]) {
    return { ok: false, reason: "Already learned." };
  }
  if (state.run.studyProgress?.[nodeId]) {
    return { ok: false, reason: "Already in progress — make it active instead." };
  }

  const altar = checkAltarBuilt(state);
  if (!altar.ok) return altar;

  const req = checkRequires(state, def);
  if (!req.ok) return req;

  const cost = checkCost(state, def);
  if (!cost.ok) return cost;

  return { ok: true };
}

// ─── Mutations ─────────────────────────────────────────────────────────

export function performStartStudy(state, nodeId, now = Date.now()) {
  const check = canStartStudy(state, nodeId);
  if (!check.ok) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: check.reason }],
    };
  }
  const def = getStudy(nodeId);

  // Spend cost. Virtual "water" drains lowest tier first.
  let inventory = { ...state.run.inventory };
  for (const [res, qty] of Object.entries(def.cost || {})) {
    if (res === "water") {
      inventory = spendWater(inventory, qty);
      continue;
    }
    inventory[res] = (inventory[res] || 0) - qty;
  }

  const studyProgress = {
    ...(state.run.studyProgress || {}),
    [nodeId]: { startedAt: now, accumulatedMs: 0 },
  };

  // Starting a study auto-selects it as active. Player can switch
  // afterwards via setActiveStudy.
  const run = {
    ...state.run,
    inventory,
    studyProgress,
    activeStudyId: nodeId,
    // The act of *setting up* the study counts as an action — pauses the
    // clock for 5s so the player notices the start before time begins.
    lastActionAt: now,
  };

  return {
    run,
    persistent: state.persistent,
    events: [
      {
        kind: "research",
        message:
          def.onStartedMessage ||
          `🕯️ You set the scroll down. ${def.name} — the lesson begins.`,
      },
    ],
  };
}

export function performSetActiveStudy(state, nodeId) {
  // null clears the active study without canceling it.
  if (nodeId === null) {
    return {
      run: { ...state.run, activeStudyId: null },
      persistent: state.persistent,
      events: [],
    };
  }
  if (!state.run.studyProgress?.[nodeId]) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "That lesson hasn't started." }],
    };
  }
  return {
    run: { ...state.run, activeStudyId: nodeId },
    persistent: state.persistent,
    events: [],
  };
}

export function performCancelStudy(state, nodeId) {
  if (!state.run.studyProgress?.[nodeId]) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "That lesson hasn't started." }],
    };
  }
  const studyProgress = { ...(state.run.studyProgress || {}) };
  delete studyProgress[nodeId];
  const activeStudyId =
    state.run.activeStudyId === nodeId ? null : state.run.activeStudyId;
  return {
    run: { ...state.run, studyProgress, activeStudyId },
    persistent: state.persistent,
    events: [
      {
        kind: "research",
        message:
          "📜 You set the unfinished lesson aside. The accumulated time is gone — but you keep the parts of yourself that did the work.",
      },
    ],
  };
}

// ─── Tick ──────────────────────────────────────────────────────────────

// Called every TICK by the reducer. Only the active study accrues time,
// and only when the player has been idle for at least IDLE_THRESHOLD_MS.
// Returns { run, persistent, events } — persistent may be updated when a
// study completes and writes an altar etching.
// #189 — study-speed multiplier. Multiplicative across owned buildings.
// University → 1.25.
export function getStudySpeedMult(state) {
  const built = state.run?.built || {};
  let mult = 1.0;
  for (const b of getAllBuildings()) {
    if (!built[b.id]) continue;
    const m = b.effect?.studySpeedMult;
    if (typeof m === "number" && m > 0) mult *= m;
  }
  return mult;
}

export function tickStudies(state, now = Date.now()) {
  const run = state.run;
  const persistent = state.persistent;
  const activeId = run.activeStudyId;
  if (!activeId) {
    return { run, persistent, events: [] };
  }

  const prog = run.studyProgress?.[activeId];
  if (!prog) {
    // Stale activeStudyId pointing at a non-existent progress entry.
    // Self-heal.
    return {
      run: { ...run, activeStudyId: null },
      persistent,
      events: [],
    };
  }

  const def = getStudy(activeId);
  if (!def) {
    // Study def was removed — abandon.
    const studyProgress = { ...(run.studyProgress || {}) };
    delete studyProgress[activeId];
    return {
      run: { ...run, studyProgress, activeStudyId: null },
      persistent,
      events: [],
    };
  }

  // Are we currently idle? If the most-recent action was within the
  // threshold, the clock doesn't advance this tick.
  const lastActionAt = run.lastActionAt || 0;
  if (now - lastActionAt < IDLE_THRESHOLD_MS) {
    return {
      run: { ...run, lastStudyTickAt: now },
      persistent,
      events: [],
    };
  }

  // Elapsed since last tick, capped for offline catch-up. Note: this is
  // *idle* elapsed — the IDLE_THRESHOLD check above only checks the most
  // recent action. If the player was active 4 minutes ago and then left,
  // the next tick will credit the full 4 minutes minus IDLE_THRESHOLD.
  // That's the intended behavior — the player gets credit for being away.
  const lastTickAt = run.lastStudyTickAt || now;
  const rawElapsed = Math.min(now - lastTickAt, MAX_CATCHUP_MS);
  // #189 — apply study-speed multiplier from civic buildings.
  const elapsedMs = Math.round(rawElapsed * getStudySpeedMult(state));
  if (elapsedMs <= 0) {
    return {
      run: { ...run, lastStudyTickAt: now },
      persistent,
      events: [],
    };
  }

  const accumulated = (prog.accumulatedMs || 0) + elapsedMs;
  const dur = def.durationMs || 0;

  // Not yet complete — advance the timer.
  if (accumulated < dur) {
    return {
      run: {
        ...run,
        studyProgress: {
          ...run.studyProgress,
          [activeId]: { ...prog, accumulatedMs: accumulated },
        },
        lastStudyTickAt: now,
      },
      persistent,
      events: [],
    };
  }

  // Complete. Remove from progress, add to completed, clear active,
  // apply per-path deltas + node effects + altar etchings (Task #31).
  const studyProgress = { ...(run.studyProgress || {}) };
  delete studyProgress[activeId];

  // Build the post-complete run BEFORE applying effects so the "first
  // study overall" check inside applyCompletionEffects can see the
  // pre-completion count (== 0 means this is the first).
  let nextRun = {
    ...run,
    studyProgress,
    activeStudyId: null,
    lastStudyTickAt: now,
  };

  const events = [
    {
      kind: "research",
      message:
        def.onCompletedMessage ||
        `🕯️ The lesson settles. ${def.name} — learned.`,
    },
  ];

  // Apply path delta (sanity / alignment / worldScore) + node effects
  // (addsStat) + altar etchings.
  const effRes = applyCompletionEffects(nextRun, state.persistent, def);
  nextRun = effRes.run;
  events.push(...effRes.events);

  // Now stamp studiesCompleted + recompute Era 4 path-count cache.
  const nextCompleted = {
    ...(nextRun.studiesCompleted || {}),
    [activeId]: { completedAt: now },
  };
  const distinctPaths = new Set();
  for (const id of Object.keys(nextCompleted)) {
    const sd = getStudy(id);
    if (sd?.path) distinctPaths.add(sd.path);
  }
  nextRun = {
    ...nextRun,
    studiesCompleted: nextCompleted,
    _era4PathsCount: distinctPaths.size,
  };

  return {
    run: nextRun,
    persistent: effRes.persistent,
    events,
  };
}

// ─── Completion effects (Task #31) ─────────────────────────────────────
//
// Pure helper that applies a completed study's per-path delta + node-
// specific effect to a (run, persistent) pair. Returns the updated pair
// plus any events to log. Called from tickStudies on completion.
//
// What gets applied:
//   • STUDY_PATHS[study.path].completionDelta — sanity, alignment, worldScore
//   • study.effect.addsStat — permanent stat bumps (currently only `armor`,
//     wired in by Task #39)
//   • Altar etchings — milestone tracking on persistent.altarEtchings
//
// Things deliberately NOT done here:
//   • Spell unlocks — handled passively by spells.js `getKnownSpells` which
//     reads studiesCompleted directly. No per-completion writes needed.
//   • Passives (e.g. waterHoleSpeedBonus, gardenSpeedBonus) — also computed
//     on-demand from studiesCompleted via getStudyPassives below.

function applyCompletionEffects(run, persistent, study) {
  let nextRun = run;
  let nextPersistent = persistent;
  const events = [];

  // Per-path delta: sanity, alignment, worldScore.
  const delta = getPathCompletionDelta(study);
  if (delta) {
    const stats = { ...(nextRun.stats || {}) };
    if (typeof delta.sanity === "number") {
      stats.sanity = Math.max(0, Math.min(100, (stats.sanity ?? 50) + delta.sanity));
    }
    nextRun = { ...nextRun, stats };

    if (delta.alignment) {
      const align = { ...(nextRun.alignment || { good: 0, evil: 0 }) };
      if (delta.alignment.good) align.good = (align.good || 0) + delta.alignment.good;
      if (delta.alignment.evil) align.evil = (align.evil || 0) + delta.alignment.evil;
      nextRun = { ...nextRun, alignment: align };
    }

    if (typeof delta.worldScore === "number" && delta.worldScore !== 0) {
      nextRun = {
        ...nextRun,
        worldScore: (nextRun.worldScore || 0) + delta.worldScore,
      };
    }
  }

  // Node-specific stat bumps (e.g. Wardweave: +2 armor). Stat additions
  // accumulate on run.studyStatBonuses — combat systems read this when
  // they want per-stat boosts from study completions.
  if (study.effect?.addsStat) {
    const bonuses = { ...(nextRun.studyStatBonuses || {}) };
    for (const [k, v] of Object.entries(study.effect.addsStat)) {
      bonuses[k] = (bonuses[k] || 0) + v;
    }
    nextRun = { ...nextRun, studyStatBonuses: bonuses };
  }

  // ─── Altar etchings ────────────────────────────────────────────────
  // Each milestone leaves a mark on the altar. persistent.altarEtchings
  // accumulates across runs (the altar is your trophy wall over many
  // lives — see ERA_PLAN.md "Era 2 → 3 transition" Stone Altar entry).
  //
  // Etching ids are stable strings; future visual rendering reads this
  // map to draw the marks. For now we just record the milestone.
  const etchings = { ...(nextPersistent.altarEtchings || {}) };
  const stampEtching = (id, label) => {
    if (etchings[id]) return false;
    etchings[id] = { stampedAt: Date.now(), label };
    return true;
  };

  // Every study completion stamps a path-specific etching the first
  // time you complete a study in that path.
  if (study.path) {
    if (stampEtching(`path:${study.path}:first`, `First ${study.path} lesson`)) {
      events.push({
        kind: "milestone",
        message: `🕯️ An etching appears on the Altar: First lesson on the ${study.path} path.`,
      });
    }
  }

  // First study completion overall (across all paths) — special etching.
  const completedCount = Object.keys(nextRun.studiesCompleted || {}).length;
  if (completedCount === 0) {
    // we're about to make it 1 in tickStudies — stamp the "first ever" mark
    if (stampEtching("studies:first", "First lesson")) {
      events.push({
        kind: "milestone",
        message: "🕯️ The Altar accepts its first lesson. An etching appears.",
      });
    }
  }

  // Crossover-completion milestone (any node with multiple parents from
  // different paths). We approximate "crossover" as "parents.length > 1"
  // since the content currently uses cross-path parents for these.
  if (study.parents && study.parents.length > 1) {
    if (stampEtching("studies:first-crossover", "First cross-path lesson")) {
      events.push({
        kind: "milestone",
        message: "🕯️ A braided etching deepens on the Altar — the paths spoke to each other.",
      });
    }
  }

  // Voidcall completion — special grave etching.
  if (study.path === "voidcall") {
    if (stampEtching(`voidcall:${study.id}`, `Voidcall: ${study.name}`)) {
      events.push({
        kind: "milestone",
        message: "⚫ A black mark settles on the Altar. The stone does not look at it.",
      });
    }
  }

  if (Object.keys(etchings).length !== Object.keys(nextPersistent.altarEtchings || {}).length) {
    nextPersistent = { ...nextPersistent, altarEtchings: etchings };
  }

  return { run: nextRun, persistent: nextPersistent, events };
}

// ─── Passive bonus accumulators ────────────────────────────────────────
//
// Reads completed studies + their content defs, sums their `effect.passive`
// bags into a single object. Other systems call this when they need a
// specific passive value:
//
//   const p = getStudyPassives(run);
//   const speedBonus = p.waterHoleSpeedBonus || 0;
//
// This is recomputed each call (no caching) — keeps the source of truth on
// studiesCompleted alone, no risk of drift.

export function getStudyPassives(run) {
  const completed = run?.studiesCompleted || {};
  const out = {};
  for (const id of Object.keys(completed)) {
    const def = getStudy(id);
    if (!def?.effect?.passive) continue;
    for (const [k, v] of Object.entries(def.effect.passive)) {
      if (typeof v === "number") {
        out[k] = (out[k] || 0) + v;
      } else if (typeof v === "boolean") {
        out[k] = out[k] || v;
      } else {
        out[k] = v;
      }
    }
  }
  return out;
}

// Reads completed studies' addsStat bumps. Used by systems that want to
// know the player's permanent stat additions from studies (e.g. Armor
// from Wardweave). Note: this reads the LIVE study defs each call, so
// `run.studyStatBonuses` (cached version written at completion time) and
// this function should agree.
export function getStudyStatBonuses(run) {
  const completed = run?.studiesCompleted || {};
  const out = {};
  for (const id of Object.keys(completed)) {
    const def = getStudy(id);
    if (!def?.effect?.addsStat) continue;
    for (const [k, v] of Object.entries(def.effect.addsStat)) {
      out[k] = (out[k] || 0) + v;
    }
  }
  return out;
}

// ─── Visibility helpers (parallel to building.js / research.js) ────────

// Studies the player should see in the Studies UI. Hides alignment-gated
// nodes until the silent counter tips.
export function getKnownStudies(state) {
  return getAllStudies().filter((s) => {
    if (state.run.studiesCompleted?.[s.id]) return true;
    const req = s.requires || {};
    if (req.alignment) {
      const align = state.run.alignment || { good: 0, evil: 0 };
      if (req.alignment.good && (align.good || 0) < req.alignment.good) return false;
      if (req.alignment.evil && (align.evil || 0) < req.alignment.evil) return false;
    }
    return true;
  });
}

export function getStartableStudies(state) {
  return getKnownStudies(state).filter(
    (s) => canStartStudy(state, s.id).ok
  );
}
