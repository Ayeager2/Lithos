// Crafting system. Reducer dispatches CRAFT_TOOL; this file owns the logic.

import { getTool, getAllTools, getToolDiscipline } from "../content/tools.js";
import { getAllWeapons } from "../content/weapons.js";
import { totalWater, spendWater } from "../content/resources.js";
import { getResourceCap } from "./storage.js";
import { getStudyPassives } from "./studies.js";
import { gainXp, getSkillState } from "./skills.js";
import { RESOURCES } from "../content/resources.js";
import {
  decayForAction,
  survivalActive,
  boostStats,
} from "./survival.js";

export function applyToolWear(run, actionTag) {
  const inventory = { ...(run.inventory || {}) };
  const toolDurability = { ...(run.toolDurability || {}) };
  const events = [];
  let changed = false;

  // Study passives soften wear — Stone Mend (Elemental) 25%, Binding Mark
  // (Sigilcraft) 50%. They stack additively up to a cap of 90% reduction
  // (tools can never become fully unbreakable through studies alone).
  const passives = getStudyPassives(run);
  const wearReduction = Math.min(0.9, passives.toolDurabilityBonus || 0);
  // Convert wear reduction to a chance to SKIP this wear tick — gives a
  // smooth probabilistic feel rather than fractional durability.
  const skipChance = wearReduction;

  // Iterate both tools AND pure weapons so combat wear works on either.
  // Weapons share the same durability shape (`durability: { max, wearsOn }`)
  // and live in the same run.toolDurability keyed by item id. See
  // content/weapons.js + systems/equipment.js for the Combat Phase 1
  // foundation; Combat Phase 2 (#33) ticks combat wear here.
  const weaponImbues = run.weaponImbues || {};
  for (const tool of [...getAllTools(), ...getAllWeapons()]) {
    if (!(inventory[tool.id] > 0)) continue;
    const dur = tool.durability;
    if (!dur || dur.wearsOn !== actionTag) continue;

    // Rune imbue (#132) — Stoneword rune adds a durability-save chance
    // on top of the study-passive skip.
    let toolSkipChance = skipChance;
    const imbueMap = weaponImbues[tool.id];
    if (imbueMap) {
      for (const runeId of Object.keys(imbueMap)) {
        const save = RESOURCES[runeId]?.imbueEffect?.durabilitySaveChance || 0;
        toolSkipChance = Math.min(0.95, toolSkipChance + save);
      }
    }

    // Roll for the combined skip save.
    if (toolSkipChance > 0 && Math.random() < toolSkipChance) continue;

    const current = toolDurability[tool.id];
    const seeded = typeof current === "number" ? current : dur.max;
    const next = seeded - 1;

    if (next <= 0) {
      inventory[tool.id] = (inventory[tool.id] || 0) - 1;
      if (inventory[tool.id] <= 0) delete inventory[tool.id];
      delete toolDurability[tool.id];
      events.push({
        kind: "craftFail",
        message: tool.onBrokenMessage || `Your ${tool.name} broke.`,
      });
      changed = true;
    } else {
      toolDurability[tool.id] = next;
      changed = true;
    }
  }

  if (!changed) return { run, events: [] };
  return { run: { ...run, inventory, toolDurability }, events };
}

