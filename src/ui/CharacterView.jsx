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
import { getPersonalArmor } from "../systems/combat.js";
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

function Slot({ slot, equipped, label, onUnequip }) {
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
  return (
    <button
      type="button"
      className={`char-slot is-filled ${clickable ? "is-clickable" : ""}`}
      title={`${def?.description || def?.name || cur.id}${clickable ? "\n\nClick to unequip." : ""}`}
      onClick={clickable ? () => onUnequip(slot) : undefined}
      disabled={!clickable}
    >
      <span className="char-slot-label muted">{label}</span>
      <span className="char-slot-value">
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
  { id: "char-items", icon: "🎒", label: "Items" },
];

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
            <Slot slot={SLOTS.HEAD} equipped={equipped} label="Head" onUnequip={handleUnequip} />
            <Slot slot={SLOTS.CHEST} equipped={equipped} label="Chest" onUnequip={handleUnequip} />
            <Slot slot={SLOTS.LEGGINGS} equipped={equipped} label="Legs" onUnequip={handleUnequip} />
            <Slot slot={SLOTS.BOOTS} equipped={equipped} label="Boots" onUnequip={handleUnequip} />
            <Slot slot={SLOTS.GLOVES} equipped={equipped} label="Gloves" onUnequip={handleUnequip} />
            <Slot slot={SLOTS.HAND_LEFT} equipped={equipped} label="Left hand" onUnequip={handleUnequip} />
            <Slot slot={SLOTS.HAND_RIGHT} equipped={equipped} label="Right hand" onUnequip={handleUnequip} />
            <Slot slot={SLOTS.RANGED} equipped={equipped} label="Ranged" onUnequip={handleUnequip} />
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
              <Slot slot={SLOTS.BACK} equipped={equipped} label="Back" onUnequip={handleUnequip} />
              <Slot slot={SLOTS.OVER_ARMOR} equipped={equipped} label="Over-armor" onUnequip={handleUnequip} />
              <Slot slot={SLOTS.TALISMAN} equipped={equipped} label="Talisman" onUnequip={handleUnequip} />
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

      {/* ─── 4. Items ─── */}
      <div id="char-items" className="char-section">
        <h3 className="char-section-title">Items</h3>
        {actions && (
          <EquipmentInventoryGrid state={state} actions={actions} />
        )}
      </div>
    </section>
  );
}
