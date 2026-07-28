// World Score — the hidden meter (Task #29).
//
// A silent counter that tracks how much the world *remembers* under your
// hand. The world doesn't tell you the number. It just gets quieter, and
// then it gets generous. Eventually it tells you what's been happening,
// once — at the apex threshold.
//
// Contributions (already wired in via per-system code):
//   • Elemental study completion: +1   (STUDY_PATHS — Task #31)
//   • Sigilcraft/Memory/Stoneword: +0.5 each (STUDY_PATHS — Task #31)
//   • Voidcall completion: -1          (STUDY_PATHS — Task #31)
//   • Voidcall spell cast: -1          (performCastSpell — Task #31)
//   • Ash Cleanse passive: +0.01/min   (wired here via tickWorldScore)
//   • NPC-help event choices: +0.5     (light-pass tags in content/events.js)
//
// Effects table (graduated thresholds — locked in ERA_PLAN.md):
//   ≥  5 → Gather yield ×1.05
//   ≥ 15 → Garden output ×1.20  (stacks multiplicatively with farmhouse)
//   ≥ 30 → Gathered water_stagnant promotes to water_muddy ~10% of the time
//   ≥ 50 → Water Hole produces water_boiled directly (skips muddy)
//   ≥ 80 → Garden produces bird_meat instead of grubs
//   ≥100 → Apex reveal: one-shot log event + flag (run.worldScoreRevealed)
//
// Score lives on `run.worldScore` (added in #31). Run-local for now —
// prestige wipes it. A lifetime aggregate can be added to `persistent`
// later for echo unlocks (open question deferred — see ERA_PLAN.md).

// Threshold sentinels — single source of truth.
export const WS_THRESHOLD_GATHER_BONUS = 5;
export const WS_THRESHOLD_GARDEN_BONUS = 15;
export const WS_THRESHOLD_WATER_TIER_BUMP = 30; // chance to promote stagnant→muddy
export const WS_THRESHOLD_WATERHOLE_PROMOTE = 50; // Water Hole → boiled
export const WS_THRESHOLD_GARDEN_PROMOTE = 80; // Garden → bird_meat
export const WS_THRESHOLD_APEX_REVEAL = 100;

// Probability of promoting a `water_stagnant` gather to `water_muddy`
// once WS_THRESHOLD_WATER_TIER_BUMP is reached. The threshold itself is
// the unlock; this is the per-gather roll.
const STAGNANT_PROMOTE_CHANCE = 0.1;

// World Score per-tick passive bonus from Ash Cleanse (Elemental tier 2).
// Reads the `worldScoreBonusOnTick` passive bag.
//
// Note: the keyed name suggests "per tick" but it's actually applied as a
// per-MINUTE rate to keep TICK frequency from changing balance. Same idea
// as passive resource production. The accumulator carries fractional gains
// between ticks until they cross a whole point.

// ─── Helpers ─────────────────────────────────────────────────────────

export function getWorldScore(state) {
  return state?.run?.worldScore || 0;
}

// Pure: returns the bag of active effects given a score value.
// Useful for UI debug + tests.
export function getWorldScoreEffects(score) {
  const s = score || 0;
  return {
    gatherBonus: s >= WS_THRESHOLD_GATHER_BONUS,
    gardenBonus: s >= WS_THRESHOLD_GARDEN_BONUS,
    waterTierBump: s >= WS_THRESHOLD_WATER_TIER_BUMP,
    waterHolePromote: s >= WS_THRESHOLD_WATERHOLE_PROMOTE,
    gardenPromote: s >= WS_THRESHOLD_GARDEN_PROMOTE,
    apexReached: s >= WS_THRESHOLD_APEX_REVEAL,
  };
}

// Yield multiplier applied to all gathers when threshold ≥5.
// Returns 1.0 below threshold, 1.05 at/above.
export function getWorldGatherMultiplier(state) {
  return getWorldScore(state) >= WS_THRESHOLD_GATHER_BONUS ? 1.05 : 1.0;
}

// Garden-output multiplier when threshold ≥15.
// Reads cleanly inside passive.js's getProductionModulators.
export function getWorldGardenMultiplier(state) {
  return getWorldScore(state) >= WS_THRESHOLD_GARDEN_BONUS ? 1.2 : 1.0;
}

