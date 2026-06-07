// Research system — "the rock whispers a recipe; you spend resources to listen."

import { getResearch, getAllResearch } from "../content/research.js";
import { totalWater, spendWater } from "../content/resources.js";
import { decayForAction, survivalActive, boostStats } from "./survival.js";
import { computeEra } from "./era.js";
import { getSkillState } from "./skills.js";
import { getSkill } from "../content/skills.js";

export function canListen(state, researchId) {
  const r = getResearch(researchId);
  if (!r) return { ok: false, reason: "Unknown teaching." };

  if (state.run.researched?.[researchId]) {
    return { ok: false, reason: "Already learned." };
  }

  if (r.requires) {
    if (r.requires.hutBuilt && !state.run.built?.hut) {
      return { ok: false, reason: "The stone is silent without a roof above." };
    }
    if (r.requires.era && computeEra(state) < r.requires.era) {
      return { ok: false, reason: "The stone has not opened this teaching yet." };
    }
    if (r.requires.alignment) {
      const align = state.run.alignment || { good: 0, evil: 0 };
      if (r.requires.alignment.good && (align.good || 0) < r.requires.alignment.good) {
        return { ok: false, reason: "The stone has not opened this teaching yet." };
      }
      if (r.requires.alignment.evil && (align.evil || 0) < r.requires.alignment.evil) {
        return { ok: false, reason: "The stone has not opened this teaching yet." };
      }
    }
    // Skill-level requirement (#102). The rock can teach the recipe but
    // your hands must already know the work — research locks until the
    // matching skill hits the required level.
    if (r.requires.skillReq) {
      for (const [skillId, needed] of Object.entries(r.requires.skillReq)) {
        const { level } = getSkillState(state.run, skillId);
        if (level < needed) {
          const skillDef = getSkill(skillId);
          const skillName = skillDef?.name || skillId;
          return {
            ok: false,
            reason: `Need ${skillName} Lv ${needed} (you're Lv ${level}).`,
          };
        }
      }
    }
  }

  for (const [res, qty] of Object.entries(r.cost || {})) {
    if (res === "water") {
      if (totalWater(state.run.inventory) < qty) {
        return { ok: false, reason: "Not enough offerings." };
      }
      continue;
    }
    if ((state.run.inventory[res] || 0) < qty) {
      return { ok: false, reason: "Not enough offerings." };
    }
  }

  return { ok: true };
}

export function performListen(state, researchId) {
  const r = getResearch(researchId);
  if (!r) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "researchFail", message: "Unknown teaching." }],
    };
  }

  const check = canListen(state, researchId);
  if (!check.ok) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "researchFail", message: check.reason }],
    };
  }

  let inventory = { ...state.run.inventory };
  for (const [res, qty] of Object.entries(r.cost)) {
    if (res === "water") {
      inventory = spendWater(inventory, qty);
      continue;
    }
    inventory[res] = (inventory[res] || 0) - qty;
  }

  const researched = {
    ...(state.run.researched || {}),
    [researchId]: { at: Date.now() },
  };

  let run = { ...state.run, inventory, researched };
  const persistent = state.persistent;

  const events = [{ kind: "research", message: r.onLearnedMessage }];

  if (survivalActive({ ...state, run })) {
    run = { ...run, stats: decayForAction(run.stats || {}, "Research") };
    run = { ...run, stats: boostStats(run.stats, { happiness: +3, sanity: +3 }) };
  }

  return { run, persistent, events };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree-view visibility helpers. See BUGS.md #005.
//
//   getKnownResearch(state)
//     Everything the player should *see* in the Teachings tree. Era-gated
//     and prerequisite-locked nodes are included — they render as locked,
//     not hidden, so the player can plan ahead.
//
//     Alignment-gated nodes (good/evil-requiring) stay hidden until the
//     silent counter tips. Those are designed to *appear* on alignment —
//     part of the cosmic-horror surprise. Distinguish from "needs a
//     parent" or "needs an era" which are visible-but-locked.
//
//     The `hutBuilt` gate is also respected: before the hut, even the
//     Teachings modal can't be opened, so showing nothing here is
//     consistent with the rest of the UI.
//
//   getAvailableResearch(state)
//     Research the player can *act on right now* — canListen() returns ok.
//     Used for affordance counts and the notification badge on the
//     Teachings trigger (the Stone strip).
//
//   getVisibleResearch(state) — DEPRECATED back-compat alias.
//     Maps to getKnownResearch. Old callers (ResearchPanel.jsx — orphaned)
//     work but should migrate.
// ─────────────────────────────────────────────────────────────────────────────

export function getKnownResearch(state) {
  return getAllResearch().filter((r) => {
    if (state.run.researched?.[r.id]) return true;
    if (r.requires?.hutBuilt && !state.run.built?.hut) return false;
    // Alignment-gated nodes stay hidden. Era-gated and prereq-gated nodes
    // are *visible-as-locked* so the player can see the path ahead.
    if (r.requires?.alignment) {
      const align = state.run.alignment || { good: 0, evil: 0 };
      if (r.requires.alignment.good && (align.good || 0) < r.requires.alignment.good) {
        return false;
      }
      if (r.requires.alignment.evil && (align.evil || 0) < r.requires.alignment.evil) {
        return false;
      }
    }
    return true;
  });
}

export function getAvailableResearch(state) {
  return getKnownResearch(state).filter(
    (r) => !state.run.researched?.[r.id] && canListen(state, r.id).ok
  );
}

export function getVisibleResearch(state) {
  return getKnownResearch(state);
}

export function getResearchBonuses(run) {
  let gatherBonus = 0;
  for (const id of Object.keys(run.researched || {})) {
    const r = getResearch(id);
    if (r?.effect?.gatherBonus) gatherBonus += r.effect.gatherBonus;
  }
  return { gatherBonus };
}

export function isResourceUnlocked(run, resourceId) {
  for (const id of Object.keys(run.researched || {})) {
    const r = getResearch(id);
    if (r?.effect?.addsResource === resourceId) return true;
  }
  return false;
}
