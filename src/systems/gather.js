// Generic gather-node system (#97).
//
// Resolves any non-prey gather node by id: forage, mine, chop, fish,
// farm, husband. Hunting still routes through systems/hunting.js
// performHunt with the existing prey roster (which already has the same
// shape and a different XP routing for combat XP). Loop runner picks
// between performHunt and performGatherNode by inspecting the target.
//
// Pattern mirrors performTargetedHunt — opener flavor line, difficulty
// roll, drop table with butchering bonuses removed (gather skill XP is
// the only bonus per discipline). Returns the standard reducer-friendly
// shape: { run, persistent, events }.

import { getGatherNode } from "../content/gatherNodes.js";
import { gainXp, getSkillState } from "./skills.js";
import { clampToCap } from "./storage.js";
import { randInt } from "../util/rng.js";

const DEFAULT_CYCLE_MS = 6000;

export function getGatherNodeCycleMs(node) {
  return node?.cycleMs || DEFAULT_CYCLE_MS;
}

export function canGatherNode(state, nodeId) {
  const node = getGatherNode(nodeId);
  if (!node) return { ok: false, reason: "Unknown node." };
  return { ok: true };
}

function rollGatherDrops(node, inventory, rng) {
  const out = { ...inventory };
  const parts = [];
  for (const d of node.drops || []) {
    if (rng() >= (d.chance ?? 1)) continue;
    const baseQty = Array.isArray(d.qty)
      ? randInt(rng, d.qty[0], d.qty[1])
      : (d.qty || 1);
    const qty = Math.max(1, Math.floor(baseQty));
    out[d.resource] = (out[d.resource] || 0) + qty;
    parts.push(`+${qty} ${d.resource}`);
  }
  return { inventory: out, parts };
}

// Pull one flavor line from a pool. Defensive against missing keys.
function pickFlavor(node, key, rng) {
  const pool = node?.flavor?.[key];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

export function performGatherNode(state, opts = {}, now = Date.now(), rng = Math.random) {
  const nodeId = opts.nodeId;
  const node = getGatherNode(nodeId);
  if (!node) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "That gather node is gone." }],
    };
  }

  let run = {
    ...state.run,
    inventory: { ...state.run.inventory },
    gathered: { ...(state.run.gathered || {}) },
  };
  const events = [];

  // Opener line.
  const opener = pickFlavor(node, "opener", rng);
  if (opener) events.push({ kind: "gather", message: opener });

  // Difficulty roll. Skill level reduces effective difficulty slightly.
  const { level } = getSkillState(run, node.skill);
  const skillEase = Math.min(0.25, level * 0.01); // up to -25% difficulty at lvl 25
  const effDifficulty = Math.max(0, (node.difficulty || 0) - skillEase);

  if (rng() < effDifficulty) {
    const failLine = pickFlavor(node, "fail", rng) || `${node.icon} Nothing this time.`;
    events.push({ kind: "gather", message: failLine });
    // Half XP on fail — practice is practice.
    const xpRes = gainXp(run, node.skill, Math.max(1, Math.floor((node.xp || 1) / 2)));
    run = { ...run, skills: xpRes.skills };
    events.push(...xpRes.events);
    return { run, persistent: state.persistent, events };
  }

  // Success — roll drops, append to inventory + lifetime gathered.
  const { inventory, parts } = rollGatherDrops(node, run.inventory, rng);
  for (const [resId, qty] of Object.entries(inventory)) {
    const before = state.run.inventory[resId] || 0;
    if (qty > before) {
      run.gathered[resId] = (run.gathered[resId] || 0) + (qty - before);
    }
  }
  run.inventory = inventory;

  const successLine = pickFlavor(node, "success", rng) || `${node.icon} Took what it offered.`;
  events.push({ kind: "gather", message: successLine });
  if (parts.length > 0) {
    events.push({ kind: "resource", message: `🎒 ${parts.join(", ")}` });
  }

  // Full XP on success.
  const xpRes = gainXp(run, node.skill, node.xp || 1);
  run = { ...run, skills: xpRes.skills };
  events.push(...xpRes.events);

  // Inventory clamp.
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

  return { run, persistent: state.persistent, events };
}
