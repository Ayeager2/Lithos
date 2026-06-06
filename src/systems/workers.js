// Town workers (#71) — passive patrol drip from Echo-Shop hires.
import { getMobsForEra } from "../content/mobs.js";
import { randInt, pickWeighted } from "../util/rng.js";

const WORKER_CYCLE_MS = 60_000;
const WORKER_WIN_RATE = 0.75;
const WORKER_DROP_QTY_MULT = 0.5;
const MAX_CATCHUP_MS = 30 * 60_000;

export function getWorkerCount(state) {
  return state.persistent?.echoUpgrades?.townWorkers || 0;
}

export function getWorkerCycleMs() {
  return WORKER_CYCLE_MS;
}

function buildWorkerPool() {
  return getMobsForEra(1).map((m) => ({
    weight: m.encounterChance || 0.5,
    mob: m,
  }));
}

function rollWorkerDrops(mob, rng) {
  const out = {};
  for (const d of mob.drops || []) {
    if (rng() >= (d.chance ?? 1)) continue;
    const base = Array.isArray(d.qty) ? randInt(rng, d.qty[0], d.qty[1]) : (d.qty || 1);
    const qty = Math.max(1, Math.floor(base * WORKER_DROP_QTY_MULT));
    out[d.resource] = (out[d.resource] || 0) + qty;
  }
  return out;
}

export function tickWorkers(state, now = Date.now(), rng = Math.random) {
  const count = getWorkerCount(state);
  if (count <= 0) {
    return { run: state.run, events: [] };
  }

  if (!state.run.workersLastTickAt) {
    return {
      run: { ...state.run, workersLastTickAt: now },
      events: [],
    };
  }
  const last = state.run.workersLastTickAt;
  const elapsed = Math.min(MAX_CATCHUP_MS, now - last);
  if (elapsed < WORKER_CYCLE_MS) {
    return { run: state.run, events: [] };
  }

  const cyclesPerWorker = Math.floor(elapsed / WORKER_CYCLE_MS);
  const totalCycles = cyclesPerWorker * count;
  if (totalCycles <= 0) {
    return { run: state.run, events: [] };
  }

  const pool = buildWorkerPool();
  if (pool.length === 0) {
    return {
      run: { ...state.run, workersLastTickAt: last + cyclesPerWorker * WORKER_CYCLE_MS },
      events: [],
    };
  }

  const tally = {};
  let wins = 0;
  let losses = 0;
  for (let i = 0; i < totalCycles; i++) {
    const pick = pickWeighted(rng, pool);
    if (rng() < WORKER_WIN_RATE) {
      wins++;
      const drops = rollWorkerDrops(pick.mob, rng);
      for (const [resId, qty] of Object.entries(drops)) {
        tally[resId] = (tally[resId] || 0) + qty;
      }
    } else {
      losses++;
    }
  }

  const inventory = { ...(state.run.inventory || {}) };
  for (const [resId, qty] of Object.entries(tally)) {
    inventory[resId] = (inventory[resId] || 0) + qty;
  }

  const events = [];
  const dropParts = Object.entries(tally).map(([id, q]) => `+${q} ${id}`);
  if (dropParts.length > 0) {
    events.push({
      kind: "worker",
      message: `🛠 Your workers bring back: ${dropParts.join(", ")}. (${wins} won, ${losses} empty-handed.)`,
    });
  } else if (losses > 0) {
    events.push({
      kind: "worker",
      message: `🛠 Your workers fought ${losses} and came back empty-handed.`,
    });
  }

  return {
    run: {
      ...state.run,
      inventory,
      workersLastTickAt: last + cyclesPerWorker * WORKER_CYCLE_MS,
    },
    events,
  };
}
