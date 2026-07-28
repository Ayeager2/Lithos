// Town system (#182 — economy chunk 1).
//
// Owns population growth, housing capacity, and the slow drip of new
// villagers when survival thresholds are met. Population is `run`-scoped
// (wipes on prestige); future chunks will layer building staffing and
// production scaling on top of it.
//
// State shape (declared in src/state/run.js):
//   run.population            — current villagers (integer)
//   run.populationGrowAccum   — fractional accumulator (carries between
//                                ticks until a whole villager is added)
//   run.lastPopulationTickAt  — wall-clock ms of last tick
//
// Tick cadence: tickPopulation runs from the TICK_LOOP case in the
// reducer, same place as workers / passive production.

import { getAllBuildings } from "../content/buildings.js";
import { clampToCap } from "./storage.js";
import { stampEtchingOnce, isFirstStamp } from "./etchings.js";
import { getActiveCompanionBonus } from "./companions.js";
import { getActiveSummonBonus } from "./summoning.js";

// One villager every 5 minutes when thresholds are met. Tuned so the
// player feels growth without it dominating their resource budget.
const GROWTH_PER_SECOND = 1 / (5 * 60); // 0.00333…
const TICK_INTERVAL_MS = 250;

// Survival thresholds. Below ANY of these and growth stalls (but never
// shrinks — population loss happens through explicit event hooks).
const THRESHOLDS = {
  foodFloor: 5,        // need at least 5 food in stockpile
  waterFloor: 1,       // any drinkable water
  sanityFloor: 30,     // population won't grow under crushing dread
};

// Sum the `housing` field across every built building. Hut implicitly
// houses 1 (it's the first shelter), Lean-to +1, Cottage +3, etc.
export function getHousingCap(state) {
  const built = state.run?.built || {};
  let cap = 0;
  for (const b of getAllBuildings()) {
    if (!built[b.id]) continue;
    cap += b.housing || 0;
  }
  return cap;
}

// #189 — sum populationGrowthMult across owned buildings. Multiplicative.
// Default 1.0 (no boost). Moot Hall (+50%) → 1.5.
export function getPopulationGrowthMult(state) {
  const built = state.run?.built || {};
  let mult = 1.0;
  for (const b of getAllBuildings()) {
    if (!built[b.id]) continue;
    const m = b.effect?.populationGrowthMult;
    if (typeof m === "number" && m > 0) mult *= m;
  }
  return mult;
}

// Are the survival thresholds met right now?
export function populationGrowthEnabled(state) {
  const run = state.run;
  if (!run) return false;
  const food = (run.inventory?.food || 0);
  const water =
    (run.inventory?.water_stagnant || 0) +
    (run.inventory?.water_muddy || 0) +
    (run.inventory?.water_boiled || 0);
  const sanity = run.stats?.sanity ?? 50;
  return (
    food >= THRESHOLDS.foodFloor &&
    water >= THRESHOLDS.waterFloor &&
    sanity >= THRESHOLDS.sanityFloor
  );
}

