// Summoning system (#212).
//
// Temporary realm-pulled allies. Distinct from companions:
//   • Companions: permanent, slotted at run.companions.active
//   • Summons:    temporary (30 min – 2h), slotted at run.activeSummon
//
// Public API:
//   canBindSummon(state, summonId) → { ok, reason }
//   performBindSummon(state, summonId) → { run, persistent, events }
//   tickSummon(state, now) → { run, events } — expires when past expiresAt
//   getActiveSummonBonus(state) → bonuses dict (analogous to companion)
//   getActiveSummon(state) → live summon record | null
//
// State shape:
//   run.activeSummon = null | { id, bindAt, expiresAt, productionTarget?: buildingId }
//
// Rebellion interaction (#213):
//   evil summons with bonuses.suppressesRebellion = true cause the
//     tickRebellion damage loop to skip rounds.
//   good summons with bonuses.breaksRebellionOnBind = true clear
//     run.rebellionActiveSince on bind.

import { SUMMONS, getSummon } from "../content/summons.js";
import { stampEtchingOnce } from "./etchings.js";
import { gainXp } from "./skills.js";

// XP per tier on bind. Apex summons are a big learning moment.
const SUMMON_BIND_XP = { minor: 15, major: 40, apex: 100 };
// Sigilcraft also earns a synergy bonus on bind (binding circles use sigils).
const SUMMON_SIGILCRAFT_BIND_XP = { minor: 4, major: 12, apex: 30 };

export function canBindSummon(state, summonId) {
  const def = getSummon(summonId);
  if (!def) return { ok: false, reason: "Unknown summon." };
  // Already a summon active?
  if (state.run.activeSummon && state.run.activeSummon.expiresAt > Date.now()) {
    return { ok: false, reason: "A summon is already bound." };
  }
  // Summoning Circle required.
  if (!state.run.built?.summoningCircle) {
    return { ok: false, reason: "Requires Summoning Circle." };
  }
  // Skill gate.
  const summonLvl = state.run.skills?.summoning?.level || 0;
  if (summonLvl < (def.bindRequires?.summoningLevel || 1)) {
    return { ok: false, reason: `Requires Summoning ${def.bindRequires.summoningLevel}.` };
  }
  // Other skill gates.
  if (def.bindRequires?.otherSkills) {
    for (const [skillId, minLevel] of Object.entries(def.bindRequires.otherSkills)) {
      const lvl = state.run.skills?.[skillId]?.level || 0;
      if (lvl < minLevel) {
        return { ok: false, reason: `Requires ${skillId} ${minLevel}.` };
      }
    }
  }
  // Cross-skill count gate (apex: 4 skills at ≥ 8).
  if (def.bindRequires?.otherSkillsAtLeast) {
    const need = def.bindRequires.otherSkillsAtLeast;
    let count = 0;
    for (const [, sk] of Object.entries(state.run.skills || {})) {
      if ((sk.level || 0) >= need.minLevel) count++;
    }
    if (count < need.count) {
      return { ok: false, reason: `Need ${need.count} skills at ≥ ${need.minLevel} (have ${count}).` };
    }
  }
  // Path mastery gate.
  if (def.bindRequires?.pathMastered) {
    // We approximate path-mastery as: at least one study in that path is completed.
    // (Era-4 design says "mastered" — for now use studiesCompleted with the right path.)
    const cmps = state.run.studiesCompleted || {};
    let found = false;
    for (const id of Object.keys(cmps)) {
      if (id.includes(def.bindRequires.pathMastered)) {
        found = true; break;
      }
    }
    if (!found) return { ok: false, reason: `Requires ${def.bindRequires.pathMastered} path mastered.` };
  }
  // worldScore floor.
  if (def.bindRequires?.worldScoreAtLeast && (state.run.worldScore || 0) < def.bindRequires.worldScoreAtLeast) {
    return { ok: false, reason: `Requires worldScore ≥ ${def.bindRequires.worldScoreAtLeast}.` };
  }
  // Cost check.
  for (const [res, qty] of Object.entries(def.bindCost || {})) {
    if (res === "spirit") {
      if ((state.run.stats?.spirit || 0) < qty) return { ok: false, reason: `Need ${qty} Spirit.` };
      continue;
    }
    if ((state.run.inventory?.[res] || 0) < qty) {
      return { ok: false, reason: `Need ${qty} ${res}.` };
    }
  }
  return { ok: true };
}