// Called in gathering.js when a gather rolls water_stagnant. At score ≥30,
// 10% chance to upgrade to water_muddy. At score ≥50, ALWAYS upgrade to
// at least water_muddy, and 10% chance to further upgrade to water_boiled
// (the Water Hole's "free boiled" effect bleeds into gather rolls too —
// the world's giving you cleaner water).
export function promoteStagnantGather(state, rng = Math.random) {
  const score = getWorldScore(state);
  if (score < WS_THRESHOLD_WATER_TIER_BUMP) return "water_stagnant";
  // At 30..49: 10% chance to promote to muddy.
  if (score < WS_THRESHOLD_WATERHOLE_PROMOTE) {
    return rng() < STAGNANT_PROMOTE_CHANCE ? "water_muddy" : "water_stagnant";
  }
  // At 50+: always at least muddy, occasionally boiled.
  if (rng() < STAGNANT_PROMOTE_CHANCE) return "water_boiled";
  return "water_muddy";
}

// Called by passive.js getProductionRates to potentially redirect Water
// Hole's `water_muddy` output to `water_boiled`. Returns the substituted
// key, or the original if no promotion applies.
export function maybePromoteWaterHoleOutput(state, resourceKey) {
  if (resourceKey !== "water_muddy") return resourceKey;
  return getWorldScore(state) >= WS_THRESHOLD_WATERHOLE_PROMOTE
    ? "water_boiled"
    : "water_muddy";
}

// Called by passive.js getProductionRates to potentially redirect Garden's
// `food` (grubs) output to `bird_meat`. Returns the substituted key.
export function maybePromoteGardenOutput(state, resourceKey) {
  if (resourceKey !== "food") return resourceKey;
  return getWorldScore(state) >= WS_THRESHOLD_GARDEN_PROMOTE
    ? "bird_meat"
    : "food";
}

// ─── TICK contribution + apex reveal ──────────────────────────────────

// Called by reducer's TICK alongside tickStudies / tickDiseases.
// Applies the Ash Cleanse `worldScoreBonusOnTick` passive (a slow trickle
// that runs while the player has the study learned), and fires the apex
// reveal event the first time the threshold is crossed.
//
// Returns { run, events }. Persistent unchanged here — the apex reveal
// flag lives on run (so prestige wipes it; player can re-discover later).
import { getStudyPassives } from "./studies.js";
import { getAllBuildings } from "../content/buildings.js";
import { getActiveSummonBonus } from "./summoning.js";

// Tunable: max ms of offline catchup credited per call — keeps long
// absences from instantly maxing the score from Ash Cleanse trickle.
const MAX_CATCHUP_MS = 30 * 60 * 1000;

export function tickWorldScore(state, now = Date.now()) {
  const run = state.run;
  const events = [];
  let nextRun = run;

  // ─── Ash Cleanse passive trickle + Era 4 building drains ────────
  const passives = getStudyPassives(run);
  let perMin = passives.worldScoreBonusOnTick || 0;

  // #206 — Era 4 building drains.
  for (const b of getAllBuildings()) {
    if (!run.built?.[b.id]) continue;
    const drain = b.effect?.worldScorePerMinute;
    if (drain) perMin += drain;
  }
  // #212 — Aspect summons gain world score; circle drains.
  const sumB = getActiveSummonBonus({ run });
  if (sumB.worldScorePerMin) perMin += sumB.worldScorePerMin;
  if (run.activeSummon && run.activeSummon.expiresAt > Date.now()) {
    perMin -= 0.2;
  }

  if (perMin !== 0) {
    const lastAt = run.lastWorldScoreTickAt || now;
    const elapsedMs = Math.min(now - lastAt, MAX_CATCHUP_MS);
    if (elapsedMs >= 1000) {
      const elapsedMin = elapsedMs / 60000;
      const accum = (run.worldScoreAccum || 0) + perMin * elapsedMin;
      const whole = Math[perMin >= 0 ? "floor" : "ceil"](accum);
      nextRun = {
        ...nextRun,
        worldScoreAccum: accum - whole,
        lastWorldScoreTickAt: now,
      };
      if (whole !== 0) {
        nextRun = {
          ...nextRun,
          worldScore: Math.max(0, (nextRun.worldScore || 0) + whole),
        };
      }
    } else {
      nextRun = { ...nextRun, lastWorldScoreTickAt: now };
    }
  }

  // ─── Apex reveal ────────────────────────────────────────────────
  const score = nextRun.worldScore || 0;
  if (
    score >= WS_THRESHOLD_APEX_REVEAL &&
    !nextRun.worldScoreRevealed
  ) {
    nextRun = { ...nextRun, worldScoreRevealed: true };
    events.push({
      kind: "event_good",
      message:
        "🌿 The wasteland tilts under your hand. Something has happened that the air remembers. The dust answers slower to your feet now. You did this — and the world has been counting.",
    });
  }

  return { run: nextRun, events };
}
