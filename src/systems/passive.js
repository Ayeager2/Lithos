// Passive production system. Reducer's TICK case calls this every 15s.

import { getAllBuildings } from "../content/buildings.js";
import { getActiveCompanionBonus } from "./companions.js";
import { getResourceCap } from "./storage.js";
import { getToolEffects } from "../content/tools.js";
import { getStudyPassives } from "./studies.js";
import {
  getWorldGardenMultiplier,
  maybePromoteWaterHoleOutput,
  maybePromoteGardenOutput,
} from "./world.js";

export const MAX_CATCHUP_MIN = 30;
const LOG_DROP_THRESHOLD = 1;

function getProductionModulators(run) {
  const mods = {};
  if (run.activePests?.birdFlock?.until > Date.now()) {
    mods.food = (mods.food ?? 1) * 0.5;
  }
  if (run.built?.farmhouse && run.built?.garden) {
    mods.food = (mods.food ?? 1) * 1.5;
  }
  // ─── Study passive bonuses (Task #31) ───────────────────────────────
  // Coax Spring (Elemental tier 1) — Water Hole +50% throughput. Applies
  // to all water tiers it produces (currently water_muddy only).
  // Quicken Growth (Elemental tier 1) — Garden food +50%.
  // Both are additive across whatever's already in mods. Stacks with
  // farmhouse boost — by design (you've earned both).
  const passives = getStudyPassives(run);
  if (passives.waterHoleSpeedBonus) {
    const mult = 1 + passives.waterHoleSpeedBonus;
    mods.water_muddy = (mods.water_muddy ?? 1) * mult;
    mods.water_stagnant = (mods.water_stagnant ?? 1) * mult;
    mods.water_boiled = (mods.water_boiled ?? 1) * mult;
  }
  if (passives.gardenSpeedBonus) {
    mods.food = (mods.food ?? 1) * (1 + passives.gardenSpeedBonus);
  }
  // ─── World Score garden bonus (Task #29) ────────────────────────────
  // ≥15 threshold → Garden output ×1.2. Applies to whatever the garden's
  // produce key is at the time (still `food` here — the key promotion
  // to `bird_meat` happens AFTER modulators, in getProductionRates).
  const worldGardenMult = getWorldGardenMultiplier({ run });
  if (worldGardenMult !== 1.0) {
    mods.food = (mods.food ?? 1) * worldGardenMult;
  }
  return mods;
}

export function getProductionRates(run) {
  // Step 1: collect production under ORIGINAL building-defined keys.
  const buildingProduction = {};
  for (const b of getAllBuildings()) {
    if (!run.built?.[b.id]) continue;
    if (!b.passiveProduce) continue;
    for (const [res, conf] of Object.entries(b.passiveProduce)) {
      const perMin = conf.perMinute || 0;
      buildingProduction[res] = (buildingProduction[res] || 0) + perMin;
    }
  }

  // Step 2: apply per-key multipliers (pests, farmhouse, study passives,
  // world-score garden bonus). Done under ORIGINAL keys.
  const mods = getProductionModulators(run);
  for (const res of Object.keys(buildingProduction)) {
    if (typeof mods[res] === "number") buildingProduction[res] *= mods[res];
  }

  // Step 3: World Score key promotion (Task #29). At ≥50 the Water Hole's
  // muddy output redirects to boiled; at ≥80 the Garden's grub output
  // redirects to bird_meat. This is a key REMAP — the same throughput,
  // a better resource. Done AFTER modulators so the garden's +1.2 bonus
  // applies regardless of which food key it lands under.
  const state = { run };
  const rates = {};
  for (const [res, perMin] of Object.entries(buildingProduction)) {
    let outKey = maybePromoteWaterHoleOutput(state, res);
    outKey = maybePromoteGardenOutput(state, outKey);
    rates[outKey] = (rates[outKey] || 0) + perMin;
  }
  return rates;
}

// Sum stat-per-minute trickles from owned buildings. Stone Altar (+0.2
// sanity/min, +0.1 spirit/min) is the first user; future arcane buildings
// will likely plug in here too. Each contribution is additive across all
// owned buildings.
function getBuildingStatRates(run) {
  let spiritPerMinute = 0;
  let sanityPerMinute = 0;
  for (const b of getAllBuildings()) {
    if (!run.built?.[b.id]) continue;
    if (b.effect?.spiritPerMinute) spiritPerMinute += b.effect.spiritPerMinute;
    if (b.effect?.sanityPerMinute) sanityPerMinute += b.effect.sanityPerMinute;
  }
  return { spiritPerMinute, sanityPerMinute };
}

