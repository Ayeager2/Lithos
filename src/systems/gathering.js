// Gathering system.

import {
  GATHER_TABLE,
  GATHER_ADDITIONS,
  FRAGMENTS_TO_AWAKEN,
} from "../content/gatherTable.js";
import { RESOURCES } from "../content/resources.js";
import { getBuilding } from "../content/buildings.js";
import { getResearch } from "../content/research.js";
import { getToolEffects } from "../content/tools.js";
import { getBuildingBonuses } from "./building.js";
import { getActiveCompanionBonus } from "./companions.js";
import { getResearchBonuses } from "./research.js";
import { getBonus, gainXp } from "./skills.js";
import { getSpdCooldownMult } from "./character.js";
import { applyToolWear } from "./crafting.js";
import { isPestActive } from "./passive.js";
import { clampToCap } from "./storage.js";
import {
  survivalActive,
  decayForAction,
  getYieldMultiplier,
  canGather as canGatherSurvival,
} from "./survival.js";
import { getStudyPassives } from "./studies.js";
import {
  getWorldGatherMultiplier,
  promoteStagnantGather,
} from "./world.js";
import { rollThreatEncounter } from "./threats.js";
import { rollGatherEvent } from "./events.js";
import { pickWeighted, randInt } from "../util/rng.js";
import { SURVIVAL } from "../content/survival.js";

export function getGatherCooldownMs(state) {
  const cfg = SURVIVAL.gather || {};
  let ms = cfg.baseCooldownMs ?? 1500;
  for (const id of Object.keys(state.run.built || {})) {
    const b = getBuilding(id);
    if (b?.effect?.gatherSpeedup) ms -= b.effect.gatherSpeedup;
  }
  for (const id of Object.keys(state.run.researched || {})) {
    const r = getResearch(id);
    if (r?.effect?.gatherSpeedup) ms -= r.effect.gatherSpeedup;
  }
  const toolEff = getToolEffects(state.run);
  if (toolEff.gatherSpeedup) ms -= toolEff.gatherSpeedup;
  ms -= getBonus(state.run, "gatherSpeedup");
  // SPD multiplier (#47) — applied after building/research/tool reductions.
  ms = Math.round(ms * getSpdCooldownMult(state));
  return Math.max(cfg.minCooldownMs ?? 250, ms);
}

export function canGatherFull(state) {
  const survivalCheck = canGatherSurvival(state);
  if (!survivalCheck.ok) return { ...survivalCheck, msRemaining: 0 };

  const lastAt = state.run.lastGatheredAt || 0;
  if (lastAt > 0) {
    const cooldownMs = getGatherCooldownMs(state);
    const elapsed = Date.now() - lastAt;
    if (elapsed < cooldownMs) {
      return {
        ok: false,
        reason: "Catching your breath…",
        msRemaining: cooldownMs - elapsed,
      };
    }
  }
  return { ok: true, msRemaining: 0 };
}

function buildGatherTable(run) {
  let entries;
  if (!run.rockFound) entries = [...GATHER_TABLE.preRock];
  else if (!run.rockAwakened) entries = [...GATHER_TABLE.postRockPreAwaken];
  else entries = [...GATHER_TABLE.postAwaken];

  for (const researchId of Object.keys(run.researched || {})) {
    const addition = GATHER_ADDITIONS[researchId];
    if (addition) entries.push({ ...addition });
  }

  if (isPestActive(run, "birdFlock")) {
    entries = entries.map((e) =>
      e.kind === "resource" && e.id === "food"
        ? { ...e, weight: Math.max(1, Math.floor(e.weight * 0.5)) }
        : e
    );
  }

  return entries;
}

