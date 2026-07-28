// Rebellion mechanic (#213).
//
// When morale < 20 for 5 sustained minutes, villagers stop just complaining
// and start destroying. Damage fires every 60s in randomized rounds:
//   70%: sweep 30% of one random resource (food/wood/stone primarily)
//   40%: damage a random non-shelter building
//   25%: villager loss (1-2 walk off)
//   10%: clear production assignments (forces re-staffing)
//
// Resolution paths (any clears rebellionActiveSince):
//   1. Morale ≥ 30  (natural recovery)
//   2. Active evil summon w/ suppressesRebellion = true (SUPPRESSES ticks
//      but doesn't clear; morale stays low)
//   3. alignment.evil ≥ 20  (fear keeps order, suppresses ticks)
//   4. Active good summon w/ +morale → naturally raises morale ≥ 30
//   5. Aspect of the First Light on bind (handled in summoning.js by
//      clearing rebellionActiveSince directly)
//
// State touched:
//   run.moraleLowSince         — when morale first crossed below 20
//   run.rebellionActiveSince   — when rebellion was actually triggered
//   run.lastRebellionTickAt    — last damage-round timestamp
//
// Etchings: settlement:rebellion:first on first trigger.

import { stampEtchingOnce } from "./etchings.js";
import { getActiveSummonBonus } from "./summoning.js";

const MORALE_THRESHOLD = 20;
const GRACE_MS = 5 * 60 * 1000;       // 5 min sustained-low before rebellion fires
const TICK_MS = 60 * 1000;            // damage round every 60s
const SWEEPABLE_RESOURCES = ["food", "wood", "stone", "bread", "leather", "ration", "iron"];

export function tickRebellion(state, now = Date.now()) {
  const run = state.run;
  let persistent = state.persistent;
  if (!run) return { run, persistent, events: [] };

  const morale = run.morale ?? 50;
  const events = [];
  let nextRun = run;

  // 1) Track moraleLowSince. Crosses below 20 → stamp; crosses back ≥ 20 → clear.
  if (morale < MORALE_THRESHOLD) {
    if (!nextRun.moraleLowSince) {
      nextRun = { ...nextRun, moraleLowSince: now };
    }
  } else {
    if (nextRun.moraleLowSince) {
      nextRun = { ...nextRun, moraleLowSince: 0 };
    }
  }

  // 2) Trigger rebellion if 5 min sustained.
  if (
    !nextRun.rebellionActiveSince &&
    nextRun.moraleLowSince &&
    now - nextRun.moraleLowSince >= GRACE_MS
  ) {
    nextRun = { ...nextRun, rebellionActiveSince: now, lastRebellionTickAt: now };
    events.push({
      kind: "alert",
      message: "🔥 Rebellion! Your villagers are destroying the settlement. Raise morale, summon a binder, or use an evil summon to suppress them.",
    });
    persistent = stampEtchingOnce(persistent, "settlement:rebellion:first", "First rebellion suffered");
  }

  // 3) Resolution paths (clear active rebellion).
  if (nextRun.rebellionActiveSince) {
    const sumBonus = getActiveSummonBonus(state);
    const evilSuppress =
      sumBonus.suppressesRebellion === true ||
      (nextRun.alignment?.evil || 0) >= 20;
    if (morale >= 30 && !evilSuppress) {
      // Natural recovery.
      nextRun = { ...nextRun, rebellionActiveSince: null, moraleLowSince: 0 };
      events.push({
        kind: "milestone",
        message: "🌾 The villagers calm. The settlement breathes.",
      });
    } else {
      // 4) Damage rounds — only fire if NOT suppressed.
      if (!evilSuppress) {
        const lastAt = nextRun.lastRebellionTickAt || 0;
        if (now - lastAt >= TICK_MS) {
          nextRun = { ...nextRun, lastRebellionTickAt: now };
          const round = applyRebellionRound(nextRun);
          nextRun = round.run;
          events.push(...round.events);
        }
      } else if ((now - (nextRun.lastRebellionTickAt || 0)) >= TICK_MS) {
        // Suppression still records a tick to throttle the "skipping" log.
        nextRun = { ...nextRun, lastRebellionTickAt: now };
        events.push({
          kind: "info",
          message: "👁️ The rebellion ticks skip — fear holds the line. Morale stays low.",
        });
      }
    }
  }

  return { run: nextRun, persistent, events };
}

function applyRebellionRound(run) {
  const events = [];
  let inventory = { ...(run.inventory || {}) };
  let destroyed = { ...(run.destroyedBuildings || {}) };
  let assignments = { ...(run.assignments || {}) };
  let population = run.population || 0;

  // 70% resource sweep — pick one random resource that exists in stock.
  if (Math.random() < 0.7) {
    const present = SWEEPABLE_RESOURCES.filter((r) => (inventory[r] || 0) > 0);
    if (present.length > 0) {
      const pick = present[Math.floor(Math.random() * present.length)];
      const lost = Math.max(1, Math.floor((inventory[pick] || 0) * 0.30));
      inventory[pick] = (inventory[pick] || 0) - lost;
      events.push({
        kind: "alert",
        message: `🔥 Rebels took ${lost} ${pick}.`,
      });
    }
  }

  // 40% building damage — random non-shelter building.
  if (Math.random() < 0.4) {
    const built = Object.keys(run.built || {}).filter((id) => {
      // Skip shelter (preserve housing) + already destroyed.
      if (destroyed[id]) return false;
      // shelter ids: hut, lean_to, cottage, home (rough heuristic).
      if (["hut", "lean_to", "cottage", "home"].includes(id)) return false;
      return true;
    });
    if (built.length > 0) {
      const id = built[Math.floor(Math.random() * built.length)];
      destroyed[id] = { destroyedAt: Date.now() };
      events.push({
        kind: "alert",
        message: `🔥 Rebels damaged the ${id}.`,
      });
    }
  }

  // 25% villager loss — 1-2 walk off.
  if (Math.random() < 0.25 && population > 0) {
    const lost = Math.min(population, 1 + (Math.random() < 0.5 ? 1 : 0));
    population -= lost;
    events.push({
      kind: "alert",
      message: `🔥 ${lost} villager${lost > 1 ? "s" : ""} walk${lost > 1 ? "" : "s"} off in disgust.`,
    });
  }

  // 10% assignments cleared.
  if (Math.random() < 0.1 && Object.keys(assignments).length > 0) {
    assignments = {};
    events.push({
      kind: "alert",
      message: "🔥 Rebellion scatters the work crews. All staffing cleared.",
    });
  }

  return {
    run: {
      ...run, inventory, destroyedBuildings: destroyed, assignments, population,
    },
    events,
  };
}

// Public helper for UI banner.
export function isRebellionActive(state) {
  return !!state?.run?.rebellionActiveSince;
}

export function getRebellionInfo(state) {
  const run = state?.run || {};
  return {
    active: !!run.rebellionActiveSince,
    moraleLowSince: run.moraleLowSince || 0,
    lowMsToTrigger: Math.max(0, GRACE_MS - (run.moraleLowSince ? Date.now() - run.moraleLowSince : 0)),
    morale: run.morale ?? 50,
  };
}