// Per-tick growth integrator. Returns { run, events }.
// Called from TICK_LOOP; idempotent + safe on first tick.
export function tickPopulation(state, now = Date.now()) {
  const run = state.run;
  if (!run) return { run, events: [] };

  const last = run.lastPopulationTickAt || now;
  const elapsedSec = Math.max(0, (now - last) / 1000);
  if (elapsedSec < TICK_INTERVAL_MS / 1000) {
    // Not enough time — keep last stamp so we don't lose progress.
    return { run, events: [] };
  }

  const cap = getHousingCap(state);
  const current = run.population || 0;

  // Always update the timestamp.
  let nextRun = { ...run, lastPopulationTickAt: now };

  // Growth only if we have room AND survival thresholds met.
  if (current >= cap) {
    return { run: nextRun, events: [] };
  }
  if (!populationGrowthEnabled(state)) {
    return { run: nextRun, events: [] };
  }

  // Integrate. #189 — multiply by populationGrowthMult (Moot Hall etc.).
  const mult = getPopulationGrowthMult(state);
  const accum = (run.populationGrowAccum || 0) + elapsedSec * GROWTH_PER_SECOND * mult;
  const whole = Math.floor(accum);
  const remainder = accum - whole;
  if (whole <= 0) {
    return { run: { ...nextRun, populationGrowAccum: accum }, events: [] };
  }

  const gain = Math.min(whole, cap - current);
  nextRun = { ...nextRun, population: current + gain, populationGrowAccum: remainder };
  const events = [{
    kind: "milestone",
    message: gain === 1
      ? "🏠 Someone new joins the settlement. They unpack quietly."
      : `🏠 ${gain} new villagers join the settlement.`,
  }];

  // #198 — settlement population milestones. Each threshold stamps an
  // etching the first time the settlement reaches it.
  let persistent = state.persistent;
  const POP_MILESTONES = [5, 10, 25, 50, 100];
  const newPop = nextRun.population;
  for (const m of POP_MILESTONES) {
    if (newPop >= m && current < m) {
      const fid = `settlement:pop:${m}`;
      if (isFirstStamp(persistent, fid)) {
        persistent = stampEtchingOnce(persistent, fid, `Settlement reached ${m} villagers`);
        events.push({
          kind: "milestone",
          message: `🕯️ An etching appears on the Altar: Settlement of ${m}.`,
        });
      }
    }
  }

  return { run: nextRun, persistent, events };
}

// Explicit handler for events that lose villagers. Used by event
// responses (and disease / demon hooks in future chunks). Floors at 0.
export function losePopulation(run, n, reason) {
  if (!run) return { run, events: [] };
  const current = run.population || 0;
  const loss = Math.min(current, Math.max(0, n));
  if (loss <= 0) return { run, events: [] };
  return {
    run: { ...run, population: current - loss },
    events: [{
      kind: "alert",
      message: reason
        ? `💀 ${loss} villager${loss === 1 ? "" : "s"} lost — ${reason}.`
        : `💀 ${loss} villager${loss === 1 ? "" : "s"} lost.`,
    }],
  };
}

export function gainPopulation(run, n, reason) {
  if (!run) return { run, events: [] };
  const gain = Math.max(0, n);
  if (gain <= 0) return { run, events: [] };
  return {
    run: { ...run, population: (run.population || 0) + gain },
    events: [{
      kind: "milestone",
      message: reason
        ? `🏠 +${gain} villager${gain === 1 ? "" : "s"} — ${reason}.`
        : `🏠 +${gain} villager${gain === 1 ? "" : "s"}.`,
    }],
  };
}


// ─── Hybrid staffing (#183 / #187) ─────────────────────────────────
// Hybrid model: locked assignments (run.assignments[id].locked) get
// applied first, capped by staffSlots and total population. The
// REMAINING idle pool is then distributed round-robin across unlocked
// production buildings up to their staffSlots cap.
//
// Returns { [buildingId]: count } — total villagers on each building.
// All downstream consumers (tickRecipeProduction, TownView UI) read
// from this helper so the auto/manual blend is invisible to them.
export function getAssignments(state) {
  const built = state.run?.built || {};
  const pop = state.run?.population || 0;
  const locks = state.run?.assignments || {};
  const productionBuildings = getAllBuildings().filter(
    (b) => built[b.id] && (b.staffSlots || 0) > 0
  );
  const out = {};
  if (pop <= 0 || productionBuildings.length === 0) return out;

  // Step 1: apply locked assignments. Clamp each lock to [0, staffSlots]
  // and total to <= pop.
  let remaining = pop;
  for (const b of productionBuildings) {
    const locked = locks[b.id]?.locked;
    if (typeof locked !== "number" || locked <= 0) continue;
    const want = Math.min(locked, b.staffSlots || 0, remaining);
    if (want > 0) {
      out[b.id] = want;
      remaining -= want;
    }
  }

  // Step 2: auto-fill the remainder round-robin into UNLOCKED buildings
  // (buildings without an explicit lock setting — `locks[b.id]` absent).
  const autoFill = productionBuildings.filter((b) => locks[b.id]?.locked == null);
  let progressed = true;
  while (remaining > 0 && progressed && autoFill.length > 0) {
    progressed = false;
    for (const b of autoFill) {
      const cur = out[b.id] || 0;
      if (cur >= (b.staffSlots || 0)) continue;
      out[b.id] = cur + 1;
      remaining--;
      progressed = true;
      if (remaining <= 0) break;
    }
  }
  return out;
}

