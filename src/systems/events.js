// Random events system.

import { getAllEvents, getEvent } from "../content/events.js";
import { stampEtchingOnce, isFirstStamp } from "./etchings.js";
import { applyEffect } from "./survival.js";
import { totalWater, spendWater } from "../content/resources.js";
import { computeEra } from "./era.js";
import { gainPopulation, losePopulation } from "./town.js";
import { getDefense, getRaidLossFraction, getRaidProtectedKeys } from "./defense.js";
import { getAllBuildings } from "../content/buildings.js";

export const INTERVAL_MS = 60 * 1000;
const GATHER_EVENT_CHANCE = 0.04;
const NOTHING_WEIGHT = 80;

function severityMultiplier(state) {
  const era = computeEra(state);
  return Math.max(1.0, 1 + (era - 1) * 0.5);
}

function isEventEligible(state, event, triggerType) {
  if (event.trigger !== "any" && event.trigger !== triggerType) return false;
  const era = computeEra(state);
  if (event.requires?.era && era < event.requires.era) return false;
  if (event.requires?.hutBuilt && !state.run.built?.hut) return false;
  if (
    event.requires?.hasBuilding &&
    !state.run.built?.[event.requires.hasBuilding]
  ) {
    return false;
  }
  if (event.requires?.notHasBuilding) {
    const ids = Array.isArray(event.requires.notHasBuilding)
      ? event.requires.notHasBuilding
      : [event.requires.notHasBuilding];
    for (const id of ids) {
      if (state.run.built?.[id]) return false;
    }
  }
  if (event.requires?.alignment) {
    const align = state.run.alignment || { good: 0, evil: 0 };
    if (event.requires.alignment.good && (align.good || 0) < event.requires.alignment.good) {
      return false;
    }
    if (event.requires.alignment.evil && (align.evil || 0) < event.requires.alignment.evil) {
      return false;
    }
  }
  const cd = state.run.events?.cooldowns?.[event.id] || 0;
  if (Date.now() < cd) return false;
  return true;
}

function pickEventFromPool(pool, rng, includeNothing = false) {
  const total =
    pool.reduce((s, e) => s + (e.weight || 0), 0) +
    (includeNothing ? NOTHING_WEIGHT : 0);
  if (total === 0) return null;
  let r = rng() * total;
  if (includeNothing) {
    if (r < NOTHING_WEIGHT) return null;
    r -= NOTHING_WEIGHT;
  }
  for (const e of pool) {
    if (r < (e.weight || 0)) return e;
    r -= e.weight || 0;
  }
  return null;
}

