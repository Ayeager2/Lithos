// Dev / debug actions. Skip-the-grind helpers for testing.

import { getAllResources } from "../content/resources.js";
import { getAllBuildings } from "../content/buildings.js";
import { getAllResearch } from "../content/research.js";
import { getAllTools } from "../content/tools.js";
import { getActiveSkills } from "../content/skills.js";
import { SURVIVAL } from "../content/survival.js";
import { FRAGMENTS_TO_AWAKEN } from "../content/gatherTable.js";
import { resolveThreatById } from "./threats.js";

export function devGiveAll(state, qty = 999) {
  const inventory = { ...state.run.inventory };
  for (const r of getAllResources()) inventory[r.id] = qty;
  return { run: { ...state.run, inventory }, msg: `🛠️ +${qty} of every resource.` };
}

export function devSetInventory(state, patch) {
  const inventory = { ...state.run.inventory, ...patch };
  return { run: { ...state.run, inventory }, msg: `🛠️ Set inventory.` };
}

export function devLearnAllResearch(state) {
  const researched = { ...(state.run.researched || {}) };
  for (const r of getAllResearch()) researched[r.id] = { at: Date.now() };
  return { run: { ...state.run, researched }, msg: `🛠️ All research learned.` };
}

export function devBuildAll(state) {
  const built = { ...(state.run.built || {}) };
  for (const b of getAllBuildings()) built[b.id] = { at: Date.now() };
  let stats = state.run.stats;
  if (!state.run.built?.hut) stats = { ...SURVIVAL.startValues };
  return { run: { ...state.run, built, stats }, msg: `🛠️ Every building raised.` };
}

export function devCraftAll(state) {
  const inventory = { ...state.run.inventory };
  const toolDurability = { ...(state.run.toolDurability || {}) };
  const toolsCrafted = { ...(state.run.toolsCrafted || {}) };
  for (const t of getAllTools()) {
    inventory[t.id] = 1;
    if (t.durability?.max) toolDurability[t.id] = t.durability.max;
    toolsCrafted[t.id] = { craftedAt: Date.now(), count: 1 };
  }
  return {
    run: { ...state.run, inventory, toolDurability, toolsCrafted },
    msg: `🛠️ All tools crafted (full durability).`,
  };
}

export function devLevelAllSkills(state, level = 5) {
  const skills = { ...(state.run.skills || {}) };
  const xpForLevel = (lvl) => Math.floor(5 * (Math.pow(1.8, lvl) - 1) / 0.8);
  const xp = xpForLevel(level);
  for (const s of getActiveSkills()) skills[s.id] = { xp, level };
  return { run: { ...state.run, skills }, msg: `🛠️ All skills → lvl ${level}.` };
}

export function devResetSkills(state) {
  return { run: { ...state.run, skills: {} }, msg: `🛠️ Skills wiped.` };
}

export function devMaxStats(state) {
  return {
    run: {
      ...state.run,
      stats: { hunger: 0, thirst: 0, energy: 100, hp: 100, happiness: 100, sanity: 100, spirit: 100 },
    },
    msg: `🛠️ All stats maxed.`,
  };
}

export function devHurtStats(state) {
  return {
    run: {
      ...state.run,
      stats: { hunger: 90, thirst: 90, energy: 5, hp: 15, happiness: 10, sanity: 10, spirit: 10 },
    },
    msg: `🛠️ All stats nearly dead.`,
  };
}

export function devSkipTime(state, minutes = 10) {
  const offsetMs = minutes * 60 * 1000;
  const run = { ...state.run };
  if (run.lastPassiveTickAt > 0) run.lastPassiveTickAt -= offsetMs;
  else run.lastPassiveTickAt = Date.now() - offsetMs;
  if (run.lastSpoilTickAt > 0) run.lastSpoilTickAt -= offsetMs;
  else run.lastSpoilTickAt = Date.now() - offsetMs;
  run.lastGatheredAt = 0;
  run.lastHuntAt = 0;
  return { run, msg: `🛠️ Skipped ${minutes} minutes (next tick processes them).` };
}

export function devTriggerPest(state, pestId = "birdFlock", durationMin = 5) {
  const activePests = {
    ...(state.run.activePests || {}),
    [pestId]: { until: Date.now() + durationMin * 60 * 1000, intensity: 1 },
  };
  return {
    run: { ...state.run, activePests },
    msg: `🛠️ Pest "${pestId}" active for ${durationMin} min.`,
  };
}