// Backwards-compat alias — existing call sites (#183) used
// getAutoAssignments; new code should prefer getAssignments.
export const getAutoAssignments = getAssignments;

// Mutator — called from the SET_BUILDING_ASSIGNMENT reducer case.
// `count` can be null to clear the lock (return to auto-fill), or a
// non-negative integer to lock at that count (clamped to staffSlots).
export function setBuildingAssignment(run, buildingId, count) {
  const assignments = { ...(run.assignments || {}) };
  if (count == null) {
    delete assignments[buildingId];
  } else {
    assignments[buildingId] = { locked: Math.max(0, Math.floor(count)) };
  }
  return { run: { ...run, assignments }, events: [] };
}

// Cap interval at 1 minute of catchup so background tab doesn't grant
// an hour of production in one tick.
const RECIPE_TICK_CATCHUP_MAX_MS = 60_000;

// Consume + produce per minute, scaled by assigned villagers. Skips a
// building's recipe when ANY required input is missing (no partial
// consumption). Output respects inventory caps via clampToCap.
export function tickRecipeProduction(state, now = Date.now()) {
  const run = state.run;
  if (!run) return { run, events: [] };
  const built = run.built || {};

  const last = run.lastRecipeTickAt || now;
  const elapsedMs = Math.min(now - last, RECIPE_TICK_CATCHUP_MAX_MS);
  if (elapsedMs < 250) return { run, events: [] };
  const elapsedMin = elapsedMs / 60000;

  const assignments = getAutoAssignments(state);
  let inventory = { ...(run.inventory || {}) };
  const accum = { ...(run.recipeAccum || {}) };
  const events = [];
  let anyChange = false;

  for (const b of getAllBuildings()) {
    if (!built[b.id]) continue;
    const recipe = b.productionRecipe;
    if (!recipe) continue;
    const assigned = assignments[b.id] || 0;
    if (assigned <= 0) continue;

    // #208/#212 — companion + summon production multipliers.
    const compBonus = getActiveCompanionBonus(state) || {};
    const sumBonus = getActiveSummonBonus(state) || {};
    let combinedMult = (compBonus.productionMult || 1) * (sumBonus.productionMult || 1);
    if (sumBonus.productionBuildingMult && state.run.activeSummon?.productionTarget === b.id) {
      combinedMult *= sumBonus.productionBuildingMult;
    }
    const ratePerMin = (recipe.perVillagerPerMinute || 0) * assigned * getMoraleMult(state) * combinedMult;
    if (ratePerMin <= 0) continue;

    const carry = accum[b.id] || 0;
    const wholeCycles = Math.floor(carry + ratePerMin * elapsedMin);
    const remainder = (carry + ratePerMin * elapsedMin) - wholeCycles;
    accum[b.id] = remainder;
    if (wholeCycles <= 0) continue;

    // Bound cycles by available inputs.
    let cyclesRun = wholeCycles;
    const inputs = recipe.input || {};
    for (const [res, qty] of Object.entries(inputs)) {
      if (qty <= 0) continue;
      const have = inventory[res] || 0;
      const maxFromThis = Math.floor(have / qty);
      if (maxFromThis < cyclesRun) cyclesRun = maxFromThis;
    }
    if (cyclesRun <= 0) continue;

    // Consume inputs + produce outputs.
    for (const [res, qty] of Object.entries(inputs)) {
      inventory[res] = (inventory[res] || 0) - qty * cyclesRun;
    }
    for (const [res, qty] of Object.entries(recipe.output || {})) {
      inventory[res] = (inventory[res] || 0) + qty * cyclesRun;
    }
    anyChange = true;
  }

  if (!anyChange) {
    return { run: { ...run, lastRecipeTickAt: now, recipeAccum: accum }, events };
  }

  // Cap-clamp.
  const clamped = clampToCap(inventory, { ...state, run: { ...run, inventory } }, run.inventory);
  for (const [id, lost] of Object.entries(clamped.overflow || {})) {
    if (lost > 0) {
      events.push({ kind: "actionFail", message: `📦 ${lost} ${id} spilled — storage was full.` });
    }
  }

  return {
    run: { ...run, inventory: clamped.inventory, lastRecipeTickAt: now, recipeAccum: accum },
    events,
  };
}


