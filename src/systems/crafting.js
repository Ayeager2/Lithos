// Crafting system. Reducer dispatches CRAFT_TOOL; this file owns the logic.

import { getTool, getAllTools, getToolDiscipline } from "../content/tools.js";
import { getAllWeapons } from "../content/weapons.js";
import { totalWater, spendWater } from "../content/resources.js";
import { getResourceCap } from "./storage.js";
import { getStudyPassives } from "./studies.js";
import { gainXp, getSkillState } from "./skills.js";
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
  for (const tool of [...getAllTools(), ...getAllWeapons()]) {
    if (!(inventory[tool.id] > 0)) continue;
    const dur = tool.durability;
    if (!dur || dur.wearsOn !== actionTag) continue;

    // Roll for the study-passive durability save.
    if (skipChance > 0 && Math.random() < skipChance) continue;

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

  // Stackable consumables (potions) can be crafted again to add to the
  // stack. Non-stackable tools (axe, bow, etc.) are unique items.
  if (!tool.isStackable && (state.run.inventory?.[toolId] || 0) > 0) {
    return { ok: false, reason: "You already have one." };
  }

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

// ─── Per-tier success curve (#113). Lower-tier recipes succeed cheaply;
// higher tiers demand investment. Discipline skill level lifts the
// floor. Tier 1 (primitive) starts at 70% with no skill, climbs to 95%
// at lvl 10. Tier 2 (stone/bronze) starts at 50%, climbs to 90%. Tier 3
// (arcane) starts at 25%, climbs to 80%. Tier 4+ (future iron+) is
// brutal: 15% base, asymptotic toward 70%.
const TIER_BASE_SUCCESS = { 1: 0.70, 2: 0.50, 3: 0.25, 4: 0.15 };

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
  // Each level adds 3% above the tier base, capped at the tier's ceiling.
  // Tier ceilings: t1 0.99, t2 0.95, t3 0.90, t4+ 0.80.
  const ceiling = tier === 1 ? 0.99 : tier === 2 ? 0.95 : tier === 3 ? 0.90 : 0.80;
  const lifted = base + level * 0.03;
  return Math.max(base, Math.min(ceiling, lifted));
}

export function performCraft(state, toolId, rng = Math.random) {
  const tool = getTool(toolId);
  if (!tool) {
    return { run: state.run, persistent: state.persistent, events: [{ kind: "craftFail", message: "Unknown tool." }] };
  }
  const check = canCraft(state, toolId);
  if (!check.ok) {
    return { run: state.run, persistent: state.persistent, events: [{ kind: "craftFail", message: check.reason }] };
  }

  // Roll for success (#113). Failure consumes 50% of each material
  // (rounded up — so the player still feels the sting) and produces
  // no tool. Still grants partial XP since you learned from the
  // attempt. Resource-producing recipes always succeed.
  const successChance = getCraftSuccessChance(state, toolId);
  const succeeded = rng() < successChance;

  let inventory = { ...state.run.inventory };
  const { level: craftLevel } = getSkillState(state.run, "crafting");
  const refundChance = succeeded ? Math.min(0.02 * craftLevel, 0.30) : 0;

  const refunds = [];
  for (const [res, qty] of Object.entries(tool.cost || {})) {
    // Failure consumes about half the materials (round up so the player
    // still feels it). Refund chance only applies on success.
    let actual = succeeded ? qty : Math.ceil(qty / 2);
    if (succeeded) {
      for (let i = 0; i < qty; i++) {
        if (refundChance > 0 && rng() < refundChance) {
          actual -= 1;
          refunds.push(res);
        }
      }
    }
    if (res === "water") {
      inventory = spendWater(inventory, actual);
    } else {
      inventory[res] = (inventory[res] || 0) - actual;
    }
  }

  const toolDurability = { ...(state.run.toolDurability || {}) };
  const toolsCrafted = { ...(state.run.toolsCrafted || {}) };

  if (succeeded) {
    // Resource-producing recipes (scrollCraft, inkCraft) increment a
    // *resource* in inventory; regular tool recipes still increment under
    // their tool id. Either way: clamp to baseCap.
    if (tool.producesResource) {
      const { id: outId, qty = 1 } = tool.producesResource;
      const cap = getResourceCap(state, outId);
      const have = inventory[outId] || 0;
      const room = cap === Infinity ? qty : Math.max(0, cap - have);
      inventory[outId] = have + Math.min(qty, room);
    } else {
      inventory[toolId] = (inventory[toolId] || 0) + 1;
    }

    if (
      !tool.producesResource &&
      tool.durability &&
      typeof tool.durability.max === "number"
    ) {
      toolDurability[toolId] = tool.durability.max;
    }

    const prevCount = toolsCrafted[toolId]?.count || 0;
    toolsCrafted[toolId] = { craftedAt: Date.now(), count: prevCount + 1 };
  }

  let run = { ...state.run, inventory, toolDurability, toolsCrafted };

  const events = [];
  if (succeeded) {
    events.push({ kind: "craft", message: tool.onCraftedMessage });
    if (refunds.length > 0) {
      events.push({
        kind: "craft",
        message: `🪡 Skilled hands — saved ${refunds.length} material${refunds.length !== 1 ? "s" : ""}.`,
      });
    }
  } else {
    // Flavored failure log. Mention the discipline so the player
    // understands which skill to grind for better odds.
    const discipline = getToolDiscipline(tool);
    events.push({
      kind: "craftFail",
      message: `❌ The ${tool.name} doesn't come together. Materials half-wasted. ${discipline.charAt(0).toUpperCase() + discipline.slice(1)} skill rises.`,
    });
  }

  // XP — legacy "crafting" still gets some (smaller on failure) so the
  // refund-chance bonus keeps working. The discipline skill gets the
  // bulk of XP. Failed attempts still grant partial XP — you learn
  // from breaking things.
  const baseXp = (tool.tier || 1) * 4;
  const successMult = succeeded ? 1 : 0.5;
  const discipline = getToolDiscipline(tool);

  const xpResultGeneric = gainXp(run, "crafting", Math.round(baseXp * 0.4 * successMult));
  run = { ...run, skills: xpResultGeneric.skills };
  events.push(...xpResultGeneric.events);

  const xpResultDisc = gainXp(run, discipline, Math.round(baseXp * successMult));
  run = { ...run, skills: xpResultDisc.skills };
  events.push(...xpResultDisc.events);

  if (survivalActive({ ...state, run })) {
    let stats = decayForAction(run.stats || {}, "Craft");
    if (succeeded) {
      stats = boostStats(stats, { happiness: +3, sanity: +1 });
    } else {
      // Failed crafts knock Resolve a little — frustration is real.
      stats = boostStats(stats, { happiness: -2 });
    }
    run = { ...run, stats };
  }

  return { run, persistent: state.persistent, events };
}