export function devClearPests(state) {
  return { run: { ...state.run, activePests: {} }, msg: `🛠️ All pests cleared.` };
}

export function devJumpToEra1(state) {
  const built = { ...(state.run.built || {}), hut: { at: Date.now() } };
  return {
    run: {
      ...state.run,
      rockFound: true,
      rockAwakened: true,
      rockAwakenedAt: Date.now() - 5000,
      built,
      inventory: { ...state.run.inventory, fragments: 0 },
      stats: { ...SURVIVAL.startValues },
      splashSeen: true,
    },
    msg: `🛠️ Jumped to Era 1.`,
  };
}

export function devForceAwaken(state) {
  return {
    run: {
      ...state.run,
      rockFound: true,
      rockAwakened: true,
      rockAwakenedAt: Date.now(),
      inventory: { ...state.run.inventory, fragments: 0 },
    },
    msg: `🛠️ Rock awakened.`,
  };
}

export function devFindRock(state) {
  return { run: { ...state.run, rockFound: true }, msg: `🛠️ Rock found.` };
}

export function devGiveFragments(state, qty = FRAGMENTS_TO_AWAKEN) {
  return {
    run: {
      ...state.run,
      rockFound: true,
      inventory: { ...state.run.inventory, fragments: (state.run.inventory.fragments || 0) + qty },
    },
    msg: `🛠️ +${qty} fragments.`,
  };
}

export function devWipeRun() {
  return { msg: `🛠️ Wiping run...` };
}

export function devNuke() {
  if (typeof localStorage !== "undefined") localStorage.removeItem("namigatchi-save");
  if (typeof window !== "undefined") window.location.reload();
  return { msg: `💥 Nuked save. Reloading...` };
}

export function devUnlockAll(state) {
  let s = { ...state, run: { ...state.run } };
  let patch = devJumpToEra1(s); s = { ...s, run: patch.run };
  patch = devLearnAllResearch(s); s = { ...s, run: patch.run };
  patch = devBuildAll(s); s = { ...s, run: patch.run };
  patch = devCraftAll(s); s = { ...s, run: patch.run };
  patch = devLevelAllSkills(s, 5); s = { ...s, run: patch.run };
  patch = devMaxStats(s); s = { ...s, run: patch.run };
  patch = devGiveAll(s, 999); s = { ...s, run: patch.run };
  // BUG-05: also complete the Arcane Studies path trees so the dev jump
  // leaves every magic node unlocked (Light / Bend / Elemental / Sigilcraft
  // / Memory / Stoneword). Era 1 doesn't gate any studies but completing
  // here keeps the helper consistent across eras.
  patch = devCompleteAllStudies(s); s = { ...s, run: patch.run };
  return { run: s.run, msg: `🛠️ Full Era 1 unlocked (+ studies).` };
}

// ============== Era 2 / Era 3 helpers ==============

export function devJumpToEra2(state) {
  let s = { ...state, run: { ...state.run } };
  let patch = devJumpToEra1(s); s = { ...s, run: patch.run };
  const built = { ...(s.run.built || {}), firepit: { at: Date.now() } };
  const researched = {
    ...(s.run.researched || {}),
    foraging: { at: Date.now() },
    fire: { at: Date.now() },
    knapping: { at: Date.now() },
  };
  return { run: { ...s.run, built, researched }, msg: `🛠️ Jumped to Era 2.` };
}

export function devJumpToEra3(state) {
  let s = { ...state, run: { ...state.run } };
  let patch = devJumpToEra2(s); s = { ...s, run: patch.run };
  const built = {
    ...(s.run.built || {}),
    forge: { at: Date.now() },
    home: { at: Date.now() },
  };
  const researched = {
    ...(s.run.researched || {}),
    smithing: { at: Date.now() },
    fletching: { at: Date.now() },
    home: { at: Date.now() },
  };
  const toolsCrafted = {
    ...(s.run.toolsCrafted || {}),
    bow: { craftedAt: Date.now(), count: 1 },
  };
  return { run: { ...s.run, built, researched, toolsCrafted }, msg: `🛠️ Jumped to Era 3.` };
}