// ─── Settlement consumption (#192) ─────────────────────────────────
// Each villager passively drains the stockpile every minute. Tuned so
// a single staffed Sawmill (2 wood/min/villager) roughly matches a
// 5-villager settlement's wood draw — net-zero. A second staffed
// villager flips the building positive, so the player can SEE a wood
// surplus growing. Same shape for food (Garden / Bakery) and water
// (Water Hole / Well).
//
// Rates per villager per minute:
//   food   0.3   (≈ 1 grub per 3 villagers per minute)
//   water  0.3   (any tier — drained from highest tier first)
//   wood   0.2   (firewood, repairs)

const CONSUMPTION_RATES = {
  food: 0.3,
  water: 0.3,
  wood: 0.2,
};
const CONSUMPTION_TICK_MS = 250;
const CONSUMPTION_CATCHUP_MAX_MS = 60_000;

// Returns the per-minute consumption for each tracked resource at the
// current population. Read by TownView for the header display + by
// tickConsumption to drain stockpile. Returns 0 for everything when
// population is 0.
export function getConsumptionRates(state) {
  const pop = state.run?.population || 0;
  const out = {};
  for (const [res, perVillager] of Object.entries(CONSUMPTION_RATES)) {
    out[res] = perVillager * pop;
  }
  return out;
}

// Per-tick consumption integrator. Drains stockpile by per-villager
// rates scaled by population. Drains highest water tier first. When
// consumption EXCEEDS available stockpile, accumulates a shortage
// counter per resource (run.shortageMs). Sustained shortage triggers:
//
//   0–60s    : warning only (TownView shows ⚠️ Starving)
//   60–180s  : sanity bleeds -0.5/min per missing resource
//   180–300s : villagers leave (loop, -1 per 60s of continued shortage)
//   300s+    : villagers die (loop, -1 per 60s of continued shortage)
//
// Shortage clears as soon as the resource is fully met that tick.
const SHORTAGE_GRACE_MS = 60_000;
const SHORTAGE_SANITY_MS = 60_000;
const SHORTAGE_LEAVE_MS = 180_000;
const SHORTAGE_DEATH_MS = 300_000;
const SHORTAGE_TICK_LOSS_MS = 60_000;

