// Reckoning system (#225 / #228 / #229).
//
// The Era 5 doomsday clock. Counts down from RECKONING_DURATION_MS toward
// the apex event. Three phases: Shudders → Heralds → Apex.
//
// State touched:
//   run.reckoningClock      — wall-clock timestamp when the clock will
//                             fire the apex. Null until Era 5 entry.
//   run.reckoningStartedAt  — when the clock started.
//   run.reckoningDurationMs — copy of config; can be overridden by dev panel.
//   run.reckoningPhase      — "shudders" | "heralds" | "apex" | "complete"
//   run.heraldsSpawned[]    — ids of Heralds that have fired (so we don't dup)
//   run.heraldsSurvived[]   — ids the player resolved (won or chose correctly)
//   run.activeHerald        — { id, kind, ... } | null — currently UI-active
//   run.eraArc              — "mending" | "communion" | "defiance" | null
//   run.apexSummonBound     — true if any apex summon has ever been bound
//                             (set by summoning.js performBindSummon)
//   run.reckoningClockPaused — bool (dev-panel pause)

import { stampEtchingOnce } from "./etchings.js";
import {
  RECKONING_DURATION_MS,
  RECKONING_PHASES,
  HERALD_SPAWN_FRACTIONS,
} from "../content/reckoning.js";
import { HERALDS, getHerald, getAllHeralds } from "../content/heralds.js";
import { gainXp } from "./skills.js";
import { getAllBuildings as _getAllBuildings } from "../content/buildings.js";

function require_buildings() {
  return { getAllBuildings: _getAllBuildings };
}

// Compute the current clock-fraction (0..1). Returns null if no clock running.
export function getReckoningFraction(state, now = Date.now()) {
  const run = state?.run;
  if (!run?.reckoningClock) return null;
  const start = run.reckoningStartedAt || (run.reckoningClock - (run.reckoningDurationMs || RECKONING_DURATION_MS));
  const dur = run.reckoningDurationMs || RECKONING_DURATION_MS;
  const elapsed = Math.max(0, now - start);
  return Math.max(0, Math.min(1, elapsed / dur));
}

export function getReckoningPhase(state, now = Date.now()) {
  const frac = getReckoningFraction(state, now);
  if (frac == null) return null;
  if (frac >= RECKONING_PHASES.apex.start) return "apex";
  if (frac >= RECKONING_PHASES.heralds.start) return "heralds";
  return "shudders";
}

export function getReckoningRemainingMs(state, now = Date.now()) {
  const run = state?.run;
  if (!run?.reckoningClock) return null;
  return Math.max(0, run.reckoningClock - now);
}

// Determine which arc the player is on. Defaults to whichever entry condition
// fires first. If multiple conditions met simultaneously, priority is:
//   1. apexSummonBound → defiance
//   2. alignment.evil >= 25 → communion
//   3. worldScore >= 90 → mending
export function pickEntryArc(run) {
  if (run.apexSummonBound) return "defiance";
  if ((run.alignment?.evil || 0) >= 25) return "communion";
  if ((run.worldScore || 0) >= 90) return "mending";
  return null;
}

// Start the reckoning clock on Era 5 entry. Returns updated run.
export function startReckoning(run, now = Date.now()) {
  const arc = pickEntryArc(run) || "mending";
  return {
    ...run,
    reckoningClock: now + RECKONING_DURATION_MS,
    reckoningStartedAt: now,
    reckoningDurationMs: RECKONING_DURATION_MS,
    reckoningPhase: "shudders",
    heraldsSpawned: [],
    heraldsSurvived: [],
    activeHerald: null,
    eraArc: arc,
  };
}