export function devUnlockAllEra2(state) {
  let s = { ...state, run: { ...state.run } };
  let patch = devJumpToEra2(s); s = { ...s, run: patch.run };
  patch = devLearnAllResearch(s); s = { ...s, run: patch.run };
  patch = devBuildAll(s); s = { ...s, run: patch.run };
  patch = devCraftAll(s); s = { ...s, run: patch.run };
  patch = devLevelAllSkills(s, 10); s = { ...s, run: patch.run };
  patch = devMaxStats(s); s = { ...s, run: patch.run };
  patch = devGiveAll(s, 999); s = { ...s, run: patch.run };
  // BUG-05: complete the Arcane Studies path trees too.
  patch = devCompleteAllStudies(s); s = { ...s, run: patch.run };
  return { run: s.run, msg: `🛠️ Full Era 2 unlocked (+ studies).` };
}

export function devUnlockAllEra3(state) {
  let s = { ...state, run: { ...state.run } };
  let patch = devJumpToEra3(s); s = { ...s, run: patch.run };
  patch = devLearnAllResearch(s); s = { ...s, run: patch.run };
  patch = devBuildAll(s); s = { ...s, run: patch.run };
  patch = devCraftAll(s); s = { ...s, run: patch.run };
  patch = devLevelAllSkills(s, 15); s = { ...s, run: patch.run };
  patch = devMaxStats(s); s = { ...s, run: patch.run };
  patch = devGiveAll(s, 999); s = { ...s, run: patch.run };
  // BUG-05: complete every Arcane Studies node so the magic system is
  // fully unlocked alongside the rest of Era 3.
  patch = devCompleteAllStudies(s); s = { ...s, run: patch.run };
  return { run: s.run, msg: `🛠️ Full Era 3 unlocked (+ studies).` };
}

export function devSetAlignment(state, side, value = 5) {
  const align = { good: 0, evil: 0, ...(state.run.alignment || {}) };
  if (side === "good") { align.good = value; align.evil = 0; }
  else if (side === "evil") { align.evil = value; align.good = 0; }
  else { align.good = 0; align.evil = 0; }
  return { run: { ...state.run, alignment: align }, msg: `🛠️ Alignment → ${side} ${value}.` };
}

export function devClearSpellCooldowns(state) {
  return { run: { ...state.run, spellCooldowns: {} }, msg: `🛠️ Spell cooldowns cleared.` };
}

export function devApplyStatus(state, statusId, durationSec = 5 * 60) {
  const statuses = { ...(state.run.statuses || {}) };
  if (durationSec <= 0) {
    delete statuses[statusId];
    return { run: { ...state.run, statuses }, msg: `🛠️ Status "${statusId}" cleared.` };
  }
  statuses[statusId] = { until: Date.now() + durationSec * 1000 };
  return { run: { ...state.run, statuses }, msg: `🛠️ Status "${statusId}" set for ${durationSec}s.` };
}

export function devForceThreat(state, threatId) {
  const result = resolveThreatById(state, threatId);
  if (!result) return { msg: `🛠️ Threat "${threatId}" not found.` };
  // Combat-class threats (#33) also return toolDurability — pick it up so
  // weapon wear lands. One-shot threats omit the field.
  const nextRun = {
    ...state.run,
    inventory: result.inventory,
    stats: result.stats,
  };
  if (result.toolDurability) nextRun.toolDurability = result.toolDurability;
  return {
    run: nextRun,
    events: result.events,
    msg: `🛠️ Forced threat "${threatId}".`,
  };
}

// ─── Arcane Studies + World Score + Dysentery dev helpers (Tasks #25-31, #29, #20) ──

import { getAllStudies, getStudy } from "../content/studies.js";

// Give a specific water tier. The Resources tab's "+999 of every resource"
// already covers all three water tiers, but having one-tap-per-tier is
// useful for testing the dysentery roll distribution.
export function devGiveWater(state, tier = "water_stagnant", qty = 10) {
  const inventory = {
    ...state.run.inventory,
    [tier]: (state.run.inventory?.[tier] || 0) + qty,
  };
  return { run: { ...state.run, inventory }, msg: `🛠️ +${qty} ${tier}.` };
}

// Studies require scroll + ink to START. Give a stack of each so testing
// is unblocked even without Era-2 research progress.
export function devGiveStudyMaterials(state, qty = 5) {
  const inventory = {
    ...state.run.inventory,
    scroll: (state.run.inventory?.scroll || 0) + qty,
    ink: (state.run.inventory?.ink || 0) + qty,
  };
  return { run: { ...state.run, inventory }, msg: `🛠️ +${qty} scroll, +${qty} ink.` };
}

