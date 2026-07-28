// Character view — the canonical "look at me + my stuff + my gear" hub.
//
// Layout (top to bottom; sticky left-edge jump-nav lets the player skip
// straight to any section):
//
//   1. Stats        — 2 columns. Survival (incl. Bridge STR at the bottom)
//                     and Combat (DEX/SPD/MAG/Spirit/Armor). Bridge folds
//                     into Survival now that the column count dropped to 2.
//   2. Skills       — Survival + Combat skills side-by-side, then Craft/
//                     Arcane below. Replaces the standalone Skills rail tab.
//   3. Equipment    — 8 main slots + collapsible accessory tray (back,
//                     overArmor, talisman, 10 rings). Click a filled slot
//                     to unequip — returns the instance to your pack.
//   4. Items        — EquipmentInventoryGrid (#45): top-tabbed item browser
//                     that handles equip + use.
//
// STR/DEX/SPD/MAG are real now (#47) — derived from skills + studies +
// death-debuff via systems/stats.js computeStats(). Base 10 each. Combat
// math reads them through getStatCombatBonuses() in combat.js.

import { useState } from "react";
import { SLOTS, getEquippable } from "../systems/equipment.js";
import { getAllCompanions, getCompanion } from "../content/companions.js";
import { canRecruit, getOwnedCompanions } from "../systems/companions.js";
import { getAllSummons, getSummon } from "../content/summons.js";
import { canBindSummon, getActiveSummon } from "../systems/summoning.js";
import { getActiveSetBonus } from "../content/armor.js";
import { getAllBuildings } from "../content/buildings.js";
import {
  getPersonalArmor,
  getCombatSkillForWeapon,
  getCombatSkillBonuses,
  getEffectiveImbueEffects,
} from "../systems/combat.js";
import { getStatCombatBonuses } from "../systems/character.js";
import { getWeaponImbues } from "../systems/runesmithing.js";
import { getWeaponEnchantments } from "../systems/enchantments.js";
import { getDeathDebuffMagnitude } from "../systems/death.js";
import { computeEra } from "../systems/era.js";
import { getActiveSkills } from "../content/skills.js";
import { getSkillState, getSkillProgress } from "../systems/skills.js";
import { computeStats } from "../systems/character.js";
import EquipmentInventoryGrid from "./EquipmentInventoryGrid.jsx";

// ─── Stat tooltips (read by hover) ───────────────────────────────────
const STAT_TIPS = {
  hp: "Hit points. Drops from combat, dysentery, sanity collapse. At 0 you fall — death-debuff applies, the run does not reset.",
  hunger: "Rises over time and with heavy work. High hunger drains HP. Eat to lower it.",
  thirst: "Rises faster than hunger. High thirst drains HP. Drink water — boiled is safest.",
  energy: "Spent on actions (gather, build, fight). Low energy slows you down. Rest restores.",
  resolve: "Willpower. Drops from setbacks. Low Resolve dims most action gains.",
  sanity: "Your grip on the world. Damaged by demons, the void, the wrong words. At 0 the world stops making sense.",
  spirit: "Magical energy (Era 3+). Spent casting spells. Refills slowly; the Ritual converts fragments → spirit.",
  str: "Strength — the bridge stat. Adds melee damage (+0.5 per point above 10). Grows with Swordplay and Butchering skill. Death-debuff cuts it by 1 per 10% magnitude.",
  dex: "Dexterity — ranged accuracy (+1% per point above 10) and evasion (+0.5%/pt). Grows with Archery, Hunting, and Butchering skill.",
  spd: "Speed — action cooldowns. Patrol, hunt, and gather all fire 2% faster per point above 10. Grows with your highest combat skill; death-debuff reduces it.",
  mag: "Magic — spell + magic-weapon damage. Adds +0.5 flat damage and +5% multiplier per point above 10. Grows with Magic Combat skill and Spirit-line studies.",
  armor: "Personal armor — reduces hp damage from foes in combat. Sourced from study completions (Wardweave) and future armor crafts.",
};

// ─── Sub-components ──────────────────────────────────────────────────

function StatRow({ label, value, max, icon, tooltip, kind = "default", placeholder }) {
  return (
    <div
      className={`char-stat-row char-stat-row--${kind}`}
      title={tooltip || undefined}
    >
      <span className="char-stat-icon" aria-hidden="true">{icon}</span>
      <span className="char-stat-label">{label}</span>
      <span className="char-stat-value">
        {placeholder ? <span className="muted">—</span> : value}
        {max != null && !placeholder && (
          <span className="char-stat-max muted"> / {max}</span>
        )}
      </span>
    </div>
  );
}