// Tick the reckoning clock. Spawns Heralds when phase fraction is reached.
// Returns { run, persistent, events }.
export function tickReckoning(state, now = Date.now()) {
  const run = state.run;
  let persistent = state.persistent;
  const events = [];
  if (!run?.reckoningClock) return { run, persistent, events };
  if (run.reckoningClockPaused) return { run, persistent, events };

  // #236 — Era 5 path buildings can slow the clock. Each building with
  // effect.clockSlowMult < 1 extends the clock by (1-mult) of elapsed.
  // We push the apex timestamp forward to simulate slowing.
  let nextRun = run;
  const lastTickAt = run.lastReckoningTickAt || now;
  const tickElapsed = Math.max(0, now - lastTickAt);
  if (tickElapsed > 0) {
    let slowMult = 1.0;
    try {
      // Lazy require avoids cycles in some bundlers; static import works
      // in our ESM setup. We re-use the buildings module already imported
      // elsewhere via the content layer.
      const { getAllBuildings } = require_buildings();
      for (const b of getAllBuildings()) {
        if (!run.built?.[b.id]) continue;
        const m = b.effect?.clockSlowMult;
        if (typeof m === "number" && m > 0 && m < 1) slowMult *= m;
      }
    } catch {}
    if (slowMult < 1.0 && nextRun.reckoningClock) {
      const extension = tickElapsed * (1 - slowMult);
      nextRun = { ...nextRun, reckoningClock: nextRun.reckoningClock + extension, lastReckoningTickAt: now };
    } else {
      nextRun = { ...nextRun, lastReckoningTickAt: now };
    }
  }

  const frac = getReckoningFraction({ ...state, run: nextRun }, now);
  const newPhase = getReckoningPhase({ ...state, run: nextRun }, now);
  if (newPhase !== run.reckoningPhase) {
    nextRun = { ...nextRun, reckoningPhase: newPhase };
    events.push({
      kind: "milestone",
      message: phaseEntryMessage(newPhase),
    });
  }

  // Spawn Heralds when their fraction is crossed and not yet spawned.
  const spawned = nextRun.heraldsSpawned || [];
  if (newPhase === "heralds" || newPhase === "apex") {
    const allHeralds = getAllHeralds().sort((a, b) => a.spawnFraction - b.spawnFraction);
    for (const h of allHeralds) {
      if (spawned.includes(h.id)) continue;
      if (frac < h.spawnFraction) continue;
      // Spawn.
      const shape = h.shapes[nextRun.eraArc || "mending"];
      nextRun = {
        ...nextRun,
        heraldsSpawned: [...spawned, h.id],
        activeHerald: { id: h.id, kind: shape.kind, shape, spawnedAt: now },
      };
      events.push({
        kind: "alert",
        message: h.onSpawnMessage,
      });
      persistent = stampEtchingOnce(persistent, `herald:${h.id}:first`, `First ${h.name} encountered`);
      break; // one per tick
    }
  }

  // Apex trigger: the apex event is fired by a separate action
  // (TRIGGER_APEX) but we log the entry into the apex phase.
  return { run: nextRun, persistent, events };
}

function phaseEntryMessage(phase) {
  if (phase === "heralds") return "🌌 The world begins to send envoys. The first Herald is coming.";
  if (phase === "apex") return "🌌 The reckoning is upon you. The apex approaches.";
  return "🌌 The clock begins to count.";
}

// Initialize ritual/combat state on first interaction with a non-dialog
// Herald. Called when player clicks "Engage" — sets up meter/HP.
export function engageHerald(state) {
  const run = state.run;
  const active = run.activeHerald;
  if (!active) return { run, events: [] };
  const heraldDef = getHerald(active.id);
  if (!heraldDef) return { run, events: [] };
  const arc = run.eraArc || "mending";
  const shape = active.shape || heraldDef.shapes[arc];
  if (!shape) return { run, events: [] };

  let next = active;
  if (shape.kind === "ritual") {
    // Communion — obsession meter starts at 50% of max.
    next = {
      ...active,
      shape,
      kind: "ritual",
      obsession: Math.floor((shape.obsessionMax || 100) / 2),
      obsessionMax: shape.obsessionMax || 100,
      rounds: shape.rounds || 5,
      roundsLeft: shape.rounds || 5,
    };
  } else if (shape.kind === "combat") {
    // Defiance — straight boss fight.
    const mob = shape.mob || {};
    next = {
      ...active,
      shape,
      kind: "combat",
      heraldHp: mob.hp || 100,
      heraldHpMax: mob.hp || 100,
      mob,
    };
  }
  return { run: { ...run, activeHerald: next }, events: [] };
}