// Build the Stone Altar (and its prereqs — Home built + altarWork
// researched) so testing the Arcane Studies arc doesn't require
// grinding through Era 2 first.
export function devBuildStoneAltar(state) {
  const built = {
    ...(state.run.built || {}),
    hut: state.run.built?.hut || { at: Date.now() },
    home: state.run.built?.home || { at: Date.now() },
    stoneAltar: { at: Date.now() },
  };
  const researched = {
    ...(state.run.researched || {}),
    home: state.run.researched?.home || { at: Date.now() },
    altarWork: { at: Date.now() },
  };
  return {
    run: { ...state.run, built, researched },
    msg: `🛠️ Stone Altar raised.`,
  };
}

// Set the World Score directly. Hidden meter — see ERA_PLAN.md "Arcane
// Studies → World Score" for thresholds. 100 fires the apex reveal.
export function devSetWorldScore(state, value = 0) {
  // Reset the revealed flag if dropping below threshold so re-discovery
  // works.
  const revealed = value >= 100 ? state.run.worldScoreRevealed : false;
  return {
    run: {
      ...state.run,
      worldScore: value,
      worldScoreAccum: 0,
      worldScoreRevealed: revealed,
    },
    msg: `🛠️ World Score → ${value}.`,
  };
}

// Mark every known study as completed. Applies the per-path deltas
// (sanity, alignment, world score) for each as the path stamp,
// approximately — uses straight sum without re-running tickStudies'
// internal apply. Useful for testing late-game spell loadouts.
export function devCompleteAllStudies(state) {
  const studies = getAllStudies();
  const completed = { ...(state.run.studiesCompleted || {}) };
  for (const s of studies) {
    if (!completed[s.id]) completed[s.id] = { completedAt: Date.now() };
  }
  return {
    run: {
      ...state.run,
      studiesCompleted: completed,
      studyProgress: {},
      activeStudyId: null,
    },
    msg: `🛠️ All ${studies.length} studies marked complete.`,
  };
}

// Complete just the currently active study, instantly. Useful for testing
// completion log + etching + delta + spell unlock without waiting.
export function devCompleteActiveStudy(state) {
  const activeId = state.run.activeStudyId;
  if (!activeId) return { msg: `🛠️ No active study to complete.` };
  const def = getStudy(activeId);
  if (!def) return { msg: `🛠️ Active study def missing.` };
  const studyProgress = { ...(state.run.studyProgress || {}) };
  delete studyProgress[activeId];
  const studiesCompleted = {
    ...(state.run.studiesCompleted || {}),
    [activeId]: { completedAt: Date.now() },
  };
  return {
    run: {
      ...state.run,
      studyProgress,
      studiesCompleted,
      activeStudyId: null,
    },
    msg: `🛠️ Completed "${def.name}". (Note: bypasses tickStudies' path-delta + etching wiring — apply those manually via State tab if you need them.)`,
  };
}

// Wipe all study progress + active study + completed studies. Lets you
// test the "first study" etching event again.
export function devResetStudies(state) {
  return {
    run: {
      ...state.run,
      studyProgress: {},
      activeStudyId: null,
      studiesCompleted: {},
      lastStudyTickAt: 0,
    },
    msg: `🛠️ All study state wiped.`,
  };
}

// ─── Combat Phase 1 — equipment dev helpers (Task #32) ───────────────

import { getAllWeapons } from "../content/weapons.js";
import {
  freshEquipped,
  performEquip,
  performUnequip,
} from "./equipment.js";

// Give one of every weapon (pure-weapon defs only — dual-use tools come
// from devCraftAll). Inventory + durability lookups stay consistent.
export function devGiveAllWeapons(state) {
  const inventory = { ...state.run.inventory };
  for (const w of getAllWeapons()) {
    inventory[w.id] = Math.max(1, inventory[w.id] || 0);
  }
  return { run: { ...state.run, inventory }, msg: `🛠️ +1 of every weapon.` };
}

// Give a specific weapon or tool, with quantity. Equipment helpers in the
// dev panel use this so testing can target a specific weapon.
export function devGiveItem(state, id, qty = 1) {
  const inventory = {
    ...state.run.inventory,
    [id]: (state.run.inventory?.[id] || 0) + qty,
  };
  return { run: { ...state.run, inventory }, msg: `🛠️ +${qty} ${id}.` };
}

// Equip an item to a specific slot (or auto-pick slot). Wraps the
// system function so we get a clean { run, msg } shape for devPatch.
export function devEquip(state, id, slot) {
  const result = performEquip(state, id, slot);
  return {
    run: result.run,
    events: result.events,
    msg: `🛠️ Equip "${id}" → ${slot || "auto"}.`,
  };
}