// #179 — multi-line breakdown of an equipped weapon's effective stats.
// Pulls base damage from the weapon def + skill / stat / imbue / blessing
// / enchant bonuses through the same combat helpers the fight resolver uses,
// so the tooltip always reflects what the next swing will actually do.
function buildWeaponBreakdown(def, state) {
  if (!def?.weaponStats || !state) return "";
  const run = state.run;
  const style = run?.combatStyle || "melee";
  const stats = def.weaponStats;
  const skillId = getCombatSkillForWeapon(def, style);
  const skillBonus = skillId ? getCombatSkillBonuses(run, skillId) : { damageBonus: 0, accBonus: 0, critBonus: 0 };
  const statBonus = getStatCombatBonuses(state, def, style) || { damageBonus: 0, accBonus: 0, damageMult: 1, evasionBonus: 0 };
  // Imbues + blessings + enchantments only fold in when this weapon is the
  // *effective* one; for other equipped weapons, show the raw counts only.
  const imbues = getWeaponImbues ? getWeaponImbues(state, def.id) : [];
  const enchants = getWeaponEnchantments ? getWeaponEnchantments(state, def.id) : [];
  const blessingIds = Object.keys(run?.blessings || {}).filter(
    (k) => run.blessings[k].expiresAt > Date.now()
  );
  // For the effective-totals row we use getEffectiveImbueEffects which
  // automatically returns null if the weapon isn't equipped — so the
  // numbers below are only "what the next swing does" when the equipped
  // weapon matches this slot.
  const fold = getEffectiveImbueEffects({ run, persistent: state.persistent }) || {};
  const [lo, hi] = stats.damage || [0, 0];
  const flatBonus = Math.floor((skillBonus.damageBonus || 0) + (statBonus.damageBonus || 0));
  const imbueDmg = fold.damageBonus || 0;
  const effLo = Math.max(0, Math.round((lo + flatBonus + imbueDmg) * (statBonus.damageMult || 1)));
  const effHi = Math.max(0, Math.round((hi + flatBonus + imbueDmg) * (statBonus.damageMult || 1)));
  const effAcc = (stats.acc || 0) + (skillBonus.accBonus || 0) + (statBonus.accBonus || 0) + (fold.accBonus || 0);
  const effCrit = (stats.crit || 0) + (skillBonus.critBonus || 0) + (fold.critChanceBonus || 0);
  const pct = (v) => `${Math.round(v * 100)}%`;
  const lines = [];
  lines.push(`${def.icon || "⚔️"} ${def.name} — ${stats.type || style}`);
  lines.push("");
  lines.push(`Base:  ${lo}-${hi} dmg · acc ${pct(stats.acc || 0)} · crit ${pct(stats.crit || 0)}`);
  if (skillId) {
    lines.push(`+ ${skillId}: +${skillBonus.damageBonus.toFixed(1)} dmg · +${pct(skillBonus.accBonus)} acc · +${pct(skillBonus.critBonus)} crit`);
  }
  if (statBonus.damageBonus || statBonus.accBonus || (statBonus.damageMult && statBonus.damageMult !== 1)) {
    const mult = (statBonus.damageMult || 1) !== 1 ? ` · ×${(statBonus.damageMult).toFixed(2)}` : "";
    lines.push(`+ stats: +${statBonus.damageBonus.toFixed(1)} dmg · +${pct(statBonus.accBonus)} acc${mult}`);
  }
  if (imbues.length > 0) {
    lines.push(`+ runes (${imbues.length}): ${imbues.map((i) => i.effect.label).join(", ")}`);
  }
  if (blessingIds.length > 0) {
    lines.push(`+ blessings (${blessingIds.length} active)`);
  }
  if (enchants.length > 0) {
    lines.push(`+ enchants (${enchants.length}): ${enchants.map((e) => e.effect.label).join(", ")}`);
  }
  lines.push("");
  lines.push(`= Effective: ${effLo}-${effHi} dmg · acc ${pct(effAcc)} · crit ${pct(effCrit)}`);
  return lines.join("\n");
}