export function canCraft(state, toolId) {
  const tool = getTool(toolId);
  if (!tool) return { ok: false, reason: "Unknown tool." };

  // #123: players can craft as many of anything as they want. Even
  // non-stackable tools — they break, players want spares. The block
  // that said "you already have one" was paternalistic; the cost is
  // the gate, not an owned-count check.

  // Resource-producing recipes (scrollCraft, inkCraft, etc.) — block when
  // the output resource is already at its baseCap, so the craft doesn't
  // silently lose the produced unit. See content/tools.js producesResource.
  if (tool.producesResource) {
    const { id: outId } = tool.producesResource;
    const cap = getResourceCap(state, outId);
    const have = state.run.inventory?.[outId] || 0;
    if (cap !== Infinity && have >= cap) {
      return { ok: false, reason: "No room to store more." };
    }
  }

  const req = tool.requires || {};
  if (req.researched && !state.run.researched?.[req.researched]) {
    return { ok: false, reason: "You haven't listened for the way of it yet." };
  }
  if (req.toolOwned && !(state.run.inventory?.[req.toolOwned] > 0)) {
    return { ok: false, reason: "You need another tool first." };
  }
  if (req.builtBuilding && !state.run.built?.[req.builtBuilding]) {
    return { ok: false, reason: "You need to build the right place first." };
  }
  if (req.skill) {
    for (const [skillId, minLevel] of Object.entries(req.skill)) {
      const { level } = getSkillState(state.run, skillId);
      if (level < minLevel) {
        return { ok: false, reason: `Your hands aren't ready (skill needs lvl ${minLevel}).` };
      }
    }
  }
  // Path-tree study prerequisite (#114). Arcane weapons that tie back
  // to a specific path can require its first node.
  if (req.studied && !state.run.studies?.[req.studied]?.completed) {
    return { ok: false, reason: "The study isn't done yet — the way isn't in your hands." };
  }
  // Alignment gate (#114). Voidcaller and other apex-evil items need
  // the player to have walked the path.
  if (req.alignment) {
    const a = state.run.alignment || {};
    for (const [key, minVal] of Object.entries(req.alignment)) {
      if ((a[key] || 0) < minVal) {
        return { ok: false, reason: `The world hasn't bent enough toward this yet.` };
      }
    }
  }

  for (const [res, qty] of Object.entries(tool.cost || {})) {
    if (res === "water") {
      if (totalWater(state.run.inventory) < qty) {
        return { ok: false, reason: "Not enough materials." };
      }
      continue;
    }
    if ((state.run.inventory?.[res] || 0) < qty) {
      return { ok: false, reason: "Not enough materials." };
    }
  }
  return { ok: true };
}

// ─── Per-tier success curve (#113 → #127). User explicitly wants the
// early game to feel like a struggle: every recipe starts at 25% (or
// less) at lvl 0, and only the relevant-discipline skill lifts it.
// Tier ladder:
//   Tier 1 (primitive) — 25% base, climbs to 95% at lvl 20
//   Tier 2 (stone/bronze) — 20% base, climbs to 90%
//   Tier 3 (arcane) — 12% base, climbs to 80%
//   Tier 4+ (iron+) — 8% base, asymptotic toward 70%
// Each discipline-skill level adds 4% (sharper curve than the old 3%)
// so investment feels rewarded.
const TIER_BASE_SUCCESS = { 1: 0.25, 2: 0.20, 3: 0.12, 4: 0.08 };

// ─── Per-tier base durations (#130). Idle-RPG core: every craft takes
// time. Skill discount: each discipline-skill level shaves 1% off
// duration (cap 30% at lvl 20) — same curve as cost. Resource-producing
// recipes (scrolls/inks) keep their fast 2s craft so the player can
// still spam mid-study.
const TIER_BASE_DURATION_MS = { 1: 5_000, 2: 15_000, 3: 60_000, 4: 180_000 };

export function getCraftDuration(state, toolId) {
  const tool = getTool(toolId);
  if (!tool) return 5000;
  if (tool.producesResource) return 2_000;
  const tier = tool.tier || 1;
  const base = TIER_BASE_DURATION_MS[tier] ?? 30_000;
  const discipline = getToolDiscipline(tool);
  const { level } = getSkillState(state.run, discipline);
  const mult = Math.max(0.70, 1 - level * 0.01);
  return Math.round(base * mult);
}

// ─── Active-craft accessors. Surface the current job's id + progress
// to the UI without exposing the raw state shape.
export function getActiveCraft(run) {
  return run?.activeCraft || null;
}

export function getActiveCraftProgress(run) {
  const ac = getActiveCraft(run);
  if (!ac) return 0;
  const elapsed = Date.now() - ac.startedAt;
  return Math.max(0, Math.min(1, elapsed / ac.durationMs));
}

export function getCraftSuccessChance(state, toolId) {
  const tool = getTool(toolId);
  if (!tool) return 1;
  // Resource-producing recipes (scroll/ink) can't fail — they're not
  // skill-gated artistry, they're production. Keep the existing UX.
  if (tool.producesResource) return 1;
  const tier = tool.tier || 1;
  const base = TIER_BASE_SUCCESS[tier] ?? 0.40;
  const discipline = getToolDiscipline(tool);
  const { level } = getSkillState(state.run, discipline);
  // Each level adds 4% above the tier base, capped at the tier's
  // ceiling (#127). Tier ceilings: t1 0.95, t2 0.90, t3 0.80, t4+ 0.70.
  const ceiling = tier === 1 ? 0.95 : tier === 2 ? 0.90 : tier === 3 ? 0.80 : 0.70;
  const lifted = base + level * 0.04;
  return Math.max(base, Math.min(ceiling, lifted));
}

