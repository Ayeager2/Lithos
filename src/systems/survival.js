// Survival system. Pure functions for stat decay, action effects, and gating.

import { SURVIVAL } from "../content/survival.js";
import { getResearch } from "../content/research.js";
import {
  getResourcesByCategory,
  getResource,
  totalWater,
  spendWater,
  WATER_TIERS,
} from "../content/resources.js";
import { getBuilding as getBuildingDef } from "../content/buildings.js";
import {
  rollDysentery,
  shortenDysentery,
  isSick,
  getDiseaseDecayMultiplier,
  getDiseaseYieldMultiplier,
} from "./disease.js";
import { reduceDeathDebuff } from "./death.js";

export function survivalActive(state) {
  return !!state.run.built?.hut;
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// `runForDisease` is optional — pass the run if you want disease decay
// multipliers applied. Callers that don't have the run (legacy paths) get
// the old unmultiplied behavior.
export function decayForAction(stats, kind, runForDisease) {
  const key = `per${kind}`;
  const decay = SURVIVAL[key];
  if (!decay) return stats;

  let extraHappiness = 0;
  if ((stats.hunger ?? 0) >= SURVIVAL.penalties.hungerHigh) {
    extraHappiness += SURVIVAL.happinessPenalties.perRedHunger;
  }
  if ((stats.thirst ?? 0) >= SURVIVAL.penalties.thirstHigh) {
    extraHappiness += SURVIVAL.happinessPenalties.perRedThirst;
  }
  if ((stats.energy ?? 100) <= SURVIVAL.penalties.energyLow) {
    extraHappiness += SURVIVAL.happinessPenalties.perLowEnergy;
  }

  // Dysentery doubles hunger/thirst drain — multiply only the *positive*
  // delta (the drain), not negative-effect "decay" entries that boost.
  const dis = runForDisease ? getDiseaseDecayMultiplier(runForDisease) : { hunger: 1, thirst: 1 };
  const hungerDelta = (decay.hunger || 0) > 0 ? (decay.hunger || 0) * dis.hunger : (decay.hunger || 0);
  const thirstDelta = (decay.thirst || 0) > 0 ? (decay.thirst || 0) * dis.thirst : (decay.thirst || 0);

  return {
    hunger: clamp((stats.hunger ?? 0) + hungerDelta, 0, 100),
    thirst: clamp((stats.thirst ?? 0) + thirstDelta, 0, 100),
    energy: clamp((stats.energy ?? 100) + (decay.energy || 0), 0, 100),
    hp: clamp((stats.hp ?? 100) + (decay.hp || 0), 0, 100),
    happiness: clamp(
      (stats.happiness ?? 50) + (decay.happiness || 0) + extraHappiness,
      0,
      100
    ),
    sanity: clamp((stats.sanity ?? 50) + (decay.sanity || 0), 0, 100),
    spirit: clamp((stats.spirit ?? 50) + (decay.spirit || 0), 0, 100),
  };
}

// `runForDisease` optional — apply disease yield penalty if passed.
export function getYieldMultiplier(stats, runForDisease) {
  if (!stats) return 1.0;
  let mult = 1.0;
  if (stats.hunger >= SURVIVAL.penalties.hungerHigh) {
    mult *= SURVIVAL.yieldMultipliers.hungerHigh;
  }
  if (stats.thirst >= SURVIVAL.penalties.thirstHigh) {
    mult *= SURVIVAL.yieldMultipliers.thirstHigh;
  }
  if (stats.energy <= SURVIVAL.penalties.energyLow) {
    mult *= SURVIVAL.yieldMultipliers.energyLow;
  }
  if (runForDisease) mult *= getDiseaseYieldMultiplier(runForDisease);
  return mult;
}

export function canGather(state) {
  if (!survivalActive(state)) return { ok: true };
  const stats = state.run.stats || {};
  if ((stats.energy ?? 100) <= SURVIVAL.penalties.energyZero) {
    return { ok: false, reason: "Too exhausted. Rest first." };
  }
  return { ok: true };
}

export function applyEffect(stats, effect) {
  return {
    hunger: clamp((stats.hunger ?? 0) + (effect.hunger || 0), 0, 100),
    thirst: clamp((stats.thirst ?? 0) + (effect.thirst || 0), 0, 100),
    energy: clamp((stats.energy ?? 100) + (effect.energy || 0), 0, 100),
    hp: clamp((stats.hp ?? 100) + (effect.hp || 0), 0, 100),
    happiness: clamp((stats.happiness ?? 50) + (effect.happiness || 0), 0, 100),
    sanity: clamp((stats.sanity ?? 50) + (effect.sanity || 0), 0, 100),
    spirit: clamp((stats.spirit ?? 50) + (effect.spirit || 0), 0, 100),
  };
}

function getHealBonus(state) {
  let bonus = 0;
  for (const id of Object.keys(state.run.researched || {})) {
    const r = getResearch(id);
    if (r?.effect?.healBonus) bonus += r.effect.healBonus;
  }
  return bonus;
}

function getCookingBonus(state) {
  let bonus = 0;
  for (const id of Object.keys(state.run.researched || {})) {
    const r = getResearch(id);
    if (r?.effect?.cookingBonus) bonus += r.effect.cookingBonus;
  }
  return bonus;
}

function pickFoodToConsume(state, category, preferredId) {
  const inventory = state.run.inventory || {};
  if (preferredId) {
    const candidates = getResourcesByCategory(category).filter(
      (r) => r.id === preferredId && (inventory[r.id] || 0) > 0
    );
    if (candidates.length > 0) return candidates[0];
  }
  const candidates = getResourcesByCategory(category)
    .filter((r) => (inventory[r.id] || 0) > 0)
    .sort((a, b) => (a.nutrition || 0) - (b.nutrition || 0));
  return candidates[0] || null;
}

export function canPerformSurvivalAction(state, actionId) {
  if (!survivalActive(state)) {
    return { ok: false, reason: "No needs yet." };
  }
  const def = SURVIVAL.actions[actionId];
  if (!def) return { ok: false, reason: "Unknown action." };

  if (def.requires?.researched && !state.run.researched?.[def.requires.researched]) {
    return { ok: false, reason: "Not yet known." };
  }

  if (def.consumesCategory) {
    const food = pickFoodToConsume(state, def.consumesCategory);
    if (!food) {
      return { ok: false, reason: def.missingMessage || "Missing resources." };
    }
  }

  for (const [res, qty] of Object.entries(def.cost || {})) {
    if (res === "water") {
      if (totalWater(state.run.inventory) < qty) {
        return { ok: false, reason: def.missingMessage || "Missing resources." };
      }
      continue;
    }
    if ((state.run.inventory[res] || 0) < qty) {
      return { ok: false, reason: def.missingMessage || "Missing resources." };
    }
  }
  return { ok: true };
}

export function performSurvivalAction(state, actionId, opts = {}) {
  const def = SURVIVAL.actions[actionId];
  if (!def) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "Unknown action." }],
    };
  }

  const check = canPerformSurvivalAction(state, actionId);
  if (!check.ok) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: check.reason }],
    };
  }

  let inventory = { ...state.run.inventory };
  for (const [res, qty] of Object.entries(def.cost || {})) {
    if (res === "water") {
      inventory = spendWater(inventory, qty);
      continue;
    }
    inventory[res] = (inventory[res] || 0) - qty;
  }

  let effect = def.effect ? { ...def.effect } : { ...(def.baseEffect || {}) };
  let message = def.message;
  // Track the food consumed this action — used below for the death-debuff
  // recovery hook (Task #50). null when the action didn't consume food.
  let consumedFood = null;
  if (def.consumesCategory) {
    const food = pickFoodToConsume(state, def.consumesCategory, opts.preferredFoodId);
    if (food) {
      consumedFood = food;
      inventory[food.id] = (inventory[food.id] || 0) - 1;
      const cookingBonus = getCookingBonus(state);
      const nutrition = (food.nutrition || 10) + cookingBonus;
      effect = { ...effect, hunger: -nutrition };
      message = (message || "")
        .replace("{icon}", food.icon || "")
        .replace("{name}", food.name?.toLowerCase() || "food");
    }
  }
  if (def.bonusFromBuilding) {
    for (const [bid, bonus] of Object.entries(def.bonusFromBuilding)) {
      if (state.run.built?.[bid]) {
        for (const k of Object.keys(bonus)) {
          effect[k] = (effect[k] || 0) + bonus[k];
        }
        if (bid === "firepit" && def.messageWithFirepit) {
          message = def.messageWithFirepit;
        }
      }
    }
  }
  if (actionId === "rest") {
    // #153 — shelter-tier rest scaling. Resting with no shelter at all
    // (no hut, no home, no anything that contributes restBonus) is
    // worse than nothing: the player gets ~half the energy and loses a
    // tick of Sanity to the cold. Resting under a hut is baseline. The
    // restBonus loop below stacks anything better on top.
    let anyShelter = false;
    for (const bid of Object.keys(state.run.built || {})) {
      const b = getBuildingDef(bid);
      if (b?.effect?.restBonus) {
        anyShelter = true;
        for (const k of Object.keys(b.effect.restBonus)) {
          effect[k] = (effect[k] || 0) + b.effect.restBonus[k];
        }
        if (bid === "home" && def.messageWithHome) {
          message = def.messageWithHome;
        }
      }
    }
    // Hut alone counts as shelter even if it doesn't carry a restBonus.
    if (!anyShelter && state.run.built?.hut) anyShelter = true;
    if (!anyShelter) {
      // Halve the energy gain, take a small Sanity hit.
      if (effect.energy && effect.energy > 0) effect.energy = Math.floor(effect.energy / 2);
      effect.sanity = (effect.sanity || 0) - 2;
      message = "You curl up against the dust. Cold finds you in your sleep. The rest is shallow.";
    }
  }
  if (effect.hp && effect.hp > 0) {
    const heal = getHealBonus(state);
    if (heal > 0) effect.hp += heal;
  }

  const stats = applyEffect(state.run.stats || SURVIVAL.startValues, effect);

  let run = { ...state.run, inventory, stats };
  const events = [{ kind: def.logKind || "consume", message }];

  // ─── Death-debuff recovery (#50) ────────────────────────────────────
  // Every food consumed in an eat action shaves the active death-debuff
  // magnitude. Foods carry their own `deathDebuffRecovery` rate — grubs
  // are the trace; bird meat is the real protein recovery. See
  // systems/death.js + content/resources.js.
  if (consumedFood && consumedFood.deathDebuffRecovery) {
    const r = reduceDeathDebuff(run, consumedFood.deathDebuffRecovery);
    run = r.run;
    events.push(...r.events);
  }

  return {
    run,
    persistent: state.persistent,
    events,
  };
}