export function tickConsumption(state, now = Date.now()) {
  let run = state.run;
  if (!run) return { run, events: [] };
  let pop = run.population || 0;
  if (pop <= 0) return { run, events: [] };

  // #208 — Tin Automaton companion reduces effective consuming population.
  const compBonusC = getActiveCompanionBonus(state) || {};
  if (compBonusC.noConsumption) pop = Math.max(0, pop - 1);
  if (run.built?.automatonBay) {
    const ab = (run.assignments?.automatonBay?.locked) ?? 0;
    pop = Math.max(0, pop - ab);
  }
  if (pop <= 0) return { run: { ...run, lastConsumptionTickAt: now }, events: [] };

  const last = run.lastConsumptionTickAt || now;
  const elapsedMs = Math.min(now - last, CONSUMPTION_CATCHUP_MAX_MS);
  if (elapsedMs < CONSUMPTION_TICK_MS) return { run, events: [] };
  const elapsedMin = elapsedMs / 60000;

  const accum = { ...(run.consumptionAccum || {}) };
  let inventory = { ...(run.inventory || {}) };
  const events = [];
  const shortageMs = { ...(run.shortageMs || {}) };
  const shortageLastLossAt = { ...(run.shortageLastLossAt || {}) };

  // Internal helper: track per-resource shortage / surplus.
  // resKey is "food" | "wood" | "water" — used for the shortage map.
  function applyShortage(resKey, wantWhole, drained) {
    const shortfall = wantWhole - drained;
    if (shortfall > 0) {
      shortageMs[resKey] = (shortageMs[resKey] || 0) + elapsedMs;
    } else {
      // Met this tick — clear shortage.
      if (shortageMs[resKey]) {
        const cleared = shortageMs[resKey];
        delete shortageMs[resKey];
        delete shortageLastLossAt[resKey];
        if (cleared >= SHORTAGE_GRACE_MS) {
          events.push({ kind: "milestone", message: `🌾 The ${resKey} shortage is over.` });
        }
      }
    }
  }

  // Food + wood — straight subtraction.
  for (const res of ["food", "wood"]) {
    const rate = (CONSUMPTION_RATES[res] || 0) * pop;
    if (rate <= 0) continue;
    const carry = (accum[res] || 0) + rate * elapsedMin;
    const whole = Math.floor(carry);
    accum[res] = carry - whole;
    if (whole <= 0) {
      applyShortage(res, 0, 0);
      continue;
    }
    const have = inventory[res] || 0;
    const drained = Math.min(whole, have);
    inventory[res] = have - drained;
    applyShortage(res, whole, drained);
  }

  // Water — drain by tier, track shortage on the virtual "water" key.
  const waterRate = (CONSUMPTION_RATES.water || 0) * pop;
  if (waterRate > 0) {
    const carry = (accum.water || 0) + waterRate * elapsedMin;
    const whole = Math.floor(carry);
    accum.water = carry - whole;
    let remaining = whole;
    let drained = 0;
    for (const tier of ["water_boiled", "water_muddy", "water_stagnant"]) {
      if (remaining <= 0) break;
      const have = inventory[tier] || 0;
      const drink = Math.min(have, remaining);
      if (drink > 0) {
        inventory[tier] = have - drink;
        remaining -= drink;
        drained += drink;
      }
    }
    applyShortage("water", whole, drained);
  }

  // Apply shortage penalties. Each missing resource contributes its own
  // sanity drain + leave/death rolls. Multiple shortages stack.
  let sanityPenalty = 0;
  let leaves = 0;
  let deaths = 0;
  for (const [resKey, ms] of Object.entries(shortageMs)) {
    if (ms < SHORTAGE_GRACE_MS) continue;
    if (ms >= SHORTAGE_SANITY_MS) {
      sanityPenalty += 0.5 * elapsedMin;
    }
    // Leave / death rolls — fire once per SHORTAGE_TICK_LOSS_MS of sustained shortage.
    const lastLoss = shortageLastLossAt[resKey] || 0;
    if (now - lastLoss >= SHORTAGE_TICK_LOSS_MS) {
      if (ms >= SHORTAGE_DEATH_MS) {
        deaths += 1;
        shortageLastLossAt[resKey] = now;
      } else if (ms >= SHORTAGE_LEAVE_MS) {
        leaves += 1;
        shortageLastLossAt[resKey] = now;
      }
    }
  }

  run = { ...run, inventory, consumptionAccum: accum, shortageMs, shortageLastLossAt, lastConsumptionTickAt: now };

  if (sanityPenalty > 0) {
    const stats = { ...(run.stats || {}) };
    stats.sanity = Math.max(0, (stats.sanity || 50) - sanityPenalty);
    run = { ...run, stats };
  }
  if (leaves > 0) {
    const pop = run.population || 0;
    const loss = Math.min(pop, leaves);
    if (loss > 0) {
      run = { ...run, population: pop - loss };
      events.push({ kind: "alert", message: `🚶 ${loss} villager${loss === 1 ? "" : "s"} walked off into the wastes — the shortage broke them.` });
    }
  }
  if (deaths > 0) {
    const pop = run.population || 0;
    const loss = Math.min(pop, deaths);
    if (loss > 0) {
      run = { ...run, population: pop - loss };
      events.push({ kind: "alert", message: `💀 ${loss} villager${loss === 1 ? "" : "s"} died of starvation.` });
    }
  }

  return { run, events };
}

