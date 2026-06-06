// The reducer is intentionally THIN. It dispatches to systems for actual logic.

import { ACTIONS } from "./actions.js";
import { freshRun } from "./run.js";
import { performGather } from "../systems/gathering.js";
import { performBuild } from "../systems/building.js";
import { performListen } from "../systems/research.js";
import { performCraft } from "../systems/crafting.js";
import { performHunt } from "../systems/hunting.js";
import { performPatrol } from "../systems/patrol.js";
import {
  performSurvivalAction,
  performDrink,
  performBoilWater,
} from "../systems/survival.js";
import { tickDiseases } from "../systems/disease.js";
import {
  performStartStudy,
  performSetActiveStudy,
  performCancelStudy,
  tickStudies,
} from "../systems/studies.js";
import { tickWorldScore } from "../systems/world.js";
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
  return applyEchoUpgrades(
    {
      ...fresh,
      rockFound: true,
      rockAwakened: true,
      rockAwakenedAt: now - 5000, // outside the awakening-flash window
      built: { ...fresh.built, hut: { at: now } },
      stats: { ...SURVIVAL.startValues },
      splashSeen: true, // splash is for first-life only
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
      // all future ascensions. Most importantly: fragments stop reading
      // "???" once they've ascended carrying knowledge of them.
      const permanentlyKnown = snapshotKnownResources(state);
      const persistent = {
        ...state.persistent,
        echoes: state.persistent.echoes + reward.echoes,
        runHistory,
        permanentlyKnown,
        lifetimeStats: {
          ...lifetimeStats,
          runsStarted: lifetimeStats.runsStarted + 1,
          runsCompleted: lifetimeStats.runsCompleted + 1,
        },
      };
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

    case ACTIONS.TICK_LOOP: {
      // Active patrol/gather/etc loop
      const loopResult = tickActiveLoop(state);
      let run = loopResult.run;
      let persistent = loopResult.persistent;
      const events = [...(loopResult.events || [])];

      // Town workers (#71) — passive drip from hired townspeople.
      const workersState = { ...state, run };
      const workersResult = tickWorkers(workersState);
      if (workersResult.run !== run) run = workersResult.run;
      events.push(...(workersResult.events || []));

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
      const { run, persistent, events } = performCraft(state, action.toolId);
      return { persistent, run: appendLogAndStamp(run, events) };
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
      if (era === 0 || seen[era]) {
        const best = state.persistent.lifetimeStats.bestEraReached || 0;
        if (era > best) {
          return {
            ...state,
            persistent: {
              ...state.persistent,
              lifetimeStats: {
                ...state.persistent.lifetimeStats,
                bestEraReached: era,
              },
            },
          };
        }
        return state;
      }

      const newSeen = { ...seen, [era]: true };
      let run = { ...state.run, eraMilestonesSeen: newSeen };

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

      const persistent = {
        ...state.persistent,
        lifetimeStats: {
          ...state.persistent.lifetimeStats,
          bestEraReached: Math.max(
            state.persistent.lifetimeStats.bestEraReached || 0,
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
      // Responding to an event is a player-initiated action — pause studies.
      const result = respondToActiveEvent(state, action.choiceId);
      return {
        persistent: result.persistent,
        run: appendLogAndStamp(result.run, result.events),
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