function Slot({ slot, equipped, label, onUnequip, state }) {
  const cur = equipped?.[slot];
  if (cur?.twoHandedHeldIn) {
    const clickable = !!onUnequip;
    return (
      <button
        type="button"
        className={`char-slot is-locked ${clickable ? "is-clickable" : ""}`}
        title={`Two-handed weapon held in ${cur.twoHandedHeldIn} — click to unequip`}
        onClick={clickable ? () => onUnequip(slot) : undefined}
        disabled={!clickable}
      >
        <span className="char-slot-label muted">{label}</span>
        <span className="char-slot-value muted">2h in {cur.twoHandedHeldIn}</span>
      </button>
    );
  }
  if (!cur) {
    return (
      <div className="char-slot is-empty">
        <span className="char-slot-label muted">{label}</span>
        <span className="char-slot-value muted">empty</span>
      </div>
    );
  }
  const def = getEquippable(cur.id);
  const clickable = !!onUnequip;
  // #179 — weapon slots get the multi-line damage/acc/crit breakdown
  // appended to the title tooltip.
  const isWeapon = !!def?.weaponStats;
  const breakdown = isWeapon && state ? buildWeaponBreakdown(def, state) : "";
  const titleParts = [];
  titleParts.push(def?.description || def?.name || cur.id);
  if (breakdown) titleParts.push("", breakdown);
  if (clickable) titleParts.push("", "Click to unequip.");
  return (
    <button
      type="button"
      className={`char-slot is-filled ${clickable ? "is-clickable" : ""}`}
      title={titleParts.join("\n")}
      onClick={clickable ? () => onUnequip(slot) : undefined}
      disabled={!clickable}
    >
      <span className="char-slot-label muted">{label}</span>
      <span className="char-slot-value char-slot-value--flash" key={cur.id}>
        <span aria-hidden="true">{def?.icon || ""}</span> {def?.name || cur.id}
      </span>
    </button>
  );
}