// Public helper for the TownView header — returns a summary of any
// active shortages with their severity tier.
//   tier: "warn" | "sanity" | "leaves" | "deaths"
export function getShortageStatus(state) {
  const shortageMs = state.run?.shortageMs || {};
  const out = {};
  for (const [res, ms] of Object.entries(shortageMs)) {
    if (ms < SHORTAGE_GRACE_MS) continue;
    let tier = "warn";
    if (ms >= SHORTAGE_DEATH_MS) tier = "deaths";
    else if (ms >= SHORTAGE_LEAVE_MS) tier = "leaves";
    else if (ms >= SHORTAGE_SANITY_MS) tier = "sanity";
    out[res] = { tier, ms };
  }
  return out;
}


// ─── Net production rates (#194) ────────────────────────────────────
// Combines: building productionRecipe outputs (× assigned villagers ×
// perVillagerPerMinute), recipe INPUTS (subtracted as consumption from
// production), passive `passiveProduce` taps, and the per-villager
// consumption from getConsumptionRates. Returns { [res]: netPerMin } —
// positive means surplus, negative means deficit.
export function getNetProductionRates(state) {
  const built = state.run?.built || {};
  const assignments = getAssignments(state);
  const net = {};

  for (const b of getAllBuildings()) {
    if (!built[b.id]) continue;
    const recipe = b.productionRecipe;
    if (recipe) {
      const assigned = assignments[b.id] || 0;
      const rate = (recipe.perVillagerPerMinute || 0) * assigned;
      if (rate > 0) {
        for (const [res, qty] of Object.entries(recipe.output || {})) {
          net[res] = (net[res] || 0) + qty * rate;
        }
        for (const [res, qty] of Object.entries(recipe.input || {})) {
          net[res] = (net[res] || 0) - qty * rate;
        }
      }
    }
    if (b.passiveProduce) {
      for (const [res, conf] of Object.entries(b.passiveProduce)) {
        net[res] = (net[res] || 0) + (conf.perMinute || 0);
      }
    }
  }

  // Subtract per-villager consumption.
  const consumption = getConsumptionRates(state);
  for (const [res, rate] of Object.entries(consumption)) {
    net[res] = (net[res] || 0) - rate;
  }
  return net;
}


// ─── Trade routes (#197) ────────────────────────────────────────────
// Buildings with a tradeRoute schema (currently just Marketplace) run
// a periodic exchange. Every `cycleMs`, for each trade entry, if EACH
// listed `take` resource has at least `threshold` in inventory, the
// trade fires: subtract take, add give. Multiple trades can fire in
// the same cycle. Throttled to one cycle per cycleMs per building.

const TRADE_TICK_CATCHUP_MAX_MS = 60_000;

export function tickTradeRoutes(state, now = Date.now()) {
  const run = state.run;
  if (!run) return { run, events: [] };
  const built = run.built || {};
  let inventory = { ...(run.inventory || {}) };
  const lastTrades = { ...(run.tradeRouteLastAt || {}) };
  const events = [];
  let changed = false;

  for (const b of getAllBuildings()) {
    if (!built[b.id]) continue;
    const route = b.tradeRoute;
    if (!route || !route.cycleMs || !Array.isArray(route.trades)) continue;
    const lastAt = lastTrades[b.id] || 0;
    // Cap catchup so a 1-hour idle doesn't fire 12 cycles at once.
    const elapsedMs = Math.min(now - lastAt, TRADE_TICK_CATCHUP_MAX_MS);
    if (elapsedMs < route.cycleMs) continue;
    const cycles = Math.floor(elapsedMs / route.cycleMs);
    lastTrades[b.id] = (lastAt || now) + cycles * route.cycleMs;

    const totals = {};
    for (let c = 0; c < cycles; c++) {
      for (const trade of route.trades) {
        // All take resources must clear threshold + have enough to take.
        let canTrade = true;
        for (const [res, qty] of Object.entries(trade.take || {})) {
          const need = Math.max(qty, trade.threshold || 0);
          if ((inventory[res] || 0) < need) { canTrade = false; break; }
        }
        if (!canTrade) continue;
        // Execute the trade.
        for (const [res, qty] of Object.entries(trade.take || {})) {
          inventory[res] = (inventory[res] || 0) - qty;
        }
        for (const [res, qty] of Object.entries(trade.give || {})) {
          inventory[res] = (inventory[res] || 0) + qty;
          totals[res] = (totals[res] || 0) + qty;
        }
        changed = true;
      }
    }
    if (Object.keys(totals).length > 0) {
      const summary = Object.entries(totals).map(([r, n]) => `+${n} ${r}`).join(", ");
      events.push({ kind: "trade", message: `🪙 ${b.name} trade run: ${summary}.` });
    }
  }

  if (!changed) return { run, events: [] };
  return {
    run: { ...run, inventory, tradeRouteLastAt: lastTrades },
    events,
  };
}

