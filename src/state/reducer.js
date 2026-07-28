// The reducer is intentionally THIN. It dispatches to systems for actual logic.

import { ACTIONS } from "./actions.js";
import { freshRun } from "./run.js";
import { performGather } from "../systems/gathering.js";
import { performBuild, performRepair } from "../systems/building.js";
import { performRecruit, setActiveCompanion } from "../systems/companions.js";
import { performListen } from "../systems/research.js";
import { performCraft, startCraft, tickActiveCraft, cancelActiveCraft } from "../systems/crafting.js";
import { performImbueWeapon, performRemoveImbue, performBless, tickBlessings } from "../systems/runesmithing.js";
import { performEnchant } from "../systems/enchantments.js";
import { performHunt } from "../systems/hunting.js";
import { performPatrol } from "../systems/patrol.js";
import { performMug } from "../systems/thievery.js";
import {
  performSurvivalAction,
  performDrink,
  performBoilWater,
} from "../systems/survival.js";
import { tickDiseases } from "../systems/disease.js";
import { applyImbuePassives } from "../systems/combat.js";
import {
  performStartStudy,
  performSetActiveStudy,
  performCancelStudy,
  tickStudies,
} from "../systems/studies.js";
import { tickWorldScore } from "../systems/world.js";
import { tickSummon, performBindSummon } from "../systems/summoning.js";
import { tickRebellion } from "../systems/rebellion.js";
import { performUseTinker } from "../systems/tinker.js";
import { startReckoning, tickReckoning, tickListenerDrain, resolveHerald, applyPathSwitchPenalty, engageHerald, ritualAttack, heraldAttack } from "../systems/reckoning.js";
import { performFireApex } from "../systems/apex.js";
import {
  performEquip,
  performUnequip,
  performEquipRing,
  performUnequipRing,
} from "../systems/equipment.js";
import {
  getAllResources,
  isResourceHidden,
} from "../content/resources.js";
import { SURVIVAL } from "../content/survival.js";
import { performCastSpell } from "../systems/spells.js";
import { performUseTool } from "../systems/consumables.js";
import { performBuyEchoUpgrade, applyEchoUpgrades } from "../systems/echoes.js";
import { performBossFightEnd } from "../systems/boss.js";
import { setActiveLoop, clearActiveLoop, tickActiveLoop } from "../systems/loop.js";
import { tickWorkers } from "../systems/workers.js";
import { tickPopulation, tickRecipeProduction, setBuildingAssignment, tickConsumption, tickTradeRoutes, tickMorale, performCleanseTaint } from "../systems/town.js";
import {
  applyPassiveProduction,
  clearStalePests,
} from "../systems/passive.js";
import { processSpoilage } from "../systems/storage.js";
import {
  maybeRollInterval,
  respondToActiveEvent,
} from "../systems/events.js";
import { getPrestigeReward } from "../systems/prestige.js";
import { computeEra } from "../systems/era.js";
import { getEraStory } from "../content/eraStories.js";
import { applyEffect } from "../systems/survival.js";
import { getAllMusic } from "../content/audio.js";
import {
  snapshotRun,
  updateLifetime,
  appendRunHistory,
} from "../systems/stats.js";
import { stampEtchingOnce } from "../systems/etchings.js";

const MAX_LOG = 30;

function appendLog(run, events) {
  if (!events) return run;
  const arr = Array.isArray(events) ? events : [events];
  let log = run.log;
  for (const event of arr) {
    if (!event) continue;
    const entry = { t: Date.now(), kind: event.kind, message: event.message };
    log = [entry, ...log];
  }
  return { ...run, log: log.slice(0, MAX_LOG) };
}

// Player-initiated world action — appendLog + stamp `lastActionAt` so the
// Arcane Studies clock pauses (systems/studies.js). Use this everywhere a
// world action happens (gather, build, eat, etc). Meta-actions (LOAD,
// RESET, dev patches, view changes) should NOT call this — they go
// through plain appendLog.
function appendLogAndStamp(run, events, now = Date.now()) {
  return appendLog({ ...run, lastActionAt: now }, events);
}