// Ritual attack — claim mode pushes obsession UP, push mode pushes DOWN.
// Each turn the Herald reacts (50% chance to nudge the meter back).
export function ritualAttack(state, mode = "claim") {
  const run = state.run;
  const active = run.activeHerald;
  if (!active || active.kind !== "ritual") return { run, events: [] };
  const events = [];
  const max = active.obsessionMax || 100;
  let obsession = active.obsession ?? Math.floor(max / 2);
  let roundsLeft = (active.roundsLeft ?? 5);

  // Player's contribution — base 25-40% of max per round.
  const playerDelta = Math.floor(max * (0.20 + Math.random() * 0.20));
  if (mode === "claim") {
    obsession = Math.min(max, obsession + playerDelta);
    events.push({ kind: "info", message: `🌀 You claim. Obsession ${obsession}/${max}.` });
  } else {
    obsession = Math.max(0, obsession - playerDelta);
    events.push({ kind: "info", message: `🌀 You push back. Obsession ${obsession}/${max}.` });
  }

  // Herald reacts.
  if (Math.random() < 0.5 && obsession > 0 && obsession < max) {
    const reaction = Math.floor(max * 0.10);
    if (mode === "claim") {
      obsession = Math.max(0, obsession - reaction);
    } else {
      obsession = Math.min(max, obsession + reaction);
    }
    events.push({ kind: "info", message: `🌀 The Herald resists. Obsession ${obsession}/${max}.` });
  }

  roundsLeft -= 1;

  // Win conditions.
  if (obsession >= max || obsession <= 0) {
    // Resolution: succeeded.
    const reward = active.shape?.reward || {};
    const inventory = { ...(run.inventory || {}) };
    for (const [r, q] of Object.entries(reward)) {
      inventory[r] = (inventory[r] || 0) + q;
    }
    const heraldDef = getHerald(active.id);
    events.push({
      kind: "milestone",
      message: `🌀 You ${obsession >= max ? "claimed" : "pushed back"} the ${heraldDef?.name}. ${describeReward(reward)}`,
    });
    let nextRun = { ...run, inventory, activeHerald: null, heraldsSurvived: [...(run.heraldsSurvived || []), active.id] };
    const rx = gainXp(nextRun, "reckoningLore", 30);
    nextRun = { ...nextRun, skills: rx.skills };
    events.push(...rx.events);
    return { run: nextRun, events };
  }

  if (roundsLeft <= 0) {
    // Out of rounds — failure (double drain).
    const heraldDef = getHerald(active.id);
    const drain = heraldDef?.failureDrain || {};
    const stats = { ...(run.stats || {}) };
    if (drain.sanity && !drain.perMinute) stats.sanity = Math.max(0, (stats.sanity ?? 50) - drain.sanity * 2);
    const morale = drain.morale && !drain.perMinute ? Math.max(0, (run.morale ?? 50) - drain.morale * 2) : run.morale;
    const population = drain.villagers ? Math.max(0, (run.population || 0) - drain.villagers * 2) : run.population;
    events.push({ kind: "alert", message: `🩸 The ritual collapses. The Herald takes its measure.` });
    return {
      run: { ...run, stats, morale, population, activeHerald: null, heraldsSurvived: [...(run.heraldsSurvived || []), active.id] },
      events,
    };
  }

  return {
    run: { ...run, activeHerald: { ...active, obsession, roundsLeft } },
    events,
  };
}