export function applyPassiveProduction(state) {
  const run = state.run;
  const rates = getProductionRates(run);
  // Read tool-based passive stat gains (e.g. Spirit Censer +1 Spirit / min).
  const toolEff = getToolEffects(run);
  // Building-side stat trickles (e.g. Stone Altar +0.2 sanity / min).
  const buildingStatRates = getBuildingStatRates(run);
  // #203 — companion stat trickles (Spirit Familiar / Stray Dog / etc.).
  const compBonus = getActiveCompanionBonus(state);
  const spiritPerMin =
    (toolEff.spiritPerMinute || 0) + buildingStatRates.spiritPerMinute + (compBonus.spiritPerMin || 0);
  const sanityPerMin = buildingStatRates.sanityPerMinute;
  const hpPerMin = (compBonus.hpRegenPerMin || 0);

  if (Object.keys(rates).length === 0 && spiritPerMin === 0 && sanityPerMin === 0 && hpPerMin === 0) {
    return { run, events: [] };
  }

  const now = Date.now();
  const lastAt = run.lastPassiveTickAt || now;
  const elapsedMs = Math.min(now - lastAt, MAX_CATCHUP_MIN * 60 * 1000);
  if (elapsedMs < 250) {
    return { run: { ...run, lastPassiveTickAt: now }, events: [] };
  }
  const elapsedMin = elapsedMs / 60000;

  const inventory = { ...(run.inventory || {}) };
  const accum = { ...(run.passiveAccum || {}) };
  const events = [];

  const gains = {};
  for (const [res, perMin] of Object.entries(rates)) {
    if (perMin <= 0) continue;
    accum[res] = (accum[res] || 0) + perMin * elapsedMin;
    const whole = Math.floor(accum[res]);
    if (whole > 0) {
      const cap = getResourceCap({ run }, res);
      const have = inventory[res] || 0;
      const room = cap === Infinity ? whole : Math.max(0, cap - have);
      const added = Math.min(whole, room);
      if (added > 0) {
        inventory[res] = have + added;
        gains[res] = (gains[res] || 0) + added;
      }
      accum[res] -= added;
      if (accum[res] > perMin) accum[res] = perMin;
    }
  }

  // Spirit Censer + Stone Altar contribute passive Spirit. Spirit is a
  // stat, not a resource — accumulate in passiveAccum under a special key
  // so partial gains carry over between ticks.
  let stats = run.stats;
  if (spiritPerMin > 0) {
    const key = "_stat_spirit";
    accum[key] = (accum[key] || 0) + spiritPerMin * elapsedMin;
    const whole = Math.floor(accum[key]);
    if (whole > 0) {
      const current = stats?.spirit ?? 50;
      const next = Math.max(0, Math.min(100, current + whole));
      const applied = next - current;
      if (applied > 0) {
        stats = { ...stats, spirit: next };
      }
      accum[key] -= whole;
      if (accum[key] > spiritPerMin) accum[key] = spiritPerMin;
    }
  }

  // Stone Altar's passive Sanity trickle. Same accumulator pattern as
  // Spirit above — the +0.2/min rate means partial points accrue
  // between ticks and only credited when they reach a whole integer.
  // #203 — companion HP trickle.
  if (hpPerMin > 0) {
    const key = "_stat_hp";
    accum[key] = (accum[key] || 0) + hpPerMin * elapsedMin;
    const whole = Math.floor(accum[key]);
    if (whole > 0) {
      const current = stats?.hp ?? 100;
      const next = Math.max(0, Math.min(100, current + whole));
      if (next !== current) stats = { ...stats, hp: next };
      accum[key] -= whole;
      if (accum[key] > hpPerMin) accum[key] = hpPerMin;
    }
  }

  if (sanityPerMin > 0) {
    const key = "_stat_sanity";
    accum[key] = (accum[key] || 0) + sanityPerMin * elapsedMin;
    const whole = Math.floor(accum[key]);
    if (whole > 0) {
      const current = stats?.sanity ?? 50;
      const next = Math.max(0, Math.min(100, current + whole));
      const applied = next - current;
      if (applied > 0) {
        stats = { ...stats, sanity: next };
      }
      accum[key] -= whole;
      if (accum[key] > sanityPerMin) accum[key] = sanityPerMin;
    }
  }

  if (Object.keys(gains).length > 0) {
    for (const [res, qty] of Object.entries(gains)) {
      if (qty < LOG_DROP_THRESHOLD) continue;
      events.push({ kind: "resource", message: passiveLogLine(res, qty) });
    }
  }

  return {
    run: {
      ...run,
      inventory,
      stats,
      passiveAccum: accum,
      lastPassiveTickAt: now,
    },
    events,
  };
}

function passiveLogLine(res, qty) {
  const lines = {
    water_muddy: `💧 The water hole yields muddy water. +${qty}.`,
    water_stagnant: `🩸 +${qty} stagnant water.`,
    water_boiled: `🫖 The water hole yields water clean as memory. +${qty} boiled.`,
    food: `🪱 The garden gives. +${qty} grub${qty !== 1 ? "s" : ""}.`,
    bird_meat: `🍗 The garden gives meat — the world remembers what gardens were. +${qty}.`,
    wood: `🪵 The scrub yields wood. +${qty}.`,
  };
  return lines[res] || `+${qty} ${res}`;
}

export function clearStalePests(run) {
  const active = run.activePests || {};
  const remaining = {};
  const events = [];
  let changed = false;
  for (const [id, pest] of Object.entries(active)) {
    if (pest && pest.until && pest.until > Date.now()) {
      remaining[id] = pest;
    } else {
      changed = true;
      events.push({ kind: "event_good", message: pestExitLine(id) });
    }
  }
  if (!changed) return { run, events: [] };
  return { run: { ...run, activePests: remaining }, events };
}

function pestExitLine(id) {
  const lines = {
    birdFlock: "🦅 The flock has gone. The garden grows quiet again.",
  };
  return lines[id] || `The ${id} has gone.`;
}

export function isPestActive(run, pestId) {
  const p = run.activePests?.[pestId];
  return !!(p && p.until && p.until > Date.now());
}