function applyEventEffects(state, effects, multiplier = 1.0) {
  const run = {
    ...state.run,
    inventory: { ...state.run.inventory },
    stats: { ...(state.run.stats || {}) },
    alignment: { ...(state.run.alignment || { good: 0, evil: 0 }) },
    activePests: { ...(state.run.activePests || {}) },
  };
  const persistent = { ...state.persistent };
  const events = [];

  if (effects.inventory) {
    for (const [k, v] of Object.entries(effects.inventory)) {
      const delta = Math.round(v * multiplier);
      // Virtual "water" key — grants land as water_muddy (the realistic
      // tier strangers/events would deliver). Negative deltas drain from
      // lowest tier first via spendWater. See ERA_PLAN.md "Water tiers".
      if (k === "water") {
        if (delta >= 0) {
          run.inventory.water_muddy =
            (run.inventory.water_muddy || 0) + delta;
        } else {
          const toSpend = Math.min(totalWater(run.inventory), -delta);
          run.inventory = spendWater(run.inventory, toSpend);
        }
        continue;
      }
      run.inventory[k] = Math.max(0, (run.inventory[k] || 0) + delta);
    }
  }

  if (effects.stats) {
    const scaled = {};
    for (const [k, v] of Object.entries(effects.stats)) {
      scaled[k] = k === "sanity" ? v : v * multiplier;
    }
    run.stats = applyEffect(run.stats, scaled);
  }

  if (effects.alignment) {
    run.alignment.good = (run.alignment.good || 0) + (effects.alignment.good || 0);
    run.alignment.evil = (run.alignment.evil || 0) + (effects.alignment.evil || 0);
  }

  if (effects.setsPest) {
    const { pestId, durationMs, intensity } = effects.setsPest;
    if (pestId && durationMs) {
      run.activePests[pestId] = {
        until: Date.now() + durationMs,
        intensity: intensity || 1,
      };
    }
  }

  // #190 — raid effects. effects.raid is an object describing the raid:
  //   { stealResource: { id, amount }, damageBuilding: { count }, killVillagers: N }
  // All quantities are scaled inversely by settlement defense (each
  // point of defense reduces effective intensity by ~7%, capped at 70%).
  if (effects.raid) {
    const raid = effects.raid;
    const defense = getDefense({ run, persistent });
    const reduction = Math.min(0.7, defense * 0.07);
    const survive = 1 - reduction; // 1.0 with no defense, 0.3 floor at high def

    // Inventory sweep — the punishing default. raid.sweepFraction is
    // 0.9 by default (90% of every non-protected resource). Defense +
    // Watchtower + army reduce this dramatically via getRaidLossFraction.
    if (typeof raid.sweepFraction === "number" && raid.sweepFraction > 0) {
      const lossFrac = getRaidLossFraction({ run, persistent }, raid.sweepFraction);
      const protectedSet = getRaidProtectedKeys({ run, persistent });
      const totals = {};
      for (const [k, v] of Object.entries(run.inventory || {})) {
        if (!v || v <= 0) continue;
        if (protectedSet.has(k)) continue;
        const lost = Math.floor(v * lossFrac);
        if (lost > 0) {
          run.inventory[k] = v - lost;
          totals[k] = lost;
        }
      }
      const lossPct = Math.round(lossFrac * 100);
      if (Object.keys(totals).length === 0) {
        events.push({ kind: "alert", message: `🛡️ Raid pushed back — your defense held. ${lossPct}% sweep blocked.` });
        // #198 — first time defenses fully blocked a sweep.
        if (isFirstStamp(persistent, "settlement:raid:survived")) {
          persistent = stampEtchingOnce(persistent, "settlement:raid:survived", "First raid fully repelled");
          events.push({ kind: "milestone", message: "🕯️ An etching appears on the Altar: First raid fully repelled." });
        }
      } else {
        const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 4);
        const detail = top.map(([k, n]) => `${n} ${k}`).join(", ");
        events.push({ kind: "alert", message: `🔥 Raid swept ${lossPct}% of the stockpile — ${detail}.` });
      }
    }

    // Resource theft. id can be "food" virtual key or a concrete res id.
    if (raid.stealResource) {
      const { id, amount } = raid.stealResource;
      const want = Math.max(0, Math.round((amount || 0) * survive * multiplier));
      if (want > 0) {
        if (id === "food") {
          run.inventory.food = Math.max(0, (run.inventory.food || 0) - want);
        } else {
          run.inventory[id] = Math.max(0, (run.inventory[id] || 0) - want);
        }
        events.push({ kind: "alert", message: `🛡️ Raid stole ${want} ${id}${defense > 0 ? ` (defense ${defense} softened it)` : ""}.` });
      }
    }

    // Building damage. Picks a random non-shelter built building and
    // destroys it (removes from run.built). `count` non-shelter
    // buildings get hit. Shelter is excluded so the player never loses
    // housing — that would cascade into population eviction.
    if (raid.damageBuilding) {
      const candidateIds = Object.keys(run.built || {}).filter((id) => {
        const b = getAllBuildings().find((x) => x.id === id);
        return b && b.category !== "shelter";
      });
      const wantDmg = Math.round((raid.damageBuilding.count || 1) * survive * multiplier);
      const builtNext = { ...(run.built || {}) };
      const destroyed = [];
      for (let i = 0; i < wantDmg && candidateIds.length > 0; i++) {
        const idx = Math.floor(Math.random() * candidateIds.length);
        const pickId = candidateIds.splice(idx, 1)[0];
        delete builtNext[pickId];
        const def = getAllBuildings().find((x) => x.id === pickId);
        destroyed.push(def?.name || pickId);
      }
      if (destroyed.length > 0) {
        run.built = builtNext;
        // #194 — record destruction so the player can repair at 50% cost.
        const destroyedMap = { ...(run.destroyedBuildings || {}) };
        for (const id of candidateIds) {} // noop; iterating only changed list below
        // Walk the names list back to ids via getAllBuildings lookup.
        for (const name of destroyed) {
          const def = getAllBuildings().find((x) => x.name === name);
          if (def) destroyedMap[def.id] = { destroyedAt: Date.now() };
        }
        run.destroyedBuildings = destroyedMap;
        events.push({ kind: "alert", message: `🔥 Raid destroyed: ${destroyed.join(", ")}.` });
      } else if (wantDmg > 0) {
        events.push({ kind: "alert", message: `🛡️ Raid pushed back — no buildings damaged.` });
      }
    }

    // Villager kills.
    if (raid.killVillagers) {
      const want = Math.max(0, Math.round((raid.killVillagers || 0) * survive * multiplier));
      if (want > 0) {
        const popRes = losePopulation(run, want, "killed defending the settlement");
        run = { ...popRes.run, inventory: run.inventory, stats: run.stats, alignment: run.alignment, activePests: run.activePests, built: run.built };
        if (popRes.events) events.push(...popRes.events);
      }
    }
  }

  // #188 — population effects. effects.population is a number (positive
  // → gainPopulation, negative → losePopulation). Pumped through the
  // town.js helpers so the milestone/alert log line is consistent.
  if (typeof effects.population === "number" && effects.population !== 0) {
    const reason = effects.populationReason || null;
    const popRes = effects.population > 0
      ? gainPopulation(run, Math.round(effects.population * multiplier), reason)
      : losePopulation(run, Math.round(-effects.population * multiplier), reason);
    run = { ...popRes.run, inventory: run.inventory, stats: run.stats, alignment: run.alignment, activePests: run.activePests };
    if (popRes.events) events.push(...popRes.events);
  }

  if (effects.log) {
    events.push({ kind: effects.log.kind, message: effects.log.message });
  }

  return { run, persistent, events };
}