export function getVisibleTools(state) {
  return getAllTools().filter((t) => {
    if ((state.run.inventory?.[t.id] || 0) > 0) return true;
    const req = t.requires || {};
    if (req.researched && !state.run.researched?.[req.researched]) return false;
    return true;
  });
}
etResourceCap(state, outId);
      const have = inventory[outId] || 0;
      const room = cap === Infinity ? qty : Math.max(0, cap - have);
      inventory[outId] = have + Math.min(qty, room);
    } else {
      inventory[toolId] = (inventory[toolId] || 0) + 1;
    }

    if (
      !tool.producesResource &&
      tool.durability &&
      typeof tool.durability.max === "number"
    ) {
      toolDurability[toolId] = tool.durability.max;
    }

    const prevCount = toolsCrafted[toolId]?.count || 0;
    toolsCrafted[toolId] = { craftedAt: Date.now(), count: prevCount + 1 };
  }

  let run = { ...state.run, inventory, toolDurability, toolsCrafted };

  const events = [];
  if (succeeded) {
    events.push({ kind: "craft", message: tool.onCraftedMessage });
    if (refunds.length > 0) {
      events.push({
        kind: "craft",
        message: `🪡 Skilled hands — saved ${refunds.length} material${refunds.length !== 1 ? "s" : ""}.`,
      });
    }
  } else {
    const discipline = getToolDiscipline(tool);
    events.push({
      kind: "craftFail",
      message: `❌ The ${tool.name} doesn't come together. Materials half-wasted. ${discipline.charAt(0).toUpperCase() + discipline.slice(1)} skill rises.`,
    });
  }

  const baseXp = (tool.tier || 1) * 4;
  const successMult = succeeded ? 1 : 0.5;
  const discipline = getToolDiscipline(tool);

  const xpResultGeneric = gainXp(run, "crafting", Math.round(baseXp * 0.4 * successMult));
  run = { ...run, skills: xpResultGeneric.skills };
  events.push(...xpResultGeneric.events);

  const xpResultDisc = gainXp(run, discipline, Math.round(baseXp * successMult));
  run = { ...run, skills: xpResultDisc.skills };
  events.push(...xpResultDisc.events);

  if (survivalActive({ ...state, run })) {
    let stats = decayForAction(run.stats || {}, "Craft");
    if (succeeded) {
      stats = boostStats(stats, { happiness: +3, sanity: +1 });
    } else {
      stats = boostStats(stats, { happiness: -2 });
    }
    run = { ...run, stats };
  }

  return { run, persistent: state.persistent, events };
}

export function getVisibleTools(state) {
  return getAllTools().filter((t) => {
    if ((state.run.inventory?.[t.id] || 0) > 0) return true;
    const req = t.requires || {};
    if (req.researched && !state.run.researched?.[req.researched]) return false;
    return true;
  });
}