export function boostStats(stats, change) {
  return applyEffect(stats || SURVIVAL.startValues, change);
}

export function initialStats() {
  return { ...SURVIVAL.startValues };
}

// ─── Tiered drink — replaces the old single-water drink action ─────────────
//
// Behavior:
//   • If `waterType` is given and present in inventory: drink that tier.
//   • Else: drink the best (highest-tier) water the player has — same
//     auto-pick logic DrinkButton uses for its main click.
//   • Apply that resource's `thirstRelief` (as a negative thirst delta).
//   • Roll dysentery against the resource's `dysenteryChance`.
//   • Drinking BOILED while already sick shortens dysentery by 60s. The
//     spec calls this out as a recovery accelerator.
//
// Returns the standard { run, persistent, events } shape that the reducer
// expects.

const DRINK_SHORTENS_MS = 60 * 1000; // 1 min off dysentery per boiled drink

function pickBestAvailableWater(inventory) {
  // WATER_TIERS is worst → best. Pick the highest-index tier with stock.
  for (let i = WATER_TIERS.length - 1; i >= 0; i--) {
    const id = WATER_TIERS[i];
    if ((inventory?.[id] || 0) > 0) return id;
  }
  return null;
}

export function performDrink(state, waterType, rng = Math.random) {
  if (!survivalActive(state)) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "No needs yet." }],
    };
  }

  const inv = state.run.inventory || {};
  let chosen = waterType && (inv[waterType] || 0) > 0 ? waterType : null;
  if (!chosen) chosen = pickBestAvailableWater(inv);
  if (!chosen) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "No water to drink." }],
    };
  }

  const resource = getResource(chosen);
  if (!resource) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "Unknown water." }],
    };
  }

  let inventory = { ...inv };
  inventory[chosen] = (inventory[chosen] || 0) - 1;

  const thirstRelief = resource.thirstRelief || 25;
  let stats = applyEffect(state.run.stats || SURVIVAL.startValues, {
    thirst: -thirstRelief,
    happiness: 1,
  });

  let run = { ...state.run, inventory, stats };
  const events = [
    {
      kind: "consume",
      message: `${resource.icon} You drink ${resource.name.toLowerCase()}. The thirst recedes.`,
    },
  ];

  // Roll dysentery for risky tiers.
  const dys = rollDysentery(run, resource.dysenteryChance || 0, Date.now(), rng);
  run = dys.run;
  events.push(...dys.events);

  // If this is boiled (or higher) AND the player is already sick, shorten
  // recovery — a small carrot for "drink the good stuff while sick."
  if (
    chosen === "water_boiled" &&
    isSick(run, "dysentery") &&
    dys.events.length === 0 // didn't just trigger fresh dysentery
  ) {
    const sh = shortenDysentery(run, DRINK_SHORTENS_MS);
    run = sh.run;
    events.push(...sh.events);
  }

  return { run, persistent: state.persistent, events };
}