// UI helper — when the next trade fires for a given building, in ms.
// Returns -1 if no route or no last-trade timestamp yet.
export function getNextTradeAt(state, buildingId) {
  const built = state.run?.built || {};
  if (!built[buildingId]) return -1;
  const b = getAllBuildings().find((x) => x.id === buildingId);
  if (!b?.tradeRoute?.cycleMs) return -1;
  const lastAt = state.run?.tradeRouteLastAt?.[buildingId] || 0;
  if (!lastAt) return Date.now() + b.tradeRoute.cycleMs;
  return lastAt + b.tradeRoute.cycleMs;
}


// ─── Settlement morale (#199) ─────────────────────────────────────
// A settlement-scale happiness stat (0-100, default 50). Drifts every
// minute toward an equilibrium computed from positive + negative
// factors. Production output is multiplied by getMoraleMult — low
// morale slows the recipe pipeline, high morale boosts it.
//
// Equilibrium factors:
//   Temple built: +15
//   Moot Hall built: +10
//   Cottage built: +5
//   Ale in inventory: +5 (any amount; further multiples don't stack)
//   Bread in inventory: +5
//   Player sanity < 25: -15
//   Player sanity > 75: +5
//   Active shortage on ANY resource (>60s): -20
//   No housing built: -10 (just starting out)

const MORALE_TICK_MS = 30_000;  // recompute equilibrium every 30s
const MORALE_DRIFT_PER_MIN = 5; // 5 points per minute toward target

// #200 — exported so the TownView tooltip can list each factor.
// Returns an array of { label, delta } in order of evaluation.
export function getMoraleFactors(state) {
  const built = state.run?.built || {};
  const inv = state.run?.inventory || {};
  const sanity = state.run?.stats?.sanity ?? 50;
  const shortageMs = state.run?.shortageMs || {};
  const factors = [{ label: "Base", delta: 50 }];

  if (built.temple) factors.push({ label: "Temple", delta: 15 });
  if (built.mootHall) factors.push({ label: "Moot Hall", delta: 10 });
  if (built.cottage) factors.push({ label: "Cottage", delta: 5 });
  if ((inv.ale || 0) > 0) factors.push({ label: "Ale in stock", delta: 5 });
  if ((inv.bread || 0) > 0) factors.push({ label: "Bread in stock", delta: 5 });
  if (sanity < 25) factors.push({ label: "Player sanity low", delta: -15 });
  else if (sanity > 75) factors.push({ label: "Player sanity high", delta: 5 });

  let shortageActive = false;
  for (const ms of Object.values(shortageMs)) {
    if (ms >= 60_000) { shortageActive = true; break; }
  }
  if (shortageActive) factors.push({ label: "Active shortage", delta: -20 });
  if (Object.keys(built).length === 0) factors.push({ label: "No shelter built", delta: -10 });
  return factors;
}

function getMoraleEquilibrium(state) {
  const factors = getMoraleFactors(state);
  let target = 0;
  for (const f of factors) target += f.delta;
  return Math.max(0, Math.min(100, target));
}

// Multiplier applied to production: 0.5× at 0 morale, 1.0× at 50,
// 1.25× at 100. Linear interpolation.
export function getMoraleMult(state) {
  const m = state.run?.morale ?? 50;
  if (m <= 50) return 0.5 + (m / 50) * 0.5;  // 0 → 0.5, 50 → 1.0
  return 1.0 + ((m - 50) / 50) * 0.25;        // 50 → 1.0, 100 → 1.25
}

