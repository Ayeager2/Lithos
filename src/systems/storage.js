// Storage system. Inventory caps + food spoilage.

import { getAllResources, getResource } from "../content/resources.js";
import { getActiveCompanionBonus } from "./companions.js";
import { getAllBuildings } from "../content/buildings.js";

// Cap on how much offline spoilage we apply at once. Same idea as passive
// production catch-up — long absences shouldn't wipe stockpiles.
const MAX_CATCHUP_MIN = 30;

// Effective cap for a resource = baseCap + sum of storage from owned buildings.
// Returns Infinity if the resource has no baseCap (uncapped by design).
export function getResourceCap(state, resourceId) {
  const res = getResource(resourceId);
  if (!res || typeof res.baseCap !== "number") return Infinity;
  let cap = res.baseCap;
  for (const b of getAllBuildings()) {
    if (!state.run.built?.[b.id]) continue;
    const inc = b.storageCaps?.[resourceId];
    if (typeof inc === "number") cap += inc;
  }
  // #203 — companion storage multiplier (Stable Mule = ×1.15).
  const compBonus = getActiveCompanionBonus(state);
  if (compBonus.storageCapMult && compBonus.storageCapMult > 0) {
    cap = Math.floor(cap * compBonus.storageCapMult);
  }
  return cap;
}

// Aggregate spoilage multiplier from buildings (e.g., Silo at 0.7 = 30% slower
// spoilage). Multiple buildings stack multiplicatively, but realistically only
// one applies in early eras. Floor at 0.1 so spoilage never goes to zero.
export function getSpoilageMultiplier(state) {
  let mult = 1.0;
  for (const b of getAllBuildings()) {
    if (!state.run.built?.[b.id]) continue;
    const m = b.effect?.spoilageMultiplier;
    if (typeof m === "number" && m > 0) mult *= m;
  }
  return Math.max(0.1, mult);
}

// Clamp inventory to caps. Returns { inventory, overflow }.
export function clampToCap(inventory, state, prevInventory = {}) {
  const out = { ...inventory };
  const overflow = {};
  for (const [id, qty] of Object.entries(out)) {
    const cap = getResourceCap(state, id);
    if (cap === Infinity) continue;
    const prev = prevInventory[id] || 0;
    if (prev >= cap) {
      if (qty > prev) {
        overflow[id] = qty - prev;
        out[id] = prev;
      }
    } else if (qty > cap) {
      overflow[id] = qty - cap;
      out[id] = cap;
    }
  }
  return { inventory: out, overflow };
}

// Process spoilage of food resources during TICK. Returns { run, events }.
export function processSpoilage(state) {
  const run = state.run;
  const now = Date.now();
  const lastAt = run.lastSpoilTickAt || now;
  const elapsedMs = Math.min(now - lastAt, MAX_CATCHUP_MIN * 60 * 1000);
  if (elapsedMs < 1000) {
    return {
      run: { ...run, lastSpoilTickAt: now },
      events: [],
    };
  }
  const elapsedMin = elapsedMs / 60000;

  const inventory = { ...(run.inventory || {}) };
  const spoilAccum = { ...(run.spoilAccum || {}) };
  const events = [];
  let changed = false;
  const buildingMult = getSpoilageMultiplier(state);

  for (const res of getAllResources()) {
    if (!res.spoilage) continue;
    const have = inventory[res.id] || 0;
    if (have <= 0) continue;
    const cap = getResourceCap(state, res.id);
    const atCap = cap !== Infinity && have >= cap;
    const ratePerMin =
      res.spoilage.perMinute *
      (atCap ? res.spoilage.atCapMultiplier || 1 : 1) *
      buildingMult;
    spoilAccum[res.id] = (spoilAccum[res.id] || 0) + ratePerMin * elapsedMin;
    const whole = Math.floor(spoilAccum[res.id]);
    if (whole > 0) {
      const lost = Math.min(have, whole);
      inventory[res.id] = have - lost;
      spoilAccum[res.id] -= lost;
      events.push({
        kind: "resource",
        message: `🦠 ${lost} ${res.name.toLowerCase()} spoiled.`,
      });
      changed = true;
    } else if (spoilAccum[res.id] !== (run.spoilAccum?.[res.id] || 0)) {
      changed = true;
    }
  }

  return {
    run: { ...run, inventory, spoilAccum, lastSpoilTickAt: now },
    events: changed ? events : [],
  };
}

// Helper: cap status for a resource — used by the inventory UI to color
// the count cell.
export function getCapStatus(state, resourceId) {
  const cap = getResourceCap(state, resourceId);
  if (cap === Infinity) return { status: "uncapped", cap: Infinity };
  const have = state.run.inventory?.[resourceId] || 0;
  if (have >= cap) return { status: "full", cap, have };
  if (have / cap >= 0.8) return { status: "warn", cap, have };
  return { status: "ok", cap, have };
}

// Pure helper for the spoilage countdown bar. Caller passes the resource def
// + cap status + current accumulator (+ optional building multiplier).
export function spoilStatusFromDef(resource, capStatus, accum, buildingMult = 1.0) {
  if (!resource?.spoilage) return { spoils: false };
  const atCap = capStatus.status === "full";
  const perMinute =
    resource.spoilage.perMinute *
    (atCap ? resource.spoilage.atCapMultiplier || 1 : 1) *
    buildingMult;
  if (perMinute <= 0) return { spoils: false };
  const remaining = Math.max(0, 1 - (accum || 0));
  const secondsUntilNextLoss = (remaining / perMinute) * 60;
  const percent = Math.max(0, Math.min(1, accum || 0));
  return {
    spoils: true,
    perMinute,
    atCap,
    secondsUntilNextLoss,
    percent,
  };
}
