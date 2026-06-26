// Companions system (#202). Recruit, set active, and read the active
// companion's bonuses from one place. Bonuses are surfaced through
// getActiveCompanionBonus(state) which other systems (defense, gathering,
// passive, etc.) consult.
//
// State shape:
//   run.companions = { active: id|null, owned: { [id]: { recruitedAt } } }

import { COMPANIONS, getCompanion } from "../content/companions.js";
import { spendWater } from "../content/resources.js";

function checkRequires(state, req) {
  if (!req) return { ok: true };
  if (req.hasBuilding && !state.run.built?.[req.hasBuilding]) {
    return { ok: false, reason: `Requires building: ${req.hasBuilding}.` };
  }
  if (req.researched && !state.run.researched?.[req.researched]) {
    return { ok: false, reason: `Requires research: ${req.researched}.` };
  }
  if (req.mobsDefeated) {
    for (const [mobId, n] of Object.entries(req.mobsDefeated)) {
      if ((state.run.mobsDefeated?.[mobId] || 0) < n) {
        return { ok: false, reason: `Defeat ${n}× ${mobId} first.` };
      }
    }
  }
  if (typeof req.era === "number" && (state.run.era || 0) < req.era) {
    return { ok: false, reason: `Requires era ${req.era}.` };
  }
  return { ok: true };
}

function checkCost(state, cost) {
  if (!cost) return { ok: true };
  const inv = state.run.inventory || {};
  for (const [res, qty] of Object.entries(cost)) {
    if (res === "spirit") {
      if ((state.run.stats?.spirit || 0) < qty) return { ok: false, reason: `Need ${qty} Spirit.` };
      continue;
    }
    if (res === "water") {
      const total = (inv.water_stagnant || 0) + (inv.water_muddy || 0) + (inv.water_boiled || 0);
      if (total < qty) return { ok: false, reason: `Need ${qty} water.` };
      continue;
    }
    if ((inv[res] || 0) < qty) return { ok: false, reason: `Need ${qty} ${res}.` };
  }
  return { ok: true };
}

export function canRecruit(state, companionId) {
  const def = getCompanion(companionId);
  if (!def) return { ok: false, reason: "Unknown companion." };
  if (state.run.companions?.owned?.[companionId]) {
    return { ok: false, reason: "Already with you." };
  }
  const era = state.run.era || 0;
  if ((def.era || 1) > era) return { ok: false, reason: `Not in this era yet (need era ${def.era}).` };
  const reqCheck = checkRequires(state, def.requires);
  if (!reqCheck.ok) return reqCheck;
  const costCheck = checkCost(state, def.cost);
  if (!costCheck.ok) return costCheck;
  return { ok: true };
}

export function performRecruit(state, companionId) {
  const check = canRecruit(state, companionId);
  if (!check.ok) {
    return { run: state.run, persistent: state.persistent,
      events: [{ kind: "actionFail", message: check.reason }] };
  }
  const def = getCompanion(companionId);
  let inventory = { ...(state.run.inventory || {}) };
  const cost = def.cost || {};
  for (const [res, qty] of Object.entries(cost)) {
    if (res === "spirit") continue;
    if (res === "water") { inventory = spendWater(inventory, qty); continue; }
    inventory[res] = (inventory[res] || 0) - qty;
  }
  const stats = { ...(state.run.stats || {}) };
  if (cost.spirit) stats.spirit = Math.max(0, (stats.spirit || 0) - cost.spirit);

  const companions = state.run.companions || { active: null, owned: {} };
  const owned = { ...companions.owned, [companionId]: { recruitedAt: Date.now() } };
  // Auto-activate the first companion. Otherwise leave the current active.
  const active = companions.active || companionId;

  const run = { ...state.run, inventory, stats, companions: { active, owned } };
  return { run, persistent: state.persistent,
    events: [{ kind: "milestone", message: def.flavor?.onRecruit || `🐾 ${def.name} joins you.` }] };
}

export function setActiveCompanion(state, companionId) {
  if (companionId === null) {
    // Dismiss active.
    const companions = state.run.companions || { active: null, owned: {} };
    return { run: { ...state.run, companions: { ...companions, active: null } },
      events: [{ kind: "info", message: "🐾 You walk alone." }] };
  }
  const def = getCompanion(companionId);
  if (!def) return { run: state.run, events: [{ kind: "actionFail", message: "Unknown companion." }] };
  if (!state.run.companions?.owned?.[companionId]) {
    return { run: state.run, events: [{ kind: "actionFail", message: "You don't have that companion." }] };
  }
  const companions = state.run.companions || { active: null, owned: {} };
  const run = { ...state.run, companions: { ...companions, active: companionId } };
  return { run,
    events: [{ kind: "info", message: def.flavor?.onActivate || `🐾 ${def.name} walks with you.` }] };
}

// Public reader — every system that wants to apply a companion bonus
// asks this. Returns the bonuses dict of the active companion, or an
// empty object when no active companion.
export function getActiveCompanionBonus(state) {
  const activeId = state.run?.companions?.active;
  if (!activeId) return {};
  const def = getCompanion(activeId);
  return def?.bonuses || {};
}

export function getOwnedCompanions(state) {
  const owned = state.run?.companions?.owned || {};
  return Object.keys(owned).map((id) => getCompanion(id)).filter(Boolean);
}
