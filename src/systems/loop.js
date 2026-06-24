// Auto-loop runner (#68 Phase 1, extended in #97 for gather discipline).
import { performPatrol, getPatrolCooldownMs, canPatrol } from "./patrol.js";
import { performHunt, getHuntCooldownMs, canHunt } from "./hunting.js";
import { performGatherNode, getGatherNodeCycleMs, canGatherNode } from "./gather.js";
import { getGatherNode } from "../content/gatherNodes.js";

export function getActiveLoop(state) {
  return state.run.activeLoop || null;
}

export function getLoopProgress(loop, now = Date.now()) {
  if (!loop || !loop.cycleMs) return 0;
  const elapsed = now - (loop.startedAt || now);
  return Math.max(0, Math.min(1, elapsed / loop.cycleMs));
}

export function computeCycleMs(state, kind, target = {}) {
  if (kind === "patrol") return getPatrolCooldownMs(state);
  if (kind === "hunt") return getHuntCooldownMs(state);
  if (kind === "gather") {
    const node = getGatherNode(target?.nodeId);
    return getGatherNodeCycleMs(node);
  }
  return 8_000;
}

function fireForKind(state, kind, target) {
  if (kind === "patrol") return performPatrol(state, target);
  if (kind === "hunt") return performHunt(state, target);
  if (kind === "gather") return performGatherNode(state, target);
  return { run: state.run, persistent: state.persistent, events: [] };
}

function loopShouldAbort(state, loop) {
  if (!loop) return null;
  if (loop.kind === "patrol") {
    const check = canPatrol(state, Date.now());
    if (!check.ok && !/Catch your breath/i.test(check.reason || "")) {
      return check.reason || "Patrol stopped.";
    }
  }
  if (loop.kind === "hunt") {
    const check = canHunt(state);
    if (!check.ok && !/Catching your breath/i.test(check.reason || "")) {
      return check.reason || "Hunt stopped.";
    }
  }
  if (loop.kind === "gather") {
    const check = canGatherNode(state, loop.target?.nodeId);
    if (!check.ok) return check.reason || "Gather stopped.";
  }
  return null;
}

function targetKey(kind, target) {
  if (!kind) return null;
  if (target?.mobId) return `${kind}:mob:${target.mobId}`;
  if (target?.bossId) return `${kind}:boss:${target.bossId}`;
  if (target?.preyId) return `${kind}:prey:${target.preyId}`;
  if (target?.nodeId) return `${kind}:node:${target.nodeId}`;
  return `${kind}:any`;
}

export function setActiveLoop(state, kind, target = {}, now = Date.now()) {
  const cur = state.run.activeLoop;
  const sameTarget =
    cur &&
    cur.kind === kind &&
    JSON.stringify(cur.target || {}) === JSON.stringify(target || {});
  if (sameTarget) {
    return { run: state.run, persistent: state.persistent, events: [] };
  }
  const cycleMs = computeCycleMs(state, kind, target);
  const newKey = targetKey(kind, target);
  // #156 — start the timer fresh. The full cycleMs must elapse before
  // the first cycle fires. Previously we biased startedAt back by one
  // cycle so a click triggered instantly, but that meant cancelling
  // before the visible progress bar finished still granted the kill +
  // drops — the player could "accidentally" complete actions just by
  // clicking and immediately clicking away. With a fair timer, the kill
  // counts only when the bar fills, and cancelling truly cancels.
  const startedAt = now;
  return {
    run: {
      ...state.run,
      activeLoop: { kind, target, startedAt, cycleMs },
      activePile: { targetKey: newKey, drops: {} },
    },
    persistent: state.persistent,
    events: [],
  };
}

export function clearActiveLoop(state) {
  if (!state.run.activeLoop) {
    return { run: state.run, persistent: state.persistent, events: [] };
  }
  return {
    run: {
      ...state.run,
      activeLoop: null,
      activePile: { targetKey: null, drops: {} },
    },
    persistent: state.persistent,
    events: [],
  };
}

export function tickActiveLoop(state, now = Date.now()) {
  const loop = state.run.activeLoop;
  if (!loop) return { run: state.run, persistent: state.persistent, events: [] };

  const abortReason = loopShouldAbort(state, loop);
  if (abortReason) {
    return {
      run: { ...state.run, activeLoop: null, activePile: { targetKey: null, drops: {} } },
      persistent: state.persistent,
      events: [{ kind: "loop", message: `⏹ ${abortReason}` }],
    };
  }

  const cycleMs = loop.cycleMs || computeCycleMs(state, loop.kind, loop.target);
  let curState = state;
  let lastStart = loop.startedAt || now;
  const allEvents = [];
  let fired = 0;
  const MAX_FIRES = 6;

  while (now - lastStart >= cycleMs && fired < MAX_FIRES) {
    const beforeInv = curState.run.inventory || {};
    const result = fireForKind(curState, loop.kind, loop.target);
    allEvents.push(...(result.events || []));
    // Belt-and-suspenders: never let persistent be dropped through the
    // loop chain — fireForKind callees may forget to thread it back.
    curState = {
      run: result.run,
      persistent: result.persistent || curState.persistent,
    };

    const afterInv = curState.run.inventory || {};
    const pile = { ...(curState.run.activePile?.drops || {}) };
    let changed = false;
    for (const id of Object.keys(afterInv)) {
      const delta = (afterInv[id] || 0) - (beforeInv[id] || 0);
      if (delta > 0) {
        pile[id] = (pile[id] || 0) + delta;
        changed = true;
      }
    }
    if (changed) {
      curState = {
        ...curState,
        run: {
          ...curState.run,
          activePile: {
            targetKey: curState.run.activePile?.targetKey || targetKey(loop.kind, loop.target),
            drops: pile,
          },
        },
      };
    }
    lastStart += cycleMs;
    fired++;

    const reab = loopShouldAbort(curState, curState.run.activeLoop);
    if (reab) {
      return {
        run: { ...curState.run, activeLoop: null, activePile: { targetKey: null, drops: {} } },
        persistent: curState.persistent,
        events: [...allEvents, { kind: "loop", message: `⏹ ${reab}` }],
      };
    }
  }

  if (fired === 0) {
    return { run: state.run, persistent: state.persistent, events: [] };
  }

  const nextCycleMs = computeCycleMs(curState, loop.kind, loop.target);
  return {
    run: {
      ...curState.run,
      activeLoop: { ...loop, startedAt: lastStart, cycleMs: nextCycleMs },
    },
    persistent: curState.persistent,
    events: allEvents,
  };
}