// Skill row — same shape as SkillsPanel but rendered inline within a
// category column. Hidden skills already filtered out by the caller.
function SkillRow({ state, def }) {
  const { level } = getSkillState(state.run, def.id);
  const prog = getSkillProgress(state.run, def.id);
  const dim = level === 0;
  return (
    <li
      className={`skill-row ${dim ? "skill-row--dim" : ""} ${prog.atMax ? "skill-row--max" : ""
        }`}
      title={def.description || def.name}
    >
      <div className="skill-row-top">
        <span className="skill-icon" aria-hidden="true">{def.icon}</span>
        <span className="skill-name">{def.name}</span>
        <span className="skill-level">
          {prog.atMax ? "Mastered" : `Lv ${level}`}
        </span>
      </div>
      <div
        className="skill-bar"
        aria-label={`${def.name} progress`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={prog.needed}
        aria-valuenow={prog.current}
      >
        <div
          className="skill-bar-fill"
          style={{ width: `${prog.percent * 100}%` }}
        />
      </div>
      <div className="skill-row-meta muted">
        {prog.atMax
          ? "Capped — every act is mastery now."
          : `${prog.current} / ${prog.needed} XP`}
      </div>
    </li>
  );
}

function SkillColumn({ state, title, skills, emptyHint }) {
  return (
    <div className="char-skill-col">
      <h4 className="char-skill-col-title">{title}</h4>
      {skills.length === 0 ? (
        <div className="char-skill-empty muted">{emptyHint}</div>
      ) : (
        <ul className="skills-list">
          {skills.map((s) => (
            <SkillRow key={s.id} state={state} def={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

// Sticky left-edge jump-nav. Renders 4 icon buttons that scroll to each
// section. Each button uses an anchor on the section (#char-stats etc.).
function JumpNav({ items, active, onJump }) {
  return (
    <nav className="char-jump-nav" aria-label="Character section jump nav">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className={`char-jump-btn ${active === it.id ? "is-active" : ""}`}
          onClick={() => onJump(it.id)}
          title={it.label}
          aria-label={it.label}
        >
          <span className="char-jump-icon" aria-hidden="true">{it.icon}</span>
          <span className="char-jump-label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── Main component ─────────────────────────────────────────────────

const JUMP_ITEMS = [
  { id: "char-stats", icon: "📊", label: "Stats" },
  { id: "char-skills", icon: "🎯", label: "Skills" },
  { id: "char-equipment", icon: "🛡️", label: "Equipment" },
  { id: "char-companions", icon: "🐾", label: "Companions" },
  { id: "char-summons", icon: "🪐", label: "Summons" },
  { id: "char-altar", icon: "🕯️", label: "Altar" },
  { id: "char-items", icon: "🎒", label: "Items" },
];

// ─── Stone Altar etchings (#37 / #170 / etchings-UI) ─────────────────
// The altar accumulates marks across lives. Etching ids encode the
// source (study path, boss kill, etc.); we read the prefix to pick an
// icon and group them visually.
const ETCHING_PATH_ICON = {
  light: "☀️", bend: "🌑", elemental: "🌿", sigilcraft: "✒️",
  memory: "🔔", stoneword: "👂", voidcall: "⚫",
};
function etchingMeta(id) {
  if (!id) return { icon: "🕯️", group: "Other" };
  if (id === "studies:first") return { icon: "📜", group: "Foundation" };
  if (id === "studies:first-crossover") return { icon: "🪞", group: "Foundation" };
  const path = id.startsWith("path:") ? id.split(":")[1] : null;
  if (path && ETCHING_PATH_ICON[path]) return { icon: ETCHING_PATH_ICON[path], group: "Studies" };
  if (id.startsWith("voidcall:")) return { icon: "⚫", group: "Studies" };
  if (id.startsWith("boss:") || id.startsWith("era")) return { icon: "🥇", group: "Bosses" };
  // #176 — content expansion etchings.
  if (id.startsWith("mob:")) return { icon: "🗡️", group: "Combat" };
  if (id.startsWith("mug:")) return { icon: "🥷", group: "Thievery" };
  if (id.startsWith("prey:")) return { icon: "🏹", group: "Hunts" };
  if (id === "craft:rune:first") return { icon: "🪬", group: "Crafts" };
  if (id === "craft:enchant:first") return { icon: "🪬", group: "Crafts" };
  if (id.startsWith("craft:weapon:")) return { icon: "⚒️", group: "Crafts" };
  if (id.startsWith("craft:")) return { icon: "⚒️", group: "Crafts" };
  if (id.startsWith("ascension:")) return { icon: "🌌", group: "Ascensions" };
  if (id.startsWith("settlement:")) return { icon: "🏘️", group: "Settlement" };
  return { icon: "🕯️", group: "Other" };
}
function fmtRelTime(ms) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}
function AltarEtching({ id, entry }) {
  const meta = etchingMeta(id);
  return (
    <div className="altar-etching" title={`${entry.label || id}\nstamped ${fmtRelTime(entry.stampedAt)}`}>
      <span className="altar-etching-icon" aria-hidden="true">{meta.icon}</span>
      <div className="altar-etching-body">
        <div className="altar-etching-label">{entry.label || id}</div>
        <div className="altar-etching-time muted">{fmtRelTime(entry.stampedAt)}</div>
      </div>
    </div>
  );
}
function CompanionsSection({ state, actions }) {
  const all = getAllCompanions();
  const owned = new Set(Object.keys(state.run?.companions?.owned || {}));
  const activeId = state.run?.companions?.active || null;
  const era = state.run?.era || 0;
  return (
    <div id="char-companions" className="char-section">
      <h3 className="char-section-title">
        <span aria-hidden="true">🐾</span> Companions
        <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
          {owned.size} owned · {activeId ? "1 active" : "none active"}
        </span>
      </h3>
      <p className="muted char-section-lead">
        One walks with you. The rest wait nearby. Click to swap.
      </p>
      <div className="patrol-card-grid">
        {all.filter((c) => (c.era || 1) <= era + 1).map((c) => {
          const isOwned = owned.has(c.id);
          const isActive = activeId === c.id;
          const check = canRecruit(state, c.id);
          const bonusLines = Object.entries(c.bonuses || {}).map(([k, v]) => {
            const labels = {
              hpRegenPerMin: `+${v} HP / min`,
              spiritPerMin: `+${v} Spirit / min`,
              defense: `+${v} defense`,
              gatherDropMult: `×${v} gather drops`,
              gatherChanceBonus: `+${Math.round(v * 100)}% gather success`,
              runeChanceBonus: `+${Math.round(v * 100)}% rune drops`,
              weaponDropChance: `${Math.round(v * 100)}% bonus weapon / patrol`,
              storageCapMult: `×${v} inventory cap`,
            };
            return labels[k] || `${k}: ${v}`;
          });
          return (
            <div key={c.id}
              className={`patrol-card patrol-card--magic ${!isOwned ? "is-locked" : ""} ${isActive ? "is-active-loop" : ""}`}
              title={c.description}>
              <div className="patrol-card-head">
                <span className="patrol-card-icon" aria-hidden="true">{c.icon}</span>
                <div className="patrol-card-title">
                  <div className="patrol-card-name">{c.name}</div>
                  <div className="patrol-card-sub">
                    {isActive ? (
                      <span className="patrol-card-tier patrol-card-tier--rare">🌟 Active</span>
                    ) : isOwned ? (
                      <span className="patrol-card-tier patrol-card-tier--common">✔ Owned</span>
                    ) : (
                      <span className="patrol-card-tier patrol-card-tier--uncommon">Unmet</span>
                    )}
                    <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                      · era {c.era} · {c.bond}
                    </span>
                  </div>
                </div>
              </div>
              <p className="patrol-card-desc muted" style={{ fontSize: 11 }}>{c.description}</p>
              <div className="patrol-card-drops">
                <div className="patrol-card-drops-label muted" style={{ fontSize: 10 }}>Bonuses</div>
                <ul className="patrol-card-drops-list" style={{ fontSize: 11 }}>
                  {bonusLines.map((line, i) => (
                    <li key={i} className="patrol-card-drop">{line}</li>
                  ))}
                </ul>
              </div>
              {!isOwned && (
                <>
                  <div className="patrol-card-drops">
                    <div className="patrol-card-drops-label muted" style={{ fontSize: 10 }}>Cost</div>
                    <ul className="patrol-card-drops-list" style={{ fontSize: 11 }}>
                      {Object.entries(c.cost || {}).map(([res, qty]) => (
                        <li key={res} className="patrol-card-drop">{res} ×{qty}</li>
                      ))}
                    </ul>
                  </div>
                  <button type="button"
                    className="btn btn-primary btn-sm patrol-card-cta-btn"
                    disabled={!check.ok}
                    title={check.ok ? `Recruit ${c.name}` : check.reason}
                    onClick={() => actions.recruitCompanion(c.id)}>
                    {check.ok ? "Recruit" : "Locked"}
                  </button>
                </>
              )}
              {isOwned && !isActive && (
                <button type="button"
                  className="btn btn-primary btn-sm patrol-card-cta-btn"
                  onClick={() => actions.setActiveCompanion(c.id)}>
                  Activate
                </button>
              )}
              {isActive && (
                <button type="button"
                  className="btn btn-ghost btn-sm patrol-card-cta-btn"
                  onClick={() => actions.setActiveCompanion(null)}>
                  Dismiss
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AltarSection({ state }) {
  const built = !!state.run?.built?.stoneAltar;
  const etchings = state.persistent?.altarEtchings || {};
  const entries = Object.entries(etchings);
  // Group by source.
  const groups = {
    Foundation: [],
    Ascensions: [],
    Studies: [],
    Bosses: [],
    Settlement: [],
    Combat: [],
    Thievery: [],
    Hunts: [],
    Crafts: [],
    Other: [],
  };
  for (const [id, entry] of entries) {
    const g = etchingMeta(id).group;
    groups[g].push([id, entry]);
  }
  // Sort within each group by stamp time (newest first).
  for (const k of Object.keys(groups)) {
    groups[k].sort((a, b) => (b[1].stampedAt || 0) - (a[1].stampedAt || 0));
  }

  return (
    <div id="char-altar" className="char-section">
      <h3 className="char-section-title">
        <span aria-hidden="true">🕯️</span> Stone Altar
        <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
          {entries.length} {entries.length === 1 ? "etching" : "etchings"}
        </span>
      </h3>
      {!built ? (
        <p className="muted altar-empty">
          The Stone Altar is unbuilt. When it stands, what you do in this life — and every life before it — will be remembered here.
        </p>
      ) : entries.length === 0 ? (
        <p className="muted altar-empty">
          The altar is bare. Walk a path, beat a foe, and the first marks will appear.
        </p>
      ) : (
        <div className="altar-groups">
          {Object.entries(groups).map(([gname, gitems]) => (
            gitems.length === 0 ? null : (
              <div key={gname} className="altar-group">
                <div className="altar-group-title muted">{gname}</div>
                <div className="altar-grid">
                  {gitems.map(([id, entry]) => (
                    <AltarEtching key={id} id={id} entry={entry} />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// #224 — Forgehand picker.
function ForgehandBindControl({ summon, state, actions, disabled, reason }) {
  const [pick, setPick] = useState(null);
  const candidates = getAllBuildings().filter(
    (b) => state.run?.built?.[b.id] && (b.productionRecipe || b.staffSlots)
  );
  const target = pick || candidates[0]?.id;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <select
        value={target || ""}
        onChange={(e) => setPick(e.target.value)}
        disabled={disabled || candidates.length === 0}
        style={{ fontSize: 11 }}
      >
        {candidates.length === 0 && <option value="">No production buildings yet</option>}
        {candidates.map((b) => (
          <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-primary btn-sm patrol-card-cta-btn"
        disabled={disabled || !target}
        title={reason}
        onClick={() => actions.bindSummon(summon.id, target)}
      >
        🪐 Bind on {target ? candidates.find((b) => b.id === target)?.name : "..."}
      </button>
    </div>
  );
}

// #224 — Class armor set bonus chip.
function ArmorSetBonusChip({ equipped }) {
  const setBonus = getActiveSetBonus(equipped);
  if (!setBonus?.bonus) return null;
  const [armorClass, tier] = setBonus.key.split("_");
  const summary = Object.entries(setBonus.bonus).map(([k, v]) =>
    typeof v === "number" && v < 1 && v > 0
      ? `+${(v * 100).toFixed(0)}% ${k}`
      : `+${v} ${k}`
  ).join(" · ");
  return (
    <div style={{ marginTop: 8, padding: "6px 10px", background: "#7fc97f25", borderLeft: "3px solid #7fc97f", borderRadius: 4, fontSize: 11, color: "#7fc97f", fontWeight: 600 }}>
      🛡️ Set bonus active: {armorClass} {tier} — {summary}
    </div>
  );
}

function SummonsSection({ state, actions }) {
  const summons = getAllSummons();
  const live = getActiveSummon(state);
  const hasCircle = !!state.run?.built?.summoningCircle;
  return (
    <section id="char-summons" className="character-section">
      <h2 className="character-section-title">
        <span aria-hidden="true">🪐</span> Summons
      </h2>
      {!hasCircle && (
        <p className="muted" style={{ fontSize: 12 }}>
          Build a <strong>Summoning Circle</strong> at the Stone Altar to access summoning. Requires Era 4.
        </p>
      )}
      {hasCircle && live && (
        <div style={{ marginBottom: 10, padding: "8px 10px", borderLeft: `3px solid ${live.def.arc === "evil" ? "#8a3030" : "#4a7a4a"}`, background: `${live.def.arc === "evil" ? "#8a3030" : "#4a7a4a"}20`, borderRadius: 4 }}>
          <div style={{ fontWeight: 700 }}>
            {live.def.icon} {live.def.name} bound · expires {new Date(live.expiresAt).toLocaleTimeString()}
          </div>
          <div style={{ fontSize: 11, marginTop: 4 }}>{live.def.description}</div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 6 }}
            onClick={() => actions.dismissSummon()}
          >
            Dismiss
          </button>
        </div>
      )}
      {hasCircle && (
        <div className="patrol-card-grid">
          {summons.map((s) => {
            const check = canBindSummon(state, s.id);
            const arcColor = s.arc === "evil" ? "#8a3030" : "#4a7a4a";
            return (
              <div key={s.id} className="patrol-card" style={{ borderColor: arcColor }} title={s.description}>
                <div className="patrol-card-head">
                  <span className="patrol-card-icon" aria-hidden="true">{s.icon}</span>
                  <div className="patrol-card-title">
                    <div className="patrol-card-name">{s.name}</div>
                    <div className="patrol-card-sub">
                      <span className="patrol-card-tier" style={{ background: `${arcColor}22`, color: arcColor }}>
                        {s.arc} · {s.tier}
                      </span>
                      <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                        {Math.floor((s.durationMs || 0) / 60000)} min
                      </span>
                    </div>
                  </div>
                </div>
                <p className="muted" style={{ fontSize: 11 }}>{s.description}</p>
                <div className="patrol-card-drops">
                  <ul className="patrol-card-drops-list" style={{ fontSize: 11 }}>
                    {Object.entries(s.bonuses || {}).slice(0, 4).map(([k, v]) => (
                      <li key={k} className="patrol-card-drop">
                        <span>{k}: {typeof v === "boolean" ? "yes" : v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
                  Cost: {Object.entries(s.bindCost || {}).map(([k, v]) => `${v} ${k}`).join(", ")}
                </div>
                {s.bonuses?.productionBuildingMult ? (
                  <ForgehandBindControl
                    summon={s}
                    state={state}
                    actions={actions}
                    disabled={!check.ok || !!live}
                    reason={live ? "A summon is already bound." : check.ok ? `Bind ${s.name}` : check.reason}
                  />
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm patrol-card-cta-btn"
                    disabled={!check.ok || !!live}
                    title={live ? "A summon is already bound." : check.ok ? `Bind ${s.name}` : check.reason}
                    onClick={() => actions.bindSummon(s.id)}
                  >
                    🪐 Bind
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function CharacterView({ state, actions }) {
  const [accessoriesOpen, setAccessoriesOpen] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState("char-stats");
  const stats = state?.run?.stats || {};
  const equipped = state?.run?.equipped || {};
  const era = computeEra(state);
  const showSpirit = era >= 3;
  const handleUnequip = actions?.unequip
    ? (slot) => actions.unequip(slot)
    : null;
  const handleUnequipRing = actions?.unequipRing
    ? (ringIndex) => actions.unequipRing(ringIndex)
    : null;

  // Real stat modulation (#47). STR/DEX/SPD/MAG derived from skills +
  // studies + death-debuff. See systems/stats.js for the formulas.
  const ddMag = getDeathDebuffMagnitude(state.run);
  const derivedStats = computeStats(state);
  const { str, dex, spd, mag } = derivedStats;
  const armor = getPersonalArmor(state);

  const rings = Array.isArray(equipped.rings) ? equipped.rings : [];
  const filledRings = rings.filter(Boolean).length;
  const accessoryFilled =
    (equipped.back ? 1 : 0) +
    (equipped.overArmor ? 1 : 0) +
    (equipped.talisman ? 1 : 0) +
    filledRings;

  // Group active skills by category. Survival + Combat ride side-by-side
  // mirroring the stat grid above; the rest live in a row beneath them.
  const activeSkills = getActiveSkills().slice().sort(
    (a, b) => (a.name || "").localeCompare(b.name || "")
  );
  const survivalSkills = activeSkills.filter((s) => s.category === "survival");
  const combatSkills = activeSkills.filter((s) => s.category === "combat");
  const craftSkills = activeSkills.filter((s) => s.category === "craft");
  const arcaneSkills = activeSkills.filter((s) => s.category === "arcane");
  const industrySkills = activeSkills.filter((s) => s.category === "industry");
  // Craft / Industry / Arcane each get their own column when populated
  // — folding them into a single "Other" pile was confusing (#107).
  const secondaryCols = [
    { id: "craft", title: "Craft", skills: craftSkills },
    { id: "industry", title: "Industry", skills: industrySkills },
    { id: "arcane", title: "Arcane", skills: arcaneSkills },
  ].filter((c) => c.skills.length > 0);

  // Jump-nav target — anchor scrolling + visual highlight.
  const handleJump = (id) => {
    setActiveAnchor(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="action-panel action-panel--character">
      <JumpNav items={JUMP_ITEMS} active={activeAnchor} onJump={handleJump} />

      <div className="panel-header">
        <h2>Character</h2>
        <p className="muted">
          The body, the bridge, the mind. Stats, skills, gear, and pack — all in one place.
        </p>
      </div>

      {/* ─── 1. Stats ─── */}
      <div id="char-stats" className="char-section">
        <h3 className="char-section-title">Stats</h3>
        <div className="char-grid char-grid--two">
          {/* Survival — now carries STR at the bottom (Bridge fold). */}
          <div className="char-col char-col--survival">
            <h4 className="char-col-title">Survival</h4>
            <StatRow label="HP" value={Math.round(stats.hp ?? 100)} max={100} icon="❤️" tooltip={STAT_TIPS.hp} kind="hp" />
            <StatRow label="Hunger" value={Math.round(stats.hunger ?? 0)} max={100} icon="🍽️" tooltip={STAT_TIPS.hunger} />
            <StatRow label="Thirst" value={Math.round(stats.thirst ?? 0)} max={100} icon="💧" tooltip={STAT_TIPS.thirst} />
            <StatRow label="Energy" value={Math.round(stats.energy ?? 100)} max={100} icon="⚡" tooltip={STAT_TIPS.energy} />
            <StatRow label="Resolve" value={Math.round(stats.happiness ?? 50)} max={100} icon="✦" tooltip={STAT_TIPS.resolve} kind="resolve" />
            <StatRow label="Sanity" value={Math.round(stats.sanity ?? 50)} max={100} icon="◐" tooltip={STAT_TIPS.sanity} kind="sanity" />
            {showSpirit && (
              <StatRow label="Spirit" value={Math.round(stats.spirit ?? 50)} max={100} icon="✨" tooltip={STAT_TIPS.spirit} kind="spirit" />
            )}
            {/* Bridge — STR folded in. Subtle divider keeps it visually
                grouped but distinct from the survival rows above. */}
            <div className="char-col-divider" aria-hidden="true" />
            <StatRow label="STR" value={str} icon="💪" tooltip={STAT_TIPS.str} kind="str" />
            {ddMag > 0 && (
              <p className="muted char-col-note">
                ⚠️ Death-debuff active (magnitude {Math.round(ddMag * 100)}%). Eat to recover — STR + SPD rise as the cascade lifts.
              </p>
            )}
          </div>

          {/* Combat */}
          <div className="char-col char-col--combat">
            <h4 className="char-col-title">Combat</h4>
            <StatRow label="DEX" value={dex} icon="🎯" tooltip={STAT_TIPS.dex} kind="dex" />
            <StatRow label="SPD" value={spd} icon="💨" tooltip={STAT_TIPS.spd} kind="spd" />
            <StatRow label="MAG" value={mag} icon="🪄" tooltip={STAT_TIPS.mag} kind="mag" />
            {showSpirit && (
              <StatRow label="Spirit" value={Math.round(stats.spirit ?? 50)} max={100} icon="✨" tooltip={STAT_TIPS.spirit} kind="spirit" />
            )}
            <StatRow label="Armor" value={armor} icon="🛡️" tooltip={STAT_TIPS.armor} />
            <p className="muted char-col-note">
              Combat stats grow with the relevant skills + studies. Base value is 10.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 2. Skills ─── */}
      <div id="char-skills" className="char-section">
        <h3 className="char-section-title">Skills</h3>
        <p className="muted char-section-lead">
          Skills grow as you do the work. There is nothing to spend.
        </p>
        <div className="char-skills-grid">
          <SkillColumn
            state={state}
            title="Survival"
            skills={survivalSkills}
            emptyHint="No survival skills active yet."
          />
          <SkillColumn
            state={state}
            title="Combat"
            skills={combatSkills}
            emptyHint="Fight something to earn combat skills."
          />
        </div>
        {secondaryCols.length > 0 && (
          <div
            className="char-skills-grid char-skills-grid--secondary"
            style={{ "--cols": secondaryCols.length }}
          >
            {secondaryCols.map((c) => (
              <SkillColumn
                key={c.id}
                state={state}
                title={c.title}
                skills={c.skills}
                emptyHint=""
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── 3. Equipment ─── */}
      <div id="char-equipment" className="char-section">
        <h3 className="char-section-title">Equipment</h3>
        <p className="muted char-section-lead">
          Click a filled slot to unequip. Equip from the inventory below.
        </p>
        <div className="char-equipment">
          <div className="char-slots char-slots--main">
            <Slot slot={SLOTS.HEAD} equipped={equipped} label="Head" onUnequip={handleUnequip} state={state} />
            <Slot slot={SLOTS.CHEST} equipped={equipped} label="Chest" onUnequip={handleUnequip} state={state} />
            <Slot slot={SLOTS.LEGGINGS} equipped={equipped} label="Legs" onUnequip={handleUnequip} state={state} />
            <Slot slot={SLOTS.BOOTS} equipped={equipped} label="Boots" onUnequip={handleUnequip} state={state} />
            <Slot slot={SLOTS.GLOVES} equipped={equipped} label="Gloves" onUnequip={handleUnequip} state={state} />
            <Slot slot={SLOTS.HAND_LEFT} equipped={equipped} label="Left hand" onUnequip={handleUnequip} state={state} />
            <Slot slot={SLOTS.HAND_RIGHT} equipped={equipped} label="Right hand" onUnequip={handleUnequip} state={state} />
            <Slot slot={SLOTS.RANGED} equipped={equipped} label="Ranged" onUnequip={handleUnequip} state={state} />
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm char-accessories-toggle"
            onClick={() => setAccessoriesOpen((v) => !v)}
          >
            {accessoriesOpen ? "Hide" : "Show"} accessories
            {accessoryFilled > 0 && (
              <span className="char-accessories-count"> ({accessoryFilled} filled)</span>
            )}
          </button>

          {accessoriesOpen && (
            <div className="char-slots char-slots--accessories">
              <Slot slot={SLOTS.BACK} equipped={equipped} label="Back" onUnequip={handleUnequip} state={state} />
              <Slot slot={SLOTS.OVER_ARMOR} equipped={equipped} label="Over-armor" onUnequip={handleUnequip} state={state} />
              <Slot slot={SLOTS.TALISMAN} equipped={equipped} label="Talisman" onUnequip={handleUnequip} state={state} />
              {rings.map((r, i) => {
                const clickable = !!r && !!handleUnequipRing;
                if (!r) {
                  return (
                    <div
                      key={`ring-${i}`}
                      className="char-slot is-empty"
                      title="Empty ring slot"
                    >
                      <span className="char-slot-label muted">Ring {i + 1}</span>
                      <span className="char-slot-value muted">empty</span>
                    </div>
                  );
                }
                const def = getEquippable(r.id);
                return (
                  <button
                    key={`ring-${i}`}
                    type="button"
                    className={`char-slot is-filled ${clickable ? "is-clickable" : ""}`}
                    title={`${def?.description || def?.name || r.id}${clickable ? "\n\nClick to unequip." : ""}`}
                    onClick={clickable ? () => handleUnequipRing(i) : undefined}
                    disabled={!clickable}
                  >
                    <span className="char-slot-label muted">Ring {i + 1}</span>
                    <span className="char-slot-value">
                      <span aria-hidden="true">{def?.icon || ""}</span>{" "}
                      {def?.name || r.id}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* #224 — Class armor set bonus chip (when all 5 of a class+tier equipped). */}
      <ArmorSetBonusChip equipped={equipped} />

      {/* ─── 4. Companions ─── */}
      <CompanionsSection state={state} actions={actions} />

      {/* ─── 5. Summons (#212) ─── */}
      <SummonsSection state={state} actions={actions} />

      {/* ─── 5. Stone Altar etchings ─── */}
      <AltarSection state={state} />

      {/* ─── 5. Items ─── */}
      <div id="char-items" className="char-section">
        <h3 className="char-section-title">Items</h3>
        {actions && (
          <EquipmentInventoryGrid state={state} actions={actions} />
        )}
      </div>
    </section>
  );
}