// Herald combat attack — Defiance arc. Uses simplified combat math: roll
// player damage in weapon range, deal to Herald HP, then Herald counter.
export function heraldAttack(state) {
  const run = state.run;
  const active = run.activeHerald;
  if (!active || active.kind !== "combat") return { run, events: [] };
  const events = [];
  const mob = active.mob || {};
  let heraldHp = active.heraldHp ?? (mob.hp || 100);
  let playerStats = { ...(run.stats || {}) };

  // Player attack — try to read equipped weapon for damage range.
  let pmin = 8, pmax = 16;
  const handLeft = run.equipped?.handLeft;
  if (handLeft?.id) {
    // simple lookup via inventory item name pattern; combat.js has the real
    // helper but we keep this simple.
    pmin = 10; pmax = 20;
  }
  const playerDmg = Math.floor(pmin + Math.random() * (pmax - pmin + 1));
  const defense = mob.defense || 0;
  const dealt = Math.max(1, playerDmg - defense);
  heraldHp = Math.max(0, heraldHp - dealt);
  events.push({ kind: "info", message: `⚔️ You strike ${active.mob?.name || "the Herald"} for ${dealt}. (${heraldHp}/${active.heraldHpMax || mob.hp || 100} HP)` });

  if (heraldHp <= 0) {
    // Victory.
    const reward = active.shape?.reward || {};
    const inventory = { ...(run.inventory || {}) };
    for (const [r, q] of Object.entries(reward)) {
      inventory[r] = (inventory[r] || 0) + q;
    }
    const heraldDef = getHerald(active.id);
    events.push({
      kind: "milestone",
      message: `⚔️ You felled the ${heraldDef?.name}. ${describeReward(reward)}`,
    });
    let nextRun = { ...run, inventory, activeHerald: null, heraldsSurvived: [...(run.heraldsSurvived || []), active.id] };
    const cx = gainXp(nextRun, "swordplay", 25);
    nextRun = { ...nextRun, skills: cx.skills };
    events.push(...cx.events);
    return { run: nextRun, events };
  }

  // Herald counter-attack.
  const dmgRange = mob.attackDamage || [5, 10];
  const heraldDmg = Math.floor(dmgRange[0] + Math.random() * (dmgRange[1] - dmgRange[0] + 1));
  const acc = mob.accuracy || 0.8;
  if (Math.random() < acc) {
    playerStats.hp = Math.max(0, (playerStats.hp ?? 100) - heraldDmg);
    events.push({ kind: "alert", message: `🩸 ${active.mob?.name || "Herald"} hits you for ${heraldDmg}. (HP ${playerStats.hp})` });
  } else {
    events.push({ kind: "info", message: `🛡️ You dodge the strike.` });
  }

  if (playerStats.hp <= 0) {
    // Defeat — apply failure drain.
    const heraldDef = getHerald(active.id);
    const drain = heraldDef?.failureDrain || {};
    const stats = { ...playerStats, hp: 1 }; // don't kill the player; just close out
    if (drain.sanity && !drain.perMinute) stats.sanity = Math.max(0, (stats.sanity ?? 50) - drain.sanity * 2);
    events.push({ kind: "alert", message: `🩸 You collapse. The ${heraldDef?.name} withdraws — for now.` });
    return {
      run: { ...run, stats, activeHerald: null, heraldsSurvived: [...(run.heraldsSurvived || []), active.id] },
      events,
    };
  }

  return {
    run: { ...run, stats: playerStats, activeHerald: { ...active, heraldHp } },
    events,
  };
}

