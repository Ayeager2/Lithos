// Character stats (#47) — derived from skills + equipment + studies.
//
// Replaces the death-debuff STR proxy with a real formula. Each stat has
// a base value (10) plus skill-level contributions, study bonuses, and
// death-debuff reductions for STR/SPD. Combat math reads these via the
// helpers below.
//
// Stat → effect mapping:
//   STR  → melee damage bonus, future carry capacity
//   DEX  → ranged accuracy + player evasion
//   SPD  → action cooldown reduction (patrol, hunt, gather)
//   MAG  → spell + magic-weapon damage
//   Spirit → live 0-100 stat (run.stats.spirit) — used by ritual/regen
//
// All modifiers are computed relative to BASE_STAT (10); a "+1 STR" means
// the player gets a half-point of bonus melee damage. The CharacterView
// shows the raw value (e.g. 12 STR) while combat math reads the *Mod
// fields (delta from base).
//
// (Named character.js to avoid clashing with the run-observability
// systems/stats.js that owns snapshotRun/lifetimeStats.)

import { getSkillState } from "./skills.js";
import { getDeathDebuffMagnitude } from "./death.js";
import { getStudyStatBonuses } from "./studies.js";

export const BASE_STAT = 10;

export function computeStats(state) {
  const run = state?.run || state || {};
  const skills = run.skills || {};
  const ddMag = getDeathDebuffMagnitude(run);
  const studyBonus = getStudyStatBonuses(run);

  const lvl = (id) => skills[id]?.level || 0;
  const swordplay = lvl("swordplay");
  const archery = lvl("archery");
  const magicCombat = lvl("magicCombat");
  const butchering = lvl("butchering");
  const hunting = lvl("hunting");
  const maxCombat = Math.max(swordplay, archery, magicCombat);

  // STR: melee weight. swordplay/2 + butchering/4 + study armor/2 (heavy
  // armor scales melee), reduced by 1 per 10% death-debuff magnitude.
  const strBase =
    BASE_STAT +
    Math.floor(swordplay / 2) +
    Math.floor(butchering / 4) +
    Math.floor((studyBonus.armor || 0) / 2);
  const str = Math.max(0, strBase - Math.floor(ddMag * 10));

  // DEX: ranged + evasion. archery/2 + (hunting + butchering)/6.
  const dex =
    BASE_STAT +
    Math.floor(archery / 2) +
    Math.floor((hunting + butchering) / 6);

  // SPD: action cooldowns. max combat skill / 3, reduced by 1 per 20%
  // death-debuff magnitude (smaller hit than STR).
  const spdBase = BASE_STAT + Math.floor(maxCombat / 3);
  const spd = Math.max(1, spdBase - Math.floor(ddMag * 5));

  // MAG: spell power. magicCombat/2 + study spirit-bonus.
  const mag =
    BASE_STAT + Math.floor(magicCombat / 2) + Math.floor((studyBonus.spirit || 0) / 2);

  return {
    str,
    dex,
    spd,
    mag,
    strMod: str - BASE_STAT,
    dexMod: dex - BASE_STAT,
    spdMod: spd - BASE_STAT,
    magMod: mag - BASE_STAT,
  };
}

// Combat application. Returns flat bonuses + multipliers for combat.js
// to mix into the existing weapon math.
//
// damageBonus:  flat damage to add per attack (after weapon roll)
// accBonus:     additive to weapon acc (e.g. 0.05 = +5%)
// evasionBonus: additive to player evasion (e.g. 0.03 = +3%)
// damageMult:   multiplicative on rolled damage (1.0 = no change)
export function getStatCombatBonuses(state, weapon) {
  const s = computeStats(state);
  const type = weapon?.weaponStats?.type;
  const isRanged = type === "ranged";
  const subfam = weapon?.subfamily;
  const isMagic = subfam === "wand" || subfam === "censer" || subfam === "talisman";

  let damageBonus = 0;
  let damageMult = 1.0;
  let accBonus = 0;
  if (isMagic) {
    damageBonus = Math.max(0, s.magMod * 0.5);
    damageMult = 1 + Math.max(0, s.magMod * 0.05);
  } else if (isRanged) {
    damageBonus = Math.max(0, s.dexMod * 0.25);
    accBonus = s.dexMod * 0.01;
  } else {
    damageBonus = Math.max(0, s.strMod * 0.5);
  }
  const evasionBonus = Math.max(0, s.dexMod * 0.005);
  return { damageBonus, damageMult, accBonus, evasionBonus };
}

// Cooldown multiplier (1.0 = normal, <1.0 = faster). Capped at 0.5.
export function getSpdCooldownMult(state) {
  const s = computeStats(state);
  return Math.max(0.5, 1.0 - s.spdMod * 0.02);
}

export function getSpiritDisplay(state) {
  const run = state?.run || state || {};
  const studyBonus = getStudyStatBonuses(run);
  return {
    value: Math.round(run.stats?.spirit ?? 50),
    bonus: studyBonus.spirit || 0,
  };
}