// Legacy synchronous craft — kept as a no-op stub that just dispatches
// the timed start. (Some tests still reach for performCraft directly.)
export function performCraft(state, toolId, rng = Math.random) {
  return startCraft(state, toolId, rng);
}

// ─── Timed crafting (#130) — idle-RPG core. #143 — qty=0 sentinel means
// "loop indefinitely until materials run out or the player swaps/stops".
// Default behavior is now continuous-loop, matching the patrol/gather/hunt
// auto-loop pattern. A finite qty (>=1) is still honored for tests and
// future bounded-queue use.
export function startCraft(state, toolId, rng = Math.random, qty = 0) {
  const tool = getTool(toolId);
  if (!tool) {
    return { run: state.run, persistent: state.persistent,
      events: [{ kind: "craftFail", message: "Unknown tool." }] };
  }
  // #143 — swap: clicking Start on a different recipe while one is
  // already running cancels the current job (materials lost, same as
  // explicit cancel) and immediately begins the new one. Clicking Start
  // on the SAME recipe is a no-op.
  if (state.run.activeCraft) {
    if (state.run.activeCraft.toolId === toolId) {
      return { run: state.run, persistent: state.persistent, events: [] };
    }
    const cancel = cancelActiveCraft(state);
    state = { ...state, run: cancel.run };
  }
  const check = canCraft(state, toolId);
  if (!check.ok) {
    return { run: state.run, persistent: state.persistent,
      events: [{ kind: "craftFail", message: check.reason }] };
  }

  let inventory = { ...state.run.inventory };
  const { level: craftLevel } = getSkillState(state.run, "crafting");
  const refundChance = Math.min(0.02 * craftLevel, 0.30);
  const _discipline = getToolDiscipline(tool);
  const { level: _discLevel } = getSkillState(state.run, _discipline);
  const costMult = Math.max(0.70, 1 - _discLevel * 0.01);

  const refunds = [];
  for (const [res, qty] of Object.entries(tool.cost || {})) {
    const discounted = Math.max(1, Math.ceil(qty * costMult));
    let actual = discounted;
    for (let i = 0; i < discounted; i++) {
      if (refundChance > 0 && rng() < refundChance) {
        actual -= 1;
        refunds.push(res);
      }
    }
    if (res === "water") inventory = spendWater(inventory, actual);
    else inventory[res] = (inventory[res] || 0) - actual;
  }

  const durationMs = getCraftDuration(state, toolId);
  // queuedQty == 0 → continuous loop (#143). Otherwise a bounded queue
  // counting down via completedQty.
  const queuedQty = qty <= 0 ? 0 : Math.max(1, Math.floor(qty));
  const activeCraft = {
    toolId,
    startedAt: Date.now(),
    durationMs,
    queuedQty,
    completedQty: 0,
  };
  const run = { ...state.run, inventory, activeCraft };
  const qtyLabel = queuedQty === 0 ? " (looping)" : (queuedQty > 1 ? ` ×${queuedQty}` : "");
  const events = [{
    kind: "craft",
    message: `🛠️ ${tool.icon || ""} Crafting ${tool.name}${qtyLabel}… (${Math.round(durationMs / 1000)}s each)`,
  }];
  if (refunds.length > 0) {
    events.push({ kind: "craft", message: `🪡 Saved ${refunds.length} material${refunds.length !== 1 ? "s" : ""}.` });
  }
  return { run, persistent: state.persistent, events };
}

export function cancelActiveCraft(state) {
  if (!state.run.activeCraft) return { run: state.run, persistent: state.persistent, events: [] };
  const run = { ...state.run, activeCraft: null };
  return { run, persistent: state.persistent,
    events: [{ kind: "craft", message: "🛠️ Craft cancelled. Materials lost." }] };
}