// Resolve the active Herald — called via reducer when player interacts.
// Dialog Heralds use this; ritual/combat use ritualAttack/heraldAttack.
export function resolveHerald(state, choiceId = null, outcome = "success") {
  const run = state.run;
  const active = run.activeHerald;
  if (!active) return { run, events: [] };
  const heraldDef = getHerald(active.id);
  if (!heraldDef) return { run, events: [] };
  const shape = active.shape;
  const events = [];

  let nextRun = run;
  const survived = [...(run.heraldsSurvived || []), active.id];

  // #231 — grant Reckoning Lore + Cosmic Bargaining XP regardless of outcome.
  {
    const rx = gainXp(nextRun, "reckoningLore", 20);
    nextRun = { ...nextRun, skills: rx.skills };
    events.push(...rx.events);
    const cx = gainXp(nextRun, "cosmicBargaining", 15);
    nextRun = { ...nextRun, skills: cx.skills };
    events.push(...cx.events);
  }
  if (outcome === "success") {
    // Apply reward.
    let reward = shape.reward || {};
    // Dialog branch — find the chosen option's reward.
    if (shape.kind === "dialog" && choiceId) {
      const choice = shape.choices.find((c) => c.id === choiceId);
      if (choice?.reward) reward = choice.reward;
    }
    const inventory = { ...(nextRun.inventory || {}) };
    for (const [r, q] of Object.entries(reward)) {
      inventory[r] = (inventory[r] || 0) + q;
    }
    nextRun = { ...nextRun, inventory, activeHerald: null, heraldsSurvived: survived };
    events.push({
      kind: "milestone",
      message: `🕯️ You survived ${heraldDef.name}. ${describeReward(reward)}`,
    });
  } else {
    // Failure — apply drain × 2.
    const drain = heraldDef.failureDrain || {};
    const stats = { ...(nextRun.stats || {}) };
    if (drain.sanity && !drain.perMinute) {
      stats.sanity = Math.max(0, (stats.sanity ?? 50) - drain.sanity * 2);
    }
    if (drain.morale && !drain.perMinute) {
      nextRun = { ...nextRun, morale: Math.max(0, (nextRun.morale ?? 50) - drain.morale * 2) };
    }
    if (drain.villagers) {
      nextRun = { ...nextRun, population: Math.max(0, (nextRun.population || 0) - drain.villagers * 2) };
    }
    nextRun = { ...nextRun, stats, activeHerald: null, heraldsSurvived: survived };
    events.push({
      kind: "alert",
      message: `🩸 ${heraldDef.name} took its measure. The drain bit hard.`,
    });
  }

  return { run: nextRun, events };
}

// Apply per-minute drain from the third Herald (The Listener) if survived.
export function tickListenerDrain(state, now = Date.now()) {
  const run = state.run;
  if (!run?.heraldsSurvived?.includes("theListener")) return { run, events: [] };
  const last = run.lastListenerDrainAt || now;
  if (now - last < 60_000) return { run, events: [] };
  const stats = { ...(run.stats || {}) };
  stats.sanity = Math.max(0, (stats.sanity ?? 50) - 0.5);
  return {
    run: {
      ...run,
      stats,
      morale: Math.max(0, (run.morale ?? 50) - 0.5),
      lastListenerDrainAt: now,
    },
    events: [],
  };
}

function describeReward(reward) {
  return Object.entries(reward).map(([r, q]) => `+${q} ${r}`).join(", ");
}

// Apply the path-switch penalty. Caller verifies the new arc is reachable.
import { PATH_SWITCH_PENALTY } from "../content/reckoning.js";
export function applyPathSwitchPenalty(state, newArc) {
  const run = state.run;
  if (!run?.reckoningClock) return { run, events: [] };
  const events = [];
  let inventory = { ...(run.inventory || {}) };
  let stats = { ...(run.stats || {}) };
  let alignment = { ...(run.alignment || { good: 0, evil: 0 }) };
  let worldScore = run.worldScore || 0;

  // Time tax — move the apex up by clockTimeOffMs.
  const newClock = Math.max(Date.now(), (run.reckoningClock || Date.now()) - PATH_SWITCH_PENALTY.clockTimeOffMs);

  // Resource sacrifice.
  for (const [r, q] of Object.entries(PATH_SWITCH_PENALTY.cost)) {
    inventory[r] = Math.max(0, (inventory[r] || 0) - q);
  }
  // Stat hit.
  stats.sanity = Math.max(0, (stats.sanity ?? 50) - PATH_SWITCH_PENALTY.sanityHit);
  // Opposite-alignment zero.
  if (newArc === "mending") {
    alignment.evil = 0;
  } else if (newArc === "communion") {
    worldScore = 0;
  }
  // Herald reset.
  events.push({
    kind: "alert",
    message: `⚖️ Path switched to ${newArc}. Penalty: -20 min clock, resources burned, -${PATH_SWITCH_PENALTY.sanityHit} sanity, opposite arc zeroed, Heralds re-spawning.`,
  });

  return {
    run: {
      ...run,
      inventory, stats, alignment, worldScore,
      reckoningClock: newClock,
      eraArc: newArc,
      heraldsSpawned: [],
      heraldsSurvived: [],
      activeHerald: null,
    },
    events,
  };
}