function endRunAndSnapshot(state, ending) {
  const snapshot = snapshotRun(state, ending);
  const lifetimeStats = updateLifetime(state.persistent.lifetimeStats, snapshot);
  const runHistory = appendRunHistory(state.persistent.runHistory || [], snapshot);
  return { snapshot, lifetimeStats, runHistory };
}

// Snapshot every resource the player had unhidden at the moment of
// ascension — those names + descriptions stay known across every future
// run. Most relevant for fragments ("Arcane Shards" — once you've learned
// what they are, they don't go back to "???" in your next life). Called
// from the PRESTIGE reducer case.
function snapshotKnownResources(state) {
  const known = { ...(state.persistent.permanentlyKnown || {}) };
  for (const r of getAllResources()) {
    // Only care about resources that have a hidden state to begin with.
    if (!r.hiddenUntil) continue;
    if (!isResourceHidden(state, r)) known[r.id] = true;
  }
  return known;
}

// Build the post-prestige run. The player ascended — they don't start
// life over in a daze. They start at Era 1: rock found + awakened, hut
// raised, survival mechanics active. They still rebuild Fire Pit, Water
// Hole, Garden, etc. — but the cosmic-horror opening is something they
// only experience once.
function seedAscensionRun(persistent) {
  const fresh = freshRun();
  const now = Date.now();
  // #234 — preserve Era 5 resources via Touched Memory.
  const carry = persistent.reckoningCarryPending || {};
  const inventory = { ...(fresh.inventory || {}) };
  for (const [r, q] of Object.entries(carry)) {
    inventory[r] = (inventory[r] || 0) + q;
  }
  return applyEchoUpgrades(
    {
      ...fresh,
      inventory,
      rockFound: true,
      rockAwakened: true,
      rockAwakenedAt: now - 5000,
      built: { ...fresh.built, hut: { at: now } },
      stats: { ...SURVIVAL.startValues },
      splashSeen: true,
    },
    persistent
  );
}