export function tickActiveCraft(state, rng = Math.random) {
  const ac = state.run.activeCraft;
  if (!ac) return { run: state.run, persistent: state.persistent, events: [] };
  const elapsed = Date.now() - ac.startedAt;
  if (elapsed < ac.durationMs) {
    return { run: state.run, persistent: state.persistent, events: [] };
  }

  const tool = getTool(ac.toolId);
  if (!tool) {
    return { run: { ...state.run, activeCraft: null }, persistent: state.persistent, events: [] };
  }
  const successChance = getCraftSuccessChance(state, ac.toolId);
  const succeeded = rng() < successChance;

  let run = { ...state.run, activeCraft: null };
  const events = [];

  if (succeeded) {
    let inventory = { ...run.inventory };
    const toolDurability = { ...(run.toolDurability || {}) };
    const toolsCrafted = { ...(run.toolsCrafted || {}) };
    if (tool.producesResource) {
      const { id: outId, qty = 1 } = tool.producesResource;
      const cap = getResourceCap({ run, persistent: state.persistent }, outId);
      const have = inventory[outId] || 0;
      const room = cap === Infinity ? qty : Math.max(0, cap - have);
      inventory[outId] = have + Math.min(qty, room);
    } else {
      inventory[ac.toolId] = (inventory[ac.toolId] || 0) + 1;
    }
    if (!tool.producesResource && tool.durability && typeof tool.durability.max === "number") {
      toolDurability[ac.toolId] = tool.durability.max;
    }
    const prevCount = toolsCrafted[ac.toolId]?.count || 0;
    toolsCrafted[ac.toolId] = { craftedAt: Date.now(), count: prevCount + 1 };
    run = { ...run, inventory, toolDurability, toolsCrafted };
    events.push({ kind: "craft", message: tool.onCraftedMessage || `🛠️ Crafted ${tool.name}.` });
  } else {
    const discipline = getToolDiscipline(tool);
    events.push({
      kind: "craftFail",
      message: `❌ The ${tool.name} doesn't come together. ${discipline.charAt(0).toUpperCase() + discipline.slice(1)} skill rises.`,
    });
  }

  const baseXp = (tool.tier || 1) * 4;
  const successMult = succeeded ? 1 : 0.5;
  const discipline = getToolDiscipline(tool);
  const genXp = gainXp(run, "crafting", Math.round(baseXp * 0.4 * successMult));
  run = { ...run, skills: genXp.skills };
  events.push(...genXp.events);
  const discXp = gainXp(run, discipline, Math.round(baseXp * successMult));
  run = { ...run, skills: discXp.skills };
  events.push(...discXp.events);

  // #36 / #131 — iron-tier crafts (or the iron smelt recipe itself)
  // also grant Smithing XP. Smithing is the side-skill that scales
  // iron-tier efficiency.
  if (tool.category === "iron" || tool.id === "smeltIron") {
    const smithXp = gainXp(run, "smithing", Math.round(baseXp * 0.5 * successMult));
    run = { ...run, skills: smithXp.skills };
    events.push(...smithXp.events);
  }

  // #143 — multi-craft / loop continuation. queuedQty === 0 means loop
  // indefinitely; otherwise keep going until completedQty hits queuedQty.
  const nextCompleted = (ac.completedQty || 0) + 1;
  const queued = ac.queuedQty;
  const wantsMore = queued === 0 || nextCompleted < queued;
  if (wantsMore) {
    const nextState = { ...state, run };
    const nextCheck = canCraft(nextState, ac.toolId);
    if (nextCheck.ok) {
      const restart = startCraft(nextState, ac.toolId, rng, queued - nextCompleted);
      if (restart.run.activeCraft) {
        const ac2 = { ...restart.run.activeCraft, completedQty: nextCompleted };
        run = { ...restart.run, activeCraft: ac2 };
        events.push(...restart.events.filter((e) => !e.message?.startsWith("🛠️ ")));
      }
    } else {
      events.push({ kind: "craftFail", message: `🛠️ Loop stopped — not enough materials for the next ${tool.name}.` });
    }
  }

  return { run, persistent: state.persistent, events };
}

// Filter the full tool list down to what CraftingView should render:
// anything the player already owns (so spare counts stay visible) or
// anything whose research gate is satisfied.
export function getVisibleTools(state) {
  return getAllTools().filter((t) => {
    if ((state.run.inventory?.[t.id] || 0) > 0) return true;
    const req = t.requires || {};
    if (req.researched && !state.run.researched?.[req.researched]) return false;
    return true;
  });
}