// Unequip a single slot. For "unequip all" use devUnequipAll below.
export function devUnequipSlot(state, slot) {
  const result = performUnequip(state, slot);
  return {
    run: result.run,
    events: result.events,
    msg: `🛠️ Unequip "${slot}".`,
  };
}

// Clear every slot at once (replaces equipped with a fresh empty shape).
// Doesn't touch inventory — items stay in your pack, just nothing wielded.
export function devUnequipAll(state) {
  return {
    run: { ...state.run, equipped: freshEquipped() },
    msg: `🛠️ All slots cleared.`,
  };
}

// Death-debuff dev helpers (#50). Apply the cascade directly, or set the
// magnitude to a specific value, or clear it. Useful for testing food
// recovery rates without grinding through a real combat death.
import { applyDeathDebuff, clearDeathDebuff } from "./death.js";

export function devApplyDeathDebuff(state) {
  const result = applyDeathDebuff(state.run);
  return {
    run: result.run,
    events: result.events,
    msg: `🛠️ Death-debuff cascade applied (mag=${result.run.statuses?.deathDebuff?.magnitude}).`,
  };
}

export function devSetDeathDebuffMagnitude(state, value) {
  const v = Math.max(0, Math.min(0.95, value));
  if (v <= 0) {
    const result = clearDeathDebuff(state.run, "dev");
    return { run: result.run, events: result.events, msg: `🛠️ Death-debuff cleared.` };
  }
  const cur = state.run.statuses?.deathDebuff;
  const statuses = {
    ...(state.run.statuses || {}),
    deathDebuff: {
      active: true,
      magnitude: v,
      startedAt: cur?.startedAt || Date.now(),
      lastDeathAt: cur?.lastDeathAt || Date.now(),
      deaths: cur?.deaths || 1,
    },
  };
  return {
    run: { ...state.run, statuses },
    msg: `🛠️ Death-debuff magnitude → ${v}.`,
  };
}

export function devClearDeathDebuff(state) {
  const result = clearDeathDebuff(state.run, "dev");
  return { run: result.run, events: result.events, msg: `🛠️ Death-debuff cleared.` };
}

// Apply dysentery (or clear it). See systems/disease.js.
export function devApplyDysentery(state, durationMin = 5) {
  if (durationMin <= 0) {
    const statuses = { ...(state.run.statuses || {}) };
    delete statuses.dysentery;
    return { run: { ...state.run, statuses }, msg: `🛠️ Dysentery cleared.` };
  }
  const now = Date.now();
  const statuses = {
    ...(state.run.statuses || {}),
    dysentery: {
      active: true,
      startedAt: now,
      expiresAt: now + durationMin * 60 * 1000,
    },
  };
  return {
    run: { ...state.run, statuses },
    msg: `🛠️ Dysentery applied for ${durationMin} min.`,
  };
}

// ─── Patrol / Combat-loop / Workers / Coins (#66–#72) ────────────────────
// These let you skip the grind on the entire idle-RPG loop: trigger a
// patrol fight directly, force a boss encounter, bump per-mob kill counts
// to test the reveal-threshold UI, set the town-workers echo, and stock
// up on each coin tier for trade-route testing.

import { getAllMobs, getMobsForEra, COIN_VALUE } from "../content/mobs.js";
import { performPatrol } from "./patrol.js";
import {
  setActiveLoop as systemSetActiveLoop,
  clearActiveLoop as systemClearActiveLoop,
} from "./loop.js";
import { computeEra } from "./era.js";

// Reset the patrol cooldown to 0 — next click fires immediately.
export function devClearPatrolCooldown(state) {
  return {
    run: { ...state.run, lastPatrolAt: 0 },
    msg: `🛠️ Patrol cooldown cleared.`,
  };
}

// Force-fire a patrol click. Bypasses cooldown via the clear above; if no
// target is given, performPatrol rolls the era table.
export function devTriggerPatrol(state, target = {}) {
  const cleared = { ...state, run: { ...state.run, lastPatrolAt: 0 } };
  const result = performPatrol(cleared, target);
  return {
    run: result.run,
    persistent: result.persistent,
    events: result.events,
    msg: `🛠️ Patrol fired${target.mobId ? ` (mob=${target.mobId})` : target.bossId ? ` (boss=${target.bossId})` : ""
      }.`,
  };
}

// Stamp a boss encounter directly — Shell will auto-open BossFightModal.
export function devForceBossEncounter(state, bossId) {
  return {
    run: { ...state.run, patrolBossEncounter: bossId },
    msg: `🛠️ Boss encounter staged: ${bossId}.`,
  };
}