export function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOAD:
      return action.payload || state;

    case ACTIONS.RESET_RUN: {
      const { lifetimeStats, runHistory } = endRunAndSnapshot(state, "reset");
      const persistent = {
        ...state.persistent,
        runHistory,
        lifetimeStats: {
          ...lifetimeStats,
          runsStarted: lifetimeStats.runsStarted + 1,
        },
      };
      const run = applyEchoUpgrades(freshRun(), persistent);
      return { persistent, run };
    }

    case ACTIONS.PRESTIGE: {
      const reward = getPrestigeReward(state);
      const { lifetimeStats, runHistory } = endRunAndSnapshot(state, "prestige");
      // Snapshot anything the player knew (resources with hiddenUntil
      // that were currently revealed) so it stays known across this and
      // all future ascensions.
      const permanentlyKnown = snapshotKnownResources(state);

      // #234 — Touched Memory echo upgrades preserve Era 5 resources.
      // Tier 1=1, 2=3, 3=10, 4=all. Read from persistent.echoUpgrades.
      const tmLevel = (state.persistent.echoUpgrades?.touchedMemory?.level || 0);
      const tmKeep = [0, 1, 3, 10, -1][tmLevel] || 0;
      const _carryBag = {};
      if (tmLevel > 0) {
        const vr = state.run.inventory?.void_residue || 0;
        const fl = state.run.inventory?.firstLightShard || 0;
        if (tmKeep === -1) {
          _carryBag.void_residue = vr;
          _carryBag.firstLightShard = fl;
        } else {
          _carryBag.void_residue = Math.min(vr, tmKeep);
          _carryBag.firstLightShard = Math.min(fl, tmKeep);
        }
      }
      // Cosmic Memory is always preserved.
      const cm = state.run.inventory?.cosmic_memory || 0;
      if (cm > 0) _carryBag.cosmic_memory = cm;
      // Stash on persistent so seedAscensionRun can read it.
      const reckoningCarry = _carryBag;
      let persistent = {
        ...state.persistent,
        echoes: state.persistent.echoes + reward.echoes,
        runHistory,
        permanentlyKnown,
        reckoningCarryPending: reckoningCarry,
        lifetimeStats: {
          ...lifetimeStats,
          runsStarted: lifetimeStats.runsStarted + 1,
          runsCompleted: lifetimeStats.runsCompleted + 1,
        },
      };
      // #176 — ascension stamp. Use the updated runsCompleted count
      // as N so multiple ascensions accumulate as separate marks.
      const n = persistent.lifetimeStats.runsCompleted;
      persistent = stampEtchingOnce(persistent, `ascension:${n}`, `Ascension ${n}`);
      // Ascension start: Era 1 — rock found + awakened, hut already
      // raised, survival mechanics live. The "find the stone in the
      // dust" opening only plays once per save lifetime.
      const run = seedAscensionRun(persistent);
      return { persistent, run };
    }

    case ACTIONS.BUY_ECHO_UPGRADE: {
      const { persistent, events } = performBuyEchoUpgrade(
        state.persistent,
        action.upgradeId
      );
      return { persistent, run: appendLog(state.run, events) };
    }

    case ACTIONS.SET_ACTIVE_LOOP: {
      const { run, persistent, events } = setActiveLoop(state, action.kind, action.target);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.CLEAR_ACTIVE_LOOP: {
      const { run, persistent, events } = clearActiveLoop(state);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.SET_COMBAT_STYLE: {
      const style = action.style;
      if (!["melee", "ranged", "magic"].includes(style)) return state;
      return {
        ...state,
        run: appendLog(
          { ...state.run, combatStyle: style },
          [{ kind: "info", message: `🎯 Combat style: ${style}.` }]
        ),
      };
    }

    case ACTIONS.TICK_LOOP: {
      // Active patrol/gather/etc loop
      const loopResult = tickActiveLoop(state);
      let run = loopResult.run;
      let persistent = loopResult.persistent;
      const events = [...(loopResult.events || [])];

      // Town workers (#71) — passive drip from hired townspeople.
      const workersState = { ...state, run };
      const workersResult = tickWorkers(workersState);
      // #182 — population growth tick. Reads housing cap + survival
      // thresholds and integrates toward +1 villager / 5 min.
      const townTickResult = tickPopulation({ run: workersResult.run, persistent: workersResult.persistent || state.persistent });
      if (townTickResult.events && townTickResult.events.length) {
        workersResult.events = [...(workersResult.events || []), ...townTickResult.events];
      }
      workersResult.run = townTickResult.run;
      if (townTickResult.persistent) workersResult.persistent = townTickResult.persistent;
      // #183 — production recipe tick. Auto-staffs idle villagers across
      // production buildings (round-robin), then consumes inputs +
      // produces outputs scaled by assignment.
      const recipeTickResult = tickRecipeProduction({ run: workersResult.run, persistent: workersResult.persistent || state.persistent });
      if (recipeTickResult.events && recipeTickResult.events.length) {
        workersResult.events = [...(workersResult.events || []), ...recipeTickResult.events];
      }
      workersResult.run = recipeTickResult.run;
      // #192 — settlement consumption tick. Drains food/water/wood per
      // villager per minute. Runs AFTER production so a worker can
      // produce-and-consume in the same tick without double-spending.
      const consumeResult = tickConsumption({ run: workersResult.run, persistent: workersResult.persistent || state.persistent });
      if (consumeResult.events && consumeResult.events.length) {
        workersResult.events = [...(workersResult.events || []), ...consumeResult.events];
      }
      workersResult.run = consumeResult.run;
      // #197 — trade routes. Periodic surplus → coin exchange.
      const tradeResult = tickTradeRoutes({ run: workersResult.run, persistent: workersResult.persistent || state.persistent });
      if (tradeResult.events && tradeResult.events.length) {
        workersResult.events = [...(workersResult.events || []), ...tradeResult.events];
      }
      workersResult.run = tradeResult.run;
      // #199 — morale tick. Drifts run.morale toward equilibrium every 30s.
      const moraleResult = tickMorale({ run: workersResult.run, persistent: workersResult.persistent || state.persistent });
      if (moraleResult.events && moraleResult.events.length) {
        workersResult.events = [...(workersResult.events || []), ...moraleResult.events];
      }
      workersResult.run = moraleResult.run;
      if (workersResult.run !== run) run = workersResult.run;
      events.push(...(workersResult.events || []));

      // Active craft (#130) — resolves when the timer completes.
      const craftState = { ...state, run, persistent };
      const craftResult = tickActiveCraft(craftState);
      if (craftResult.run !== run) run = craftResult.run;
      events.push(...(craftResult.events || []));

      if (!events.length && run === state.run && persistent === state.persistent) return state;
      return { persistent, run: appendLog(run, events) };
    }

    case ACTIONS.BOSS_FIGHT_END: {
      // Boss fight ended — commit damage + rewards + first-defeat etching.
      // Player-initiated, so stamp lastActionAt (studies clock pauses).
      const { run, persistent, events } = performBossFightEnd(
        state,
        action.payload
      );
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.GATHER: {
      const { run, persistent, events } = performGather(state);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.BUILD: {
      const { run, persistent, events } = performBuild(state, action.buildingId);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.RESEARCH: {
      const { run, persistent, events } = performListen(state, action.researchId);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.CRAFT_TOOL: {
      // #130 — timed crafts. #126 — qty queues up multiple in a row.
      const { run, persistent, events } = startCraft(state, action.toolId, undefined, action.qty || 1);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case "CANCEL_CRAFT": {
      // #130 — cancel the active job. Materials NOT refunded.
      const { run, persistent, events } = cancelActiveCraft(state);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case "IMBUE_WEAPON": {
      // #132 — bind a rune to a weapon-type.
      const { run, persistent, events } = performImbueWeapon(state, action.weaponId, action.runeId);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case "REMOVE_IMBUE": {
      const { run, persistent, events } = performRemoveImbue(state, action.weaponId, action.runeId);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case "BLESS_RUNE": {
      // #151 — burn a rune for a temporary buff. See systems/runesmithing.js.
      const { run, persistent, events } = performBless(state, action.runeId);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case "ENCHANT_WEAPON": {
      // #170 (#37) — permanent, study-gated weapon enchantment.
      const { run, persistent, events } = performEnchant(state, action.weaponId, action.enchantId);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.THIEVERY_MUG: {
      const { run, persistent, events } = performMug(state, action.targetId);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.SET_BUILDING_ASSIGNMENT: {
      // #187 — manual staffing lock. action.count==null clears the lock.
      const { run, events } = setBuildingAssignment(state.run, action.buildingId, action.count);
      return { persistent: state.persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.REPAIR_BUILDING: {
      // #194 — rebuild a raid-destroyed building at 50% cost.
      const { run, persistent, events } = performRepair(state, action.buildingId);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.RECRUIT_COMPANION: {
      const { run, persistent, events } = performRecruit(state, action.id);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.SET_ACTIVE_COMPANION: {
      const { run, events } = setActiveCompanion(state, action.id);
      return { persistent: state.persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.BIND_SUMMON: {
      const { run, persistent, events } = performBindSummon(state, action.id);
      let nextRun = run;
      if (run.activeSummon && action.productionTarget) {
        nextRun = {
          ...run,
          activeSummon: { ...run.activeSummon, productionTarget: action.productionTarget },
        };
      }
      return { persistent, run: appendLogAndStamp(nextRun, events) };
    }

    case ACTIONS.DISMISS_SUMMON: {
      if (!state.run.activeSummon) return state;
      return {
        persistent: state.persistent,
        run: appendLogAndStamp(
          { ...state.run, activeSummon: null },
          [{ kind: "info", message: "🪐 You dismiss the summon. The circle empties." }],
        ),
      };
    }

    case ACTIONS.CLEANSE_TAINT: {
      const { run, events } = performCleanseTaint(state, action.buildingId);
      return { persistent: state.persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.USE_TINKER: {
      const { run, events } = performUseTinker(state, action.itemId);
      return { persistent: state.persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.RESOLVE_HERALD: {
      const { run, events } = resolveHerald(state, action.choiceId, action.outcome);
      return { persistent: state.persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.PATH_SWITCH: {
      const { run, events } = applyPathSwitchPenalty(state, action.newArc);
      return { persistent: state.persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.DEV_RECKONING_ADJUST: {
      const run = state.run;
      if (!run?.reckoningClock) return state;
      const delta = action.deltaMs || 0;
      const nextClock = Math.max(Date.now(), run.reckoningClock + delta);
      return { persistent: state.persistent, run: { ...run, reckoningClock: nextClock } };
    }
    case ACTIONS.DEV_RECKONING_SET_DURATION: {
      const run = state.run;
      if (!run?.reckoningClock) return state;
      const newDur = Math.max(60_000, action.durationMs || 0);
      return { persistent: state.persistent, run: { ...run, reckoningDurationMs: newDur, reckoningClock: (run.reckoningStartedAt || Date.now()) + newDur } };
    }
    case ACTIONS.DEV_RECKONING_PAUSE: {
      return { persistent: state.persistent, run: { ...state.run, reckoningClockPaused: !state.run.reckoningClockPaused } };
    }
    case ACTIONS.DEV_RECKONING_SPAWN_HERALD: {
      const heralds = ["mouthAtTheGate", "shapeOfWhatYouBuilt", "theListener"];
      const id = action.heraldId || heralds[(state.run.heraldsSpawned || []).length] || "mouthAtTheGate";
      return { persistent: state.persistent, run: { ...state.run, activeHerald: { id, kind: "manual", shape: null, spawnedAt: Date.now() } } };
    }

    case ACTIONS.FIRE_APEX: {
      const { run, persistent, events } = performFireApex(state);
      return { persistent: persistent || state.persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.ENGAGE_HERALD: {
      const { run, events } = engageHerald(state);
      return { persistent: state.persistent, run: appendLogAndStamp(run, events) };
    }
    case ACTIONS.RITUAL_ATTACK: {
      const { run, events } = ritualAttack(state, action.mode);
      return { persistent: state.persistent, run: appendLogAndStamp(run, events) };
    }
    case ACTIONS.HERALD_ATTACK: {
      const { run, events } = heraldAttack(state);
      return { persistent: state.persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.HUNT: {
      const { run, persistent, events } = performHunt(state);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.PATROL: {
      const target = action.target || {};
      const { run, persistent, events } = performPatrol(state, target);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.EAT: {
      const { run, persistent, events } = performSurvivalAction(state, "eat", {
        preferredFoodId: action.preferredFoodId,
      });
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.DRINK: {
      // Tiered drink (BUGS.md / ERA_PLAN.md "Water tiers + dysentery").
      // waterType is optional; performDrink auto-picks the best tier if
      // none provided.
      const { run, persistent, events } = performDrink(state, action.waterType);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.BOIL_WATER: {
      const { run, persistent, events } = performBoilWater(state);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.REST: {
      const { run, persistent, events } = performSurvivalAction(state, "rest");
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.RITUAL: {
      const { run, persistent, events } = performSurvivalAction(state, "ritual");
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.CAST_SPELL: {
      const { run, persistent, events } = performCastSpell(state, action.spellId);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    case ACTIONS.USE_TOOL: {
      const { run, persistent, events } = performUseTool(state, action.toolId);
      return { persistent, run: appendLogAndStamp(run, events) };
    }

    // ─── Arcane Studies (#27) ─────────────────────────────────────────
    // START_STUDY costs scroll + ink AND counts as a world action — it
    // stamps lastActionAt so the clock starts paused (player gets ~5s
    // to see the start before time begins to accrue). SET_ACTIVE and
    // CANCEL are pure focus / housekeeping — no stamp.
    case ACTIONS.START_STUDY: {
      const { run, persistent, events } = performStartStudy(state, action.nodeId);
      return { persistent, run: appendLog(run, events) };
    }

    case ACTIONS.SET_ACTIVE_STUDY: {
      const { run, persistent, events } = performSetActiveStudy(state, action.nodeId);
      return { persistent, run: appendLog(run, events) };
    }

    case ACTIONS.CANCEL_STUDY: {
      const { run, persistent, events } = performCancelStudy(state, action.nodeId);
      return { persistent, run: appendLog(run, events) };
    }

    // ─── Combat — equipment slots (#32) ───────────────────────────────
    // Equipping/unequipping is housekeeping, not a world action. No
    // lastActionAt stamp — studies clock doesn't pause on equip.
    case ACTIONS.EQUIP: {
      const { run, events } = performEquip(state, action.id, action.slot);
      return { persistent: state.persistent, run: appendLog(run, events) };
    }

    case ACTIONS.UNEQUIP: {
      const { run, events } = performUnequip(state, action.slot);
      return { persistent: state.persistent, run: appendLog(run, events) };
    }

    case ACTIONS.EQUIP_RING: {
      const { run, events } = performEquipRing(state, action.id, action.ringIndex);
      return { persistent: state.persistent, run: appendLog(run, events) };
    }

    case ACTIONS.UNEQUIP_RING: {
      const { run, events } = performUnequipRing(state, action.ringIndex);
      return { persistent: state.persistent, run: appendLog(run, events) };
    }

    case ACTIONS.MARK_SPLASH_SEEN:
      if (state.run.splashSeen) return state;
      return { ...state, run: { ...state.run, splashSeen: true } };

    case ACTIONS.SYNC_MUSIC_UNLOCKS: {
      const era = computeEra(state);
      const unlockedMusic = { ...(state.persistent.unlockedMusic || {}) };
      const newEvents = [];
      let changed = false;

      for (const track of getAllMusic()) {
        if (unlockedMusic[track.id]) continue;
        const eraTags = (track.tags || []).filter((t) => /^era\d+$/.test(t));
        if (eraTags.length === 0) continue;
        const eraNumbers = eraTags
          .map((t) => parseInt(t.slice(3), 10))
          .filter((n) => !isNaN(n));
        if (eraNumbers.length === 0) continue;
        const minEra = Math.min(...eraNumbers);
        if (era >= minEra) {
          unlockedMusic[track.id] = { unlockedAt: Date.now() };
          changed = true;
          newEvents.push({
            kind: "music_unlocked",
            message: `🎵 New music: "${track.title}"${track.artist ? ` by ${track.artist}` : ""
              }.`,
          });
        }
      }

      if (!changed) return state;
      return {
        persistent: { ...state.persistent, unlockedMusic },
        run: appendLog(state.run, newEvents),
      };
    }

    case ACTIONS.SYNC_ERA: {
      const era = computeEra(state);
      const seen = state.run.eraMilestonesSeen || {};
      const eraDirty = (state.run.era || 0) !== era;
      if (era === 0 || seen[era]) {
        let next = state;
        if (eraDirty) next = { ...next, run: { ...next.run, era } };
        const best = state.persistent.lifetimeStats.bestEraReached || 0;
        if (era > best) {
          next = {
            ...next,
            persistent: {
              ...next.persistent,
              lifetimeStats: {
                ...next.persistent.lifetimeStats,
                bestEraReached: era,
              },
            },
          };
        }
        return next;
      }

      const newSeen = { ...seen, [era]: true };
      // #205 — write run.era so building gates can read it synchronously.
      let run = { ...state.run, eraMilestonesSeen: newSeen, era };

      // #225 — Era 5 entry starts the reckoning clock.
      if (era === 5 && !run.reckoningClock) {
        run = startReckoning(run);
      }

      const story = getEraStory(era);
      const events = [];
      if (story) {
        if (story.log) events.push(story.log);
        if (story.sanityBoost || story.happinessBoost) {
          run.stats = applyEffect(run.stats || {}, {
            sanity: story.sanityBoost || 0,
            happiness: story.happinessBoost || 0,
          });
        }
      }

      // #205 — stamp settlement:era:N etching on first entry.
      let persistent = stampEtchingOnce(
        state.persistent,
        `settlement:era:${era}`,
        `Reached era ${era}`,
      );
      persistent = {
        ...persistent,
        lifetimeStats: {
          ...persistent.lifetimeStats,
          bestEraReached: Math.max(
            persistent.lifetimeStats.bestEraReached || 0,
            era
          ),
        },
      };

      return { persistent, run: appendLog(run, events) };
    }

    case ACTIONS.TICK: {
      let run = state.run;
      let persistent = state.persistent;
      const allEvents = [];

      const passiveResult = applyPassiveProduction({ run, persistent });
      run = passiveResult.run;
      allEvents.push(...passiveResult.events);

      const spoilResult = processSpoilage({ run, persistent });
      run = spoilResult.run;
      allEvents.push(...spoilResult.events);

      // Tick diseases — slow drain + expiry. See systems/disease.js.
      const diseaseResult = tickDiseases({ run, persistent });
      run = diseaseResult.run;
      allEvents.push(...diseaseResult.events);

      // Rune imbue passives (#133) — Elemental rune hp regen-per-minute.
      // 15s tick; the helper accumulates the fractional remainder so the
      // trickle is honest over time. See systems/combat.js applyImbuePassives.
      const imbuePassiveResult = applyImbuePassives(run, 15);
      run = imbuePassiveResult.run;
      allEvents.push(...imbuePassiveResult.events);

      // #151 — clear any expired blessings + log the fade.
      const blessTick = tickBlessings(run);
      run = blessTick.run;
      allEvents.push(...blessTick.events);

      // Tick the active arcane study, if any. Clock only advances when the
      // player has been idle for >= IDLE_THRESHOLD_MS. Completion fires a
      // log event + applies per-path deltas + writes altar etchings (which
      // is why persistent comes back through this call). See systems/
      // studies.js applyCompletionEffects.
      const studyResult = tickStudies({ run, persistent });
      run = studyResult.run;
      persistent = studyResult.persistent;
      allEvents.push(...studyResult.events);

      // Tick the World Score: applies the Ash Cleanse passive trickle and
      // fires the apex reveal event the first time the score crosses 100.
      // See systems/world.js. Score deltas from study completions and
      // spell casts are applied directly by those systems — this tick
      // handles only the passive trickle + reveal.
      const worldResult = tickWorldScore({ run, persistent });
      run = worldResult.run;
      allEvents.push(...worldResult.events);

      // #212 — summon expiry tick.
      const summonResult = tickSummon({ run, persistent });
      run = summonResult.run;
      allEvents.push(...summonResult.events);

      // #213 — rebellion tick.
      const rebelResult = tickRebellion({ run, persistent });
      run = rebelResult.run;
      persistent = rebelResult.persistent || persistent;
      allEvents.push(...rebelResult.events);

      // #225 — reckoning clock tick (Era 5).
      const reckResult = tickReckoning({ run, persistent });
      run = reckResult.run;
      persistent = reckResult.persistent || persistent;
      allEvents.push(...reckResult.events);

      // #228 — Listener Herald per-minute drain (if survived).
      const lisResult = tickListenerDrain({ run, persistent });
      run = lisResult.run;
      allEvents.push(...lisResult.events);

      const pestResult = clearStalePests(run);
      run = pestResult.run;
      allEvents.push(...pestResult.events);

      const eventResult = maybeRollInterval({ run, persistent });
      if (eventResult) {
        run = eventResult.run;
        persistent = eventResult.persistent;
        allEvents.push(...eventResult.events);
      }

      if (run === state.run && persistent === state.persistent && allEvents.length === 0) {
        return state;
      }

      return { persistent, run: appendLog(run, allEvents) };
    }

    case ACTIONS.RESPOND_TO_EVENT: {
      // Responding to an event is a player-initiated action — stamp lastActionAt.
      const eventResult = respondToActiveEvent(state, action.choiceId);
      if (!eventResult) return state;
      return {
        persistent: eventResult.persistent,
        run: appendLogAndStamp(eventResult.run, eventResult.events),
      };
    }

    case ACTIONS.CLEAR_LOG:
      return { ...state, run: { ...state.run, log: [] } };

    case ACTIONS.DEV_PATCH: {
      const patch = action.patch || {};
      const run = patch.run || state.run;
        const persistent = patch.persistent || state.persistent;
      const events = [];
      if (Array.isArray(patch.events)) events.push(...patch.events);
      if (patch.msg) events.push({ kind: "dev", message: patch.msg });
      return { persistent, run: appendLog(run, events) };
    }

    default:
      return state;
  }
}