export function tickMorale(state, now = Date.now()) {
  const run = state.run;
  if (!run) return { run, events: [] };
  const lastAt = run.lastMoraleTickAt || now;
  const elapsedMs = Math.min(now - lastAt, 5 * 60_000);
  if (elapsedMs < MORALE_TICK_MS) return { run, events: [] };
  const elapsedMin = elapsedMs / 60000;

  const target = getMoraleEquilibrium(state);
  const current = run.morale ?? 50;
  const driftMax = MORALE_DRIFT_PER_MIN * elapsedMin;
  const delta = Math.max(-driftMax, Math.min(driftMax, target - current));
  let next = Math.max(0, Math.min(100, current + delta));

  // #208/#212/#214 — companion + summon morale deltas + tainted buildings.
  const compBonusM = getActiveCompanionBonus(state) || {};
  const sumBonusM = getActiveSummonBonus(state) || {};
  const taintedCount = Object.keys(run.taintedBuildings || {}).length;
  let extraDelta = (
    (compBonusM.moralePerMin || 0)
    + (sumBonusM.moralePerMin || 0)
    + (taintedCount * -0.3)
  ) * elapsedMin;
  // Echo Mill drains morale via effect.moralePerMinute.
  for (const b of getAllBuildings()) {
    if (!run.built?.[b.id]) continue;
    const m = b.effect?.moralePerMinute || b.effect?.moralePerMin || 0;
    if (m) extraDelta += m * elapsedMin;
  }
  next = Math.max(0, Math.min(100, next + extraDelta));

  return {
    run: { ...run, morale: next, lastMoraleTickAt: now },
    events: [],
  };
}

// #214 — cleanse a tainted building at Stone Altar (5 fragments).
export function performCleanseTaint(state, buildingId) {
  const run = state.run;
  if (!run.taintedBuildings?.[buildingId]) {
    return { run, events: [{ kind: "actionFail", message: "That building is not tainted." }] };
  }
  if (!run.built?.stoneAltar) {
    return { run, events: [{ kind: "actionFail", message: "Requires Stone Altar." }] };
  }
  const cost = 5;
  if ((run.inventory?.fragments || 0) < cost) {
    return { run, events: [{ kind: "actionFail", message: `Need ${cost} fragments to cleanse.` }] };
  }
  const inventory = { ...run.inventory, fragments: run.inventory.fragments - cost };
  const tainted = { ...run.taintedBuildings };
  delete tainted[buildingId];
  return {
    run: { ...run, inventory, taintedBuildings: tainted },
    events: [{ kind: "milestone", message: `🕯️ The Stone Altar accepts the offering. The ${buildingId} hums normally again.` }],
  };
}


// #201 — per-resource contribution breakdown for the Net delta hover.
// Returns { [resource]: [{ source, perMin }] } so the UI can list
// every building + consumption line contributing to the net.
export function getNetProductionBreakdown(state) {
  const built = state.run?.built || {};
  const assignments = getAssignments(state);
  const out = {};
  function push(res, source, perMin) {
    if (!out[res]) out[res] = [];
    out[res].push({ source, perMin });
  }

  for (const b of getAllBuildings()) {
    if (!built[b.id]) continue;
    const recipe = b.productionRecipe;
    if (recipe) {
      const assigned = assignments[b.id] || 0;
      const rate = (recipe.perVillagerPerMinute || 0) * assigned;
      if (rate > 0) {
        for (const [res, qty] of Object.entries(recipe.output || {})) {
          push(res, b.name, qty * rate);
        }
        for (const [res, qty] of Object.entries(recipe.input || {})) {
          push(res, `${b.name} (input)`, -qty * rate);
        }
      }
    }
    if (b.passiveProduce) {
      for (const [res, conf] of Object.entries(b.passiveProduce)) {
        push(res, b.name, conf.perMinute || 0);
      }
    }
  }
  const consumption = getConsumptionRates(state);
  for (const [res, rate] of Object.entries(consumption)) {
    if (rate > 0) push(res, `Villagers (${state.run?.population || 0})`, -rate);
  }
  return out;
}