// Clear a stuck boss encounter without resolving the fight.
export function devClearBossEncounter(state) {
  const run = { ...state.run };
  delete run.patrolBossEncounter;
  return { run, msg: `🛠️ Boss encounter cleared.` };
}

// Set the per-mob kill count (drives the reveal thresholds in PatrolView
// — hp at 1, damage at 3, accuracy at 5, dmgType at 10, drop names at 1,
// drop qty at 5, drop chance at 10). value=999 unlocks everything.
export function devSetMobsDefeated(state, mobId, value = 999) {
  const mobsDefeated = { ...(state.run.mobsDefeated || {}) };
  if (value <= 0) delete mobsDefeated[mobId];
  else mobsDefeated[mobId] = value;
  return {
    run: { ...state.run, mobsDefeated },
    msg: `🛠️ ${mobId} defeated → ${value}.`,
  };
}

// Wipe every per-mob kill — useful for testing the "first encounter"
// reveal-by-reveal UX from scratch.
export function devClearMobsDefeated(state) {
  return {
    run: { ...state.run, mobsDefeated: {} },
    msg: `🛠️ All mob kill counts wiped.`,
  };
}

// Max-out every mob's kill count → every stat + drop revealed everywhere.
export function devRevealAllMobs(state) {
  const mobsDefeated = { ...(state.run.mobsDefeated || {}) };
  for (const m of getAllMobs()) mobsDefeated[m.id] = 999;
  return {
    run: { ...state.run, mobsDefeated },
    msg: `🛠️ All mob info revealed (kills → 999).`,
  };
}

// Bump every mob to ~3 kills so most stats are revealed but the late
// drop-qty / drop-chance reveals are still hidden — good middle-ground
// for screenshotting the progressive-reveal UI.
export function devPartialRevealMobs(state) {
  const mobsDefeated = { ...(state.run.mobsDefeated || {}) };
  for (const m of getAllMobs()) mobsDefeated[m.id] = 3;
  return {
    run: { ...state.run, mobsDefeated },
    msg: `🛠️ All mobs → 3 kills (mid-reveal).`,
  };
}

// Wrap setActiveLoop / clearActiveLoop in the dev-patch shape.
export function devSetActiveLoop(state, kind, target) {
  const result = systemSetActiveLoop(state, kind, target);
  return {
    run: result.run,
    persistent: result.persistent,
    events: result.events,
    msg: `🛠️ Active loop → ${kind}${target?.mobId ? `:${target.mobId}` : target?.bossId ? `:boss:${target.bossId}` : ""
      }.`,
  };
}

export function devClearActiveLoop(state) {
  const result = systemClearActiveLoop(state);
  return {
    run: result.run,
    persistent: result.persistent,
    events: result.events,
    msg: `🛠️ Active loop cleared.`,
  };
}

// Wipe just the Pile of Goods accumulator (keeps the loop running but
// resets the visible drop tally).
export function devClearPile(state) {
  return {
    run: { ...state.run, activePile: { targetKey: null, drops: {} } },
    msg: `🛠️ Pile of goods emptied.`,
  };
}

// Set the townWorkers echo upgrade level (drives workers.js tick count).
// Persistent — survives prestige.
export function devSetTownWorkers(state, count = 0) {
  const echoUpgrades = {
    ...(state.persistent.echoUpgrades || {}),
    townWorkers: Math.max(0, count),
  };
  return {
    persistent: { ...state.persistent, echoUpgrades },
    // Reset the clock so the next tick starts a fresh cycle from now.
    run: { ...state.run, workersLastTickAt: 0 },
    msg: `🛠️ Town workers → ${count}.`,
  };
}

// Give a stack of one or all coin tiers. Trade routes (future) will spend
// these — until then they're just persistent loot.
export function devGiveCoins(state, tier = null, qty = 100) {
  const inv = { ...(state.run.inventory || {}) };
  if (tier && Object.prototype.hasOwnProperty.call(COIN_VALUE, tier)) {
    inv[tier] = (inv[tier] || 0) + qty;
    return { run: { ...state.run, inventory: inv }, msg: `🛠️ +${qty} ${tier}.` };
  }
  for (const t of Object.keys(COIN_VALUE)) inv[t] = (inv[t] || 0) + qty;
  return {
    run: { ...state.run, inventory: inv },
    msg: `🛠️ +${qty} of every coin tier.`,
  };
}