// Boil 1 wood + 1 muddy → 1 boiled. Gated on Boiling research AND Fire Pit
// (Fire Pit is the only place we can actually drive heat into the cup).
export function performBoilWater(state) {
  if (!survivalActive(state)) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "No needs yet." }],
    };
  }
  if (!state.run.researched?.boiling) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "You haven't learned to boil yet." }],
    };
  }
  if (!state.run.built?.firepit) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "You need a fire to boil over." }],
    };
  }
  const inv = state.run.inventory || {};
  if ((inv.wood || 0) < 1) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "Not enough wood for the fire." }],
    };
  }
  if ((inv.water_muddy || 0) < 1) {
    return {
      run: state.run,
      persistent: state.persistent,
      events: [{ kind: "actionFail", message: "No muddy water to boil." }],
    };
  }

  const inventory = {
    ...inv,
    wood: (inv.wood || 0) - 1,
    water_muddy: (inv.water_muddy || 0) - 1,
    water_boiled: (inv.water_boiled || 0) + 1,
  };

  let run = { ...state.run, inventory };
  run = { ...run, stats: decayForAction(run.stats || {}, "Craft", run) };

  return {
    run,
    persistent: state.persistent,
    events: [
      {
        kind: "consume",
        message:
          "🫖 You set the cup over the fire. The bubbles rise, the boil holds, then quiets. +1 boiled water.",
      },
    ],
  };
}