export function performGather(state, rng = Math.random) {
  const gateCheck = canGatherFull(state);
  if (!gateCheck.ok) {
    if (gateCheck.msRemaining > 0) {
      return { run: state.run, persistent: state.persistent, events: [] };
    }
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: gateCheck.reason }],
    };
  }

  let run = {
    ...state.run,
    inventory: { ...state.run.inventory },
    gathered: { ...(state.run.gathered || {}) },
    gatherCount: (state.run.gatherCount || 0) + 1,
    lastGatheredAt: Date.now(),
  };
  const persistent = {
    ...state.persistent,
    lifetimeStats: {
      ...state.persistent.lifetimeStats,
      resourcesByType: { ...state.persistent.lifetimeStats.resourcesByType },
    },
  };

  const table = buildGatherTable(run);
  const result = pickWeighted(rng, table);

  const buildingBonuses = getBuildingBonuses(run);
  const researchBonuses = getResearchBonuses(run);
  const toolEff = getToolEffects(run);
  const skillGatherBonus = getBonus(run, "gatherBonus");
  // #203 — companion bonuses to gather (Pet Crow drop mult, Stray Dog
  // success bonus, Stable Mule small drop mult).
  const compBonus = getActiveCompanionBonus(state);
  const gatherBonus =
    (buildingBonuses.gatherBonus || 0) +
    (researchBonuses.gatherBonus || 0) +
    (toolEff.gatherBonus || 0) +
    skillGatherBonus +
    (compBonus.gatherChanceBonus || 0);
  const compDropMult = compBonus.gatherDropMult || 1.0;

  const yieldMult = survivalActive(state)
    ? getYieldMultiplier(run.stats, run)
    : 1.0;
  // World Score yield bonus (≥5 → ×1.05). See systems/world.js.
  const worldGatherMult = getWorldGatherMultiplier(state);

  persistent.lifetimeStats.totalGathers += 1;

  const events = [];

  switch (result.kind) {
    case "nothing":
      events.push({ kind: "nothing", message: "You search and find nothing of value." });
      break;
    case "resource": {
      const [lo, hi] = result.qty;
      const baseQty = randInt(rng, lo, hi);
      let perResourceBonus = 0;
      // Water tools (Digging Stick, Water Skin) boost the early-game water
      // gather, which is now `water_stagnant` (Era 1 default — see
      // ERA_PLAN.md "Water tiers + dysentery").
      if (result.id === "water_stagnant") perResourceBonus = toolEff.waterBonus || 0;
      else if (result.id === "wood") perResourceBonus = toolEff.woodBonus || 0;
      else if (result.id === "stone") perResourceBonus = toolEff.stoneBonus || 0;
      else if (result.id === "food") perResourceBonus = toolEff.foodBonus || 0;
      const rawQty = baseQty + gatherBonus + perResourceBonus;
      let qty = Math.max(1, Math.round(rawQty * yieldMult * compDropMult * worldGatherMult));

      // World Score may promote a water_stagnant gather to a better tier
      // (≥30: 10% chance to muddy; ≥50: muddy guaranteed, 10% to boiled).
      // The world is giving cleaner water as you tend to it.
      if (result.id === "water_stagnant") {
        const promotedTier = promoteStagnantGather(state, rng);
        if (promotedTier !== "water_stagnant") {
          result.id = promotedTier;
          events.push({
            kind: "event_good",
            message:
              promotedTier === "water_boiled"
                ? "💦 The puddle runs clear — the world's hand on the pour."
                : "💦 The water's less of the dust today.",
          });
        }
      }

      // ─── Stoneword passive — First Listening (Task #31) ────────────
      // Small chance for the gather to yield double — "the world gives,
      // when you knew to listen." Stacks with other yield boosts.
      const studyPassives = getStudyPassives(run);
      if (
        studyPassives.gatherDoubleChance &&
        rng() < studyPassives.gatherDoubleChance
      ) {
        qty *= 2;
        events.push({
          kind: "event_good",
          message: "👂 The ash gives more than it should — because you knew to listen.",
        });
      }

      run.inventory[result.id] = (run.inventory[result.id] || 0) + qty;
      run.gathered[result.id] = (run.gathered[result.id] || 0) + qty;
      persistent.lifetimeStats.totalResourcesGathered += qty;
      persistent.lifetimeStats.resourcesByType[result.id] =
        (persistent.lifetimeStats.resourcesByType[result.id] || 0) + qty;
      const res = RESOURCES[result.id];
      events.push({ kind: "resource", message: `${res.icon} +${qty} ${res.name}` });
      // Fragment Knife (and future arcane edges) hum against the mind when
      // food is reaped with them.
      if (result.id === "food" && toolEff.sanityPerFoodGather) {
        const drain = toolEff.sanityPerFoodGather;
        if (drain < 0 && survivalActive(state)) {
          const stats = run.stats || {};
          const next = Math.max(0, Math.min(100, (stats.sanity ?? 50) + drain));
          if (next !== stats.sanity) {
            run.stats = { ...stats, sanity: next };
            events.push({
              kind: "event_strange",
              message: `🗡️ The blade hums. ${drain} ◐.`,
            });
          }
        }
      }
      break;
    }
    case "rockFind":
      run.rockFound = true;
      persistent.lifetimeStats.rocksFound += 1;
      events.push({
        kind: "rockFind",
        message: "Among the dust, a smooth stone — warm, somehow. You pocket it.",
      });
      break;
    default:
      events.push({ kind: "nothing", message: "Nothing happens." });
  }

  if (run.rockFound && !run.rockAwakened && run.inventory.fragments >= FRAGMENTS_TO_AWAKEN) {
    run.rockAwakened = true;
    run.rockAwakenedAt = Date.now();
    run.inventory.fragments = 0;
    persistent.lifetimeStats.rocksAwakened += 1;
    events.push({
      kind: "awaken",
      message: "The fragments leap from your hand to the stone — and the stone OPENS its eye.",
    });
    const hut = getBuilding("hut");
    if (hut?.whisperOnAvailable) {
      events.push({ kind: "whisper", message: hut.whisperOnAvailable });
    }
  }

  if (run.rockFound) {
    for (const id of Object.keys(run.researched || {})) {
      const r = getResearch(id);
      if (r?.effect?.fragmentChance && rng() < r.effect.fragmentChance) {
        run.inventory.fragments = (run.inventory.fragments || 0) + 1;
        run.gathered.fragments = (run.gathered.fragments || 0) + 1;
        persistent.lifetimeStats.totalResourcesGathered += 1;
        persistent.lifetimeStats.resourcesByType.fragments =
          (persistent.lifetimeStats.resourcesByType.fragments || 0) + 1;
        events.push({ kind: "resource", message: "✨ +1 (something extra glints in the dust)" });
      }
    }
  }

  if (survivalActive({ ...state, run })) {
    run.stats = decayForAction(run.stats || {}, "Gather", run);
  }

  if (survivalActive({ ...state, run })) {
    const threat = rollThreatEncounter({ ...state, run }, rng);
    if (threat) {
      run.inventory = threat.inventory;
      run.stats = threat.stats;
      // Combat-class threats (Phase 2 / #33) tick weapon durability via
      // applyToolWear and return the updated map. Old one-shot threats
      // omit this field, leaving toolDurability untouched.
      if (threat.toolDurability) run.toolDurability = threat.toolDurability;
      events.push(...threat.events);
      persistent.lifetimeStats.threatsEncountered =
        (persistent.lifetimeStats.threatsEncountered || 0) + 1;
    }
  }

  if (survivalActive({ ...state, run })) {
    const ev = rollGatherEvent({ ...state, run, persistent }, rng);
    if (ev) {
      Object.assign(run, ev.run);
      Object.assign(persistent, ev.persistent);
      events.push(...ev.events);
    }
  }

  let xpGain = 1;
  if (result.kind === "resource" && result.id === "food") xpGain += 1;
  if (result.kind === "rockFind") xpGain += 2;
  const xpResult = gainXp(run, "foraging", xpGain);
  run = { ...run, skills: xpResult.skills };
  events.push(...xpResult.events);

  const wearGather = applyToolWear(run, "gather");
  run = wearGather.run;
  events.push(...wearGather.events);
  if (result.kind === "resource" && result.id === "water_stagnant") {
    const wearWater = applyToolWear(run, "waterGather");
    run = wearWater.run;
    events.push(...wearWater.events);
  }

  const clamped = clampToCap(run.inventory, { ...state, run }, state.run.inventory);
  run = { ...run, inventory: clamped.inventory };
  for (const [id, lost] of Object.entries(clamped.overflow)) {
    if (lost > 0) {
      events.push({
        kind: "actionFail",
        message: `📦 ${lost} ${id} wasted — nowhere to put it.`,
      });
    }
  }

  return { run, persistent, events };
}