export function performBindSummon(state, summonId) {
  const check = canBindSummon(state, summonId);
  if (!check.ok) {
    return { run: state.run, persistent: state.persistent,
      events: [{ kind: "actionFail", message: check.reason }] };
  }
  const def = getSummon(summonId);
  const now = Date.now();

  // Spend cost.
  let inventory = { ...(state.run.inventory || {}) };
  let stats = { ...(state.run.stats || {}) };
  for (const [res, qty] of Object.entries(def.bindCost || {})) {
    if (res === "spirit") {
      stats.spirit = Math.max(0, (stats.spirit || 0) - qty);
      continue;
    }
    inventory[res] = (inventory[res] || 0) - qty;
  }

  // Apply on-bind effects.
  const events = [{ kind: "milestone", message: def.onBindMessage || `🪐 ${def.name} bound.` }];

  // Wraith: alignment evil per call.
  let alignment = state.run.alignment;
  if (def.bonuses?.evilAlignmentPerCall) {
    alignment = { ...(alignment || { good: 0, evil: 0 }) };
    alignment.evil = (alignment.evil || 0) + def.bonuses.evilAlignmentPerCall;
  }
  // Forgehand: world score on bind.
  let worldScore = state.run.worldScore || 0;
  if (def.bonuses?.worldScoreOnBind) {
    worldScore += def.bonuses.worldScoreOnBind;
  }
  // Aspect: clears active rebellion.
  let rebellionActiveSince = state.run.rebellionActiveSince;
  if (def.bonuses?.breaksRebellionOnBind && rebellionActiveSince) {
    rebellionActiveSince = null;
    events.push({ kind: "milestone", message: "☀️ The Aspect's light breaks the rebellion. The villagers calm." });
  }

  const activeSummon = {
    id: summonId,
    bindAt: now,
    expiresAt: now + (def.durationMs || 30 * 60 * 1000),
  };

  // Etching stamps.
  let persistent = stampEtchingOnce(state.persistent, "summon:first", "First summon bound");
  if (def.tier === "apex") {
    persistent = stampEtchingOnce(persistent, "summon:apex:first", `First apex summon bound (${def.name})`);
  }
  persistent = stampEtchingOnce(persistent, `summon:${summonId}:first`, `First ${def.name} bound`);

  // #225 — track apex summon bindings for Era 5 Defiance entry.
  const isApexBind = def.tier === "apex";
  let run = {
    ...state.run,
    inventory, stats, alignment, worldScore,
    activeSummon, rebellionActiveSince,
    apexSummonBound: state.run.apexSummonBound || isApexBind,
  };

  // #222 — XP on bind. Summoning skill earns proportional to tier; the
  // synergy partner (sigilcraft) also gets a chunk for the circle work.
  const bindXp = SUMMON_BIND_XP[def.tier] || 15;
  const sumX = gainXp(run, "summoning", bindXp);
  run = { ...run, skills: sumX.skills };
  events.push(...sumX.events);
  const sigX = gainXp(run, "sigilcraft", SUMMON_SIGILCRAFT_BIND_XP[def.tier] || 4);
  run = { ...run, skills: sigX.skills };
  events.push(...sigX.events);

  return { run, persistent, events };
}

export function getActiveSummon(state) {
  const s = state?.run?.activeSummon;
  if (!s) return null;
  if (s.expiresAt <= Date.now()) return null;
  const def = getSummon(s.id);
  if (!def) return null;
  return { ...s, def };
}

export function getActiveSummonBonus(state) {
  const live = getActiveSummon(state);
  return live?.def?.bonuses || {};
}

// Called from the TICK reducer case. Detects expiry and logs.
// Also accrues a slow drip of Summoning XP for maintenance — every 15s
// of upkeep gives a small amount, so a 1-hour bind grants ~25 XP on top
// of the bind XP. Apex summons drip faster.
const MAINT_XP_PER_TICK = { minor: 1, major: 2, apex: 4 };

export function tickSummon(state, now = Date.now()) {
  const s = state.run.activeSummon;
  if (!s) return { run: state.run, events: [] };

  // Active — drip XP for maintenance, then check expiry.
  const def = getSummon(s.id);

  if (s.expiresAt > now) {
    // Still active. Drip skill XP.
    if (def && (now - (s.lastMaintXpAt || s.bindAt)) >= 15_000) {
      const xpAmt = MAINT_XP_PER_TICK[def.tier] || 1;
      const x = gainXp(state.run, "summoning", xpAmt);
      const nextRun = {
        ...state.run,
        skills: x.skills,
        activeSummon: { ...s, lastMaintXpAt: now },
      };
      return { run: nextRun, events: x.events };
    }
    return { run: state.run, events: [] };
  }

  // Expired.
  const events = def
    ? [{ kind: "milestone", message: def.onExpireMessage || `🪐 ${def.name} fades.` }]
    : [];
  return { run: { ...state.run, activeSummon: null }, events };
}
