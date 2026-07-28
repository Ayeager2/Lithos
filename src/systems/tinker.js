// Tinker item use system (#223).
//
// Items craft into inventory like tools (via crafting.js). USE applies
// their effect via two slots:
//
//   run.activeTinker = { id, useKind, effect, queuedAt }
//
// patrol-set items are CONSUMED on use, stored as activeTinker; patrol.js
// applies them on next patrol entry (autoWinChance, blockRaidChance,
// guaranteedCatch, etc.).
//
// combat-throw items are CONSUMED on use, stored as activeTinker; combat.js
// applies them as a pre-fight modifier on next fight (accDebuffOnEnemy,
// counterDamage, defenseIgnoreFraction, stunChance, aoeDamage).
//
// exit items (Recall Beacon) — UX TBD: needs an active loop/fight to
// interrupt. For now, USE just clears the active loop. Future #225 will
// thread this through combat properly.
//
// XP: tinker level grows on USE (proportional to tinkerLevelRequired).

import { getTinkerItem, canUseTinker } from "../content/tinker.js";
import { gainXp } from "./skills.js";

export function performUseTinker(state, itemId) {
  const item = getTinkerItem(itemId);
  if (!item) {
    return { run: state.run, events: [{ kind: "actionFail", message: "Unknown tinker item." }] };
  }
  // Hard gate: tinker skill required.
  const gate = canUseTinker(state, itemId);
  if (!gate.ok) {
    return { run: state.run, events: [{ kind: "actionFail", message: gate.reason }] };
  }
  // Need one in inventory.
  if ((state.run.inventory?.[itemId] || 0) < 1) {
    return { run: state.run, events: [{ kind: "actionFail", message: `No ${item.name} on hand.` }] };
  }

  let run = state.run;
  const inventory = { ...run.inventory, [itemId]: run.inventory[itemId] - 1 };
  let stats = { ...(run.stats || {}) };
  const events = [{ kind: "info", message: item.onUsedMessage || `🪛 Used ${item.name}.` }];

  // Apply immediate side-effects (sanity cost on aether grenade etc.).
  if (item.effect?.sanityCost) {
    stats.sanity = Math.max(0, (stats.sanity ?? 50) - item.effect.sanityCost);
  }

  // exit items (Recall Beacon) — clear the active loop immediately.
  if (item.useKind === "exit") {
    run = { ...run, inventory, stats, activeLoop: null };
    events.push({ kind: "milestone", message: "🌀 The world folds. You arrive home." });
  } else {
    // patrol-set + combat-throw — queue as the next active modifier.
    const activeTinker = {
      id: itemId,
      useKind: item.useKind,
      effect: { ...(item.effect || {}) },
      queuedAt: Date.now(),
    };
    run = { ...run, inventory, stats, activeTinker };
  }

  // #222 — grant Tinker XP on USE proportional to required level.
  const xpAmt = Math.max(2, (item.tinkerLevelRequired || 1) * 3);
  const x = gainXp(run, "tinker", xpAmt);
  run = { ...run, skills: x.skills };
  events.push(...x.events);

  return { run, events };
}

// Consume + return the active tinker for patrol. Returns null if none
// or if useKind doesn't match (i.e. combat-throw won't apply on patrol-set).
export function consumeActiveTinkerForPatrol(state) {
  const at = state?.run?.activeTinker;
  if (!at) return null;
  // patrol-set items apply on patrol; combat-throw also applies (the
  // player threw it pre-encounter).
  if (at.useKind !== "patrol-set" && at.useKind !== "combat-throw") return null;
  return at;
}

// Clear the activeTinker (after consumption).
export function clearActiveTinker(run) {
  if (!run.activeTinker) return run;
  return { ...run, activeTinker: null };
}