function stampCooldown(run, eventId, ms) {
  const cooldowns = { ...(run.events?.cooldowns || {}), [eventId]: Date.now() + ms };
  return {
    ...run,
    events: { ...(run.events || {}), cooldowns },
  };
}

export function rollIntervalEvent(state, rng = Math.random) {
  if (state.run.activeEvent) return null;
  const pool = getAllEvents().filter((e) => isEventEligible(state, e, "interval"));
  const picked = pickEventFromPool(pool, rng, true);
  if (!picked) return null;
  return fireEvent(state, picked, rng);
}

export function rollGatherEvent(state, rng = Math.random) {
  if (state.run.activeEvent) return null;
  if (rng() >= GATHER_EVENT_CHANCE) return null;
  const pool = getAllEvents().filter((e) => isEventEligible(state, e, "gather"));
  const picked = pickEventFromPool(pool, rng, false);
  if (!picked) return null;
  return fireEvent(state, picked, rng);
}

function fireEvent(state, event, rng) {
  const multiplier = severityMultiplier(state);

  if (event.choices && event.choices.length > 0) {
    let run = { ...state.run, activeEvent: { id: event.id, firedAt: Date.now() } };
    run = stampCooldown(run, event.id, event.cooldownMs || 0);
    return {
      run,
      persistent: state.persistent,
      events: [{ kind: "event_choice", message: `❓ ${event.flavor}` }],
    };
  }

  const result = applyEventEffects(state, event.onFire?.effects || {}, multiplier);
  result.run = stampCooldown(result.run, event.id, event.cooldownMs || 0);
  result.persistent = {
    ...result.persistent,
    lifetimeStats: {
      ...result.persistent.lifetimeStats,
      eventsTriggered: (result.persistent.lifetimeStats.eventsTriggered || 0) + 1,
    },
  };
  return result;
}

export function respondToActiveEvent(state, choiceId) {
  const eventId = state.run.activeEvent?.id;
  if (!eventId) {
    return { run: state.run, persistent: state.persistent, events: [] };
  }
  const event = getEvent(eventId);
  if (!event) {
    return {
      run: { ...state.run, activeEvent: null },
      persistent: state.persistent,
      events: [],
    };
  }
  const choice = event.choices?.find((c) => c.id === choiceId);
  if (!choice) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "event_choice", message: "Unknown response." }],
    };
  }

  if (choice.cost) {
    for (const [res, qty] of Object.entries(choice.cost)) {
      const have =
        res === "water" ? totalWater(state.run.inventory) : (state.run.inventory[res] || 0);
      if (have < qty) {
        return {
          run: state.run,
          persistent: state.persistent,
          events: [{
            kind: "actionFail",
            message: choice.missingMessage || "You haven't enough to spare.",
          }],
        };
      }
    }
  }

  let inventory = { ...state.run.inventory };
  if (choice.cost) {
    for (const [res, qty] of Object.entries(choice.cost)) {
      if (res === "water") {
        inventory = spendWater(inventory, qty);
        continue;
      }
      inventory[res] = (inventory[res] || 0) - qty;
    }
  }

  const multiplier = severityMultiplier(state);
  const stateBeforeEffect = { ...state, run: { ...state.run, inventory } };
  const result = applyEventEffects(stateBeforeEffect, choice.effect || {}, multiplier);

  // World Score contribution from event choices (Task #29). Tag a choice
  // with `worldScoreDelta: 0.5` for "you helped a stranger" type beats,
  // higher numbers for genuine lore-laden restoration moments. Negative
  // values penalize cruel choices.
  if (typeof choice.worldScoreDelta === "number" && choice.worldScoreDelta !== 0) {
    result.run = {
      ...result.run,
      worldScore: (result.run.worldScore || 0) + choice.worldScoreDelta,
    };
  }

  result.run = { ...result.run, activeEvent: null };
  result.persistent = {
    ...result.persistent,
    lifetimeStats: {
      ...result.persistent.lifetimeStats,
      eventsTriggered: (result.persistent.lifetimeStats.eventsTriggered || 0) + 1,
    },
  };
  return result;
}

export function maybeRollInterval(state, rng = Math.random) {
  const now = Date.now();
  const last = state.run.events?.lastIntervalMs ?? 0;
  if (now - last < INTERVAL_MS) return null;

  let next = rollIntervalEvent(state, rng);
  if (!next) {
    return {
      run: {
        ...state.run,
        events: { ...(state.run.events || {}), lastIntervalMs: now },
      },
      persistent: state.persistent,
      events: [],
    };
  }
  next.run = {
    ...next.run,
    events: { ...(next.run.events || {}), lastIntervalMs: now },
  };
  return next;
}
