// Dev / debug panel. Skip-the-grind testing interface.
//
// Toggles via Ctrl+Shift+D. Organized into tabs: Quick / Content / State /
// Encounters / System. All actions go through devPatch() which applies a
// pure mutator from systems/dev.js.

import { useEffect, useState } from "react";
import * as dev from "../systems/dev.js";
import { getAllResources } from "../content/resources.js";
import { getAllBuildings } from "../content/buildings.js";
import { getAllResearch } from "../content/research.js";
import { getAllTools } from "../content/tools.js";
import { getActiveSkills } from "../content/skills.js";
import { getAllEvents } from "../content/events.js";
import { getAllThreats } from "../content/threats.js";
import { getAllSpells } from "../content/spells.js";
import { getAllStudies, STUDY_PATHS } from "../content/studies.js";
import { getAllWeapons } from "../content/weapons.js";
import { getMobsForEra, getAllMobs, COIN_VALUE } from "../content/mobs.js";
import { getAllBosses, getBossesAvailable } from "../content/bosses.js";
import {
  SLOTS,
  HAND_SLOTS,
  getEquippable,
} from "../systems/equipment.js";
import { computeEra, getNextEraRequirements } from "../systems/era.js";
import { getUnarmoredPenalty, getArmoredCount } from "../systems/combat.js";
import { getPatrolCooldownMs } from "../systems/patrol.js";
import { getWorkerCount } from "../systems/workers.js";

const TABS = [
  { id: "quick", label: "🚀 Quick" },
  { id: "content", label: "🌍 Content" },
  { id: "state", label: "🧠 State" },
  { id: "encounters", label: "⚔️ Encounters" },
  { id: "patrol", label: "🗡️ Patrol" },
  { id: "arcane", label: "🕯️ Arcane" },
  { id: "system", label: "⏱️ System" },
];

export function isDevAvailable(settings) {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) return true;
  return !!settings?.devUnlocked;
}

function Section({ title, children }) {
  return (
    <div className="dev-section">
      <h3>{title}</h3>
      <div className="dev-section-body">{children}</div>
    </div>
  );
}

function Btn({ label, onClick, danger = false, small = false }) {
  const cls = `dev-btn ${danger ? "dev-btn--danger" : ""} ${small ? "dev-btn--small" : ""}`;
  return (
    <button className={cls} onClick={onClick} type="button">{label}</button>
  );
}

function giveTool(state, t) {
  // Resource-producing recipes (scrollCraft, inkCraft) — grant the
  // *resource* into inventory, not the recipe id. Mirrors performCraft.
  if (t.producesResource) {
    const { id: outId, qty = 1 } = t.producesResource;
    const haveQty = state.run.inventory?.[outId] || 0;
    return {
      run: {
        ...state.run,
        inventory: { ...state.run.inventory, [outId]: haveQty + qty },
      },
      msg: `🛠️ +${qty} ${t.name}.`,
    };
  }
  const haveQty = state.run.inventory?.[t.id] || 0;
  return {
    run: {
      ...state.run,
      inventory: { ...state.run.inventory, [t.id]: haveQty + 1 },
      toolDurability: {
        ...state.run.toolDurability,
        [t.id]: t.durability?.max || (state.run.toolDurability?.[t.id] ?? 1),
      },
      toolsCrafted: {
        ...(state.run.toolsCrafted || {}),
        [t.id]: {
          craftedAt: Date.now(),
          count: (state.run.toolsCrafted?.[t.id]?.count || 0) + 1,
        },
      },
    },
    msg: `🛠️ +1 ${t.name}.`,
  };
}

export default function DevPanel({ state, actions, onClose }) {
  const apply = (patch) => actions.devPatch(patch);
  const [tab, setTab] = useState("quick");

  const era = computeEra(state);
  const stats = state.run.stats || {};
  const alignment = state.run.alignment || { good: 0, evil: 0 };
  const statuses = state.run.statuses || {};
  const nextEraReqs = getNextEraRequirements(state);

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal modal--dev"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Dev panel"
      >
        <header className="modal-header dev-header">
          <div>
            <h2>🛠️ Dev Panel</h2>
            <p className="muted modal-subtitle">
              Era {era} · {Object.keys(state.run.built || {}).length} built ·{" "}
              {Object.keys(state.run.researched || {}).length} researched ·{" "}
              good {alignment.good || 0} · evil {alignment.evil || 0} · Echoes{" "}
              {state.persistent.echoes} · WS{" "}
              {Math.round((state.run.worldScore || 0) * 10) / 10}
              {state.run.worldScoreRevealed ? " (revealed)" : ""} ·{" "}
              studies {Object.keys(state.run.studiesCompleted || {}).length}/
              {Object.keys(state.run.studyProgress || {}).length}
              {nextEraReqs.length > 0 && (
                <><br />Next era needs: {nextEraReqs.join(", ")}</>
              )}
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <nav className="dev-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`dev-tab ${tab === t.id ? "is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="modal-body dev-body">
          {tab === "quick" && <QuickTab state={state} apply={apply} />}
          {tab === "content" && <ContentTab state={state} apply={apply} />}
          {tab === "state" && (
            <StateTab state={state} apply={apply} stats={stats} alignment={alignment} statuses={statuses} />
          )}
          {tab === "encounters" && <EncountersTab state={state} apply={apply} />}
          {tab === "patrol" && <PatrolTab state={state} apply={apply} />}
          {tab === "arcane" && <ArcaneTab state={state} apply={apply} />}
          {tab === "system" && <SystemTab state={state} actions={actions} apply={apply} />}
        </div>
      </div>
    </div>
  );
}

function QuickTab({ state, apply }) {
  return (
    <>
      <Section title="Era jumps (minimum entry conditions)">
        <Btn label="Jump to Era 1" onClick={() => apply(dev.devJumpToEra1(state))} />
        <Btn label="Jump to Era 2" onClick={() => apply(dev.devJumpToEra2(state))} />
        <Btn label="Jump to Era 3" onClick={() => apply(dev.devJumpToEra3(state))} />
      </Section>
      <Section title="Full unlock (everything in that era + earlier)">
        <Btn label="🚀 Unlock all Era 1" onClick={() => apply(dev.devUnlockAll(state))} />
        <Btn label="🚀 Unlock all Era 2" onClick={() => apply(dev.devUnlockAllEra2(state))} />
        <Btn label="🚀 Unlock all Era 3" onClick={() => apply(dev.devUnlockAllEra3(state))} />
      </Section>
      <Section title="Rock + fragments">
        <Btn label="Find rock" onClick={() => apply(dev.devFindRock(state))} />
        <Btn label="Force awakening" onClick={() => apply(dev.devForceAwaken(state))} />
        <Btn label="+10 fragments" onClick={() => apply(dev.devGiveFragments(state, 10))} />
        <Btn label="+50 fragments" onClick={() => apply(dev.devGiveFragments(state, 50))} />
      </Section>
      <Section title="Resources">
        <Btn label="+999 of every resource" onClick={() => apply(dev.devGiveAll(state, 999))} />
        <Btn label="+99 of every resource" onClick={() => apply(dev.devGiveAll(state, 99))} />
        <Btn label="Clear inventory" danger onClick={() =>
          apply(dev.devSetInventory(state, Object.fromEntries(getAllResources().map((r) => [r.id, 0]))))
        } />
      </Section>
    </>
  );
}

function ContentTab({ state, apply }) {
  return (
    <>
      <Section title="Buildings">
        <Btn label="Build all" onClick={() => apply(dev.devBuildAll(state))} />
        {getAllBuildings().map((b) => (
          <Btn key={b.id} small
            label={`${b.icon} ${b.name}${state.run.built?.[b.id] ? " ✓" : ""}`}
            onClick={() => apply({
              run: { ...state.run, built: { ...state.run.built, [b.id]: { at: Date.now() } } },
              msg: `🛠️ Built ${b.name}.`,
            })} />
        ))}
      </Section>
      <Section title="Research">
        <Btn label="Learn all" onClick={() => apply(dev.devLearnAllResearch(state))} />
        {getAllResearch().map((r) => (
          <Btn key={r.id} small
            label={`${r.icon} ${r.name}${state.run.researched?.[r.id] ? " ✓" : ""}`}
            onClick={() => apply({
              run: { ...state.run, researched: { ...state.run.researched, [r.id]: { at: Date.now() } } },
              msg: `🛠️ Learned ${r.name}.`,
            })} />
        ))}
      </Section>
      <Section title="Tools / Potions">
        <Btn label="Craft all (full durability)" onClick={() => apply(dev.devCraftAll(state))} />
        {getAllTools().map((t) => {
          const qty = state.run.inventory?.[t.id] || 0;
          const stack = t.isStackable ? `×${qty}` : qty > 0 ? "✓" : "";
          return (
            <Btn key={t.id} small label={`${t.icon} ${t.name} ${stack}`}
              onClick={() => apply(giveTool(state, t))} />
          );
        })}
      </Section>
    </>
  );
}

function StateTab({ state, apply, stats, alignment, statuses }) {
  const spells = getAllSpells();
  const spellCooldowns = state.run.spellCooldowns || {};
  const cooling = Object.values(spellCooldowns).filter((u) => u > Date.now()).length;

  const setStat = (key, value) => ({
    run: { ...state.run, stats: { ...state.run.stats, [key]: Math.max(0, Math.min(100, value)) } },
    msg: `🛠️ ${key} → ${value}.`,
  });

  const statKeys = [
    ["HP", "hp"], ["Energy", "energy"], ["Hunger", "hunger"], ["Thirst", "thirst"],
    ["Resolve", "happiness"], ["Sanity", "sanity"], ["Spirit", "spirit"],
  ];

  return (
    <>
      <Section title="Survival stats">
        <Btn label="Max all stats" onClick={() => apply(dev.devMaxStats(state))} />
        <Btn label="Hurt to red zones" danger onClick={() => apply(dev.devHurtStats(state))} />
        <div className="dev-stat-grid">
          {statKeys.map(([label, key]) => (
            <div key={key} className="dev-stat-row">
              <span className="dev-stat-label">{label}</span>
              <span className="dev-stat-value">{Math.round(stats[key] ?? 0)}</span>
              <button type="button" className="dev-btn dev-btn--small" onClick={() => apply(setStat(key, 0))}>0</button>
              <button type="button" className="dev-btn dev-btn--small" onClick={() => apply(setStat(key, 50))}>50</button>
              <button type="button" className="dev-btn dev-btn--small" onClick={() => apply(setStat(key, 100))}>max</button>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Skills">
        <Btn label="Lvl 5" onClick={() => apply(dev.devLevelAllSkills(state, 5))} />
        <Btn label="Lvl 10" onClick={() => apply(dev.devLevelAllSkills(state, 10))} />
        <Btn label="Lvl 20 (max)" onClick={() => apply(dev.devLevelAllSkills(state, 20))} />
        <Btn label="Reset" danger onClick={() => apply(dev.devResetSkills(state))} />
        <div className="dev-row-stats muted">
          {getActiveSkills().map((s) => `${s.icon}${state.run.skills?.[s.id]?.level || 0}`).join(" · ")}
        </div>
      </Section>
      <Section title="Craft disciplines (#118) — per-skill level">
        {["survivalcraft", "blacksmithing", "alchemy", "fletching", "woodworking", "tailoring", "farming", "runesmithing"].map((id) => {
          const def = getActiveSkills().find((s) => s.id === id);
          const cur = state.run.skills?.[id]?.level || 0;
          return (
            <div key={id} style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
              <span style={{ minWidth: 130, fontSize: 12 }}>
                {def?.icon} {def?.name || id} <span className="muted">lvl {cur}</span>
              </span>
              <Btn small label="lvl 1"  onClick={() => apply(dev.devLevelSkill(state, id, 1))} />
              <Btn small label="lvl 5"  onClick={() => apply(dev.devLevelSkill(state, id, 5))} />
              <Btn small label="lvl 10" onClick={() => apply(dev.devLevelSkill(state, id, 10))} />
              <Btn small label="lvl 20" onClick={() => apply(dev.devLevelSkill(state, id, 20))} />
            </div>
          );
        })}
        <div className="dev-row-stats muted">
          Drives craft success chance (#113) — lvl 0 + tier-3 (arcane) = 25%, lvl 20 = 80%.
        </div>
      </Section>
      <Section title="Alignment">
        <Btn label="Good 5" onClick={() => apply(dev.devSetAlignment(state, "good", 5))} />
        <Btn label="Good 10" onClick={() => apply(dev.devSetAlignment(state, "good", 10))} />
        <Btn label="Evil 5" onClick={() => apply(dev.devSetAlignment(state, "evil", 5))} />
        <Btn label="Evil 10" onClick={() => apply(dev.devSetAlignment(state, "evil", 10))} />
        <Btn label="Reset to neutral" onClick={() => apply(dev.devSetAlignment(state, "neutral", 0))} />
        <div className="dev-row-stats muted">good {alignment.good || 0} · evil {alignment.evil || 0}</div>
      </Section>
      <Section title="Spells">
        <Btn label={`Clear cooldowns${cooling ? ` (${cooling})` : ""}`}
          onClick={() => apply(dev.devClearSpellCooldowns(state))} />
        <div className="dev-row-stats muted">
          {spells.map((s) => {
            const known = !!state.run.researched?.[s.requires?.researched];
            const cd = spellCooldowns[s.id] || 0;
            return `${s.icon}${known ? "" : "—"}${cd > Date.now() ? "⏳" : ""}`;
          }).join(" · ")}
        </div>
      </Section>
      <Section title="Statuses">
        <Btn label="Apply Warded (5 min)" onClick={() => apply(dev.devApplyStatus(state, "warded", 300))} />
        <Btn label="Clear Warded" onClick={() => apply(dev.devApplyStatus(state, "warded", 0))} />
        <Btn label="Apply Dysentery (5 min)" onClick={() => apply(dev.devApplyDysentery(state, 5))} />
        <Btn label="Clear Dysentery" onClick={() => apply(dev.devApplyDysentery(state, 0))} />
        <Btn label="💔 Apply Death Debuff (cascade)" danger onClick={() => apply(dev.devApplyDeathDebuff(state))} />
        <Btn label="Set Death Debuff → 0.5" onClick={() => apply(dev.devSetDeathDebuffMagnitude(state, 0.5))} />
        <Btn label="Set Death Debuff → 0.25" onClick={() => apply(dev.devSetDeathDebuffMagnitude(state, 0.25))} />
        <Btn label="Clear Death Debuff" onClick={() => apply(dev.devClearDeathDebuff(state))} />
        <div className="dev-row-stats muted">
          Death debuff:{" "}
          {state.run.statuses?.deathDebuff?.active
            ? `mag ${Math.round((state.run.statuses.deathDebuff.magnitude || 0) * 100)}% · deaths ×${state.run.statuses.deathDebuff.deaths || 1}`
            : "none"}
        </div>
        <div className="dev-row-stats muted">
          Active:{" "}
          {Object.entries(statuses).filter(([, s]) => s?.until > Date.now() || s?.expiresAt > Date.now() || s?.active).length === 0
            ? "none"
            : Object.entries(statuses)
                .filter(([, s]) => s?.until > Date.now() || s?.expiresAt > Date.now() || s?.active)
                .map(([id, s]) => {
                  const until = s.until || s.expiresAt || 0;
                  const remaining = until > Date.now() ? `${Math.ceil((until - Date.now()) / 1000)}s` : "active";
                  return `${id} (${remaining})`;
                })
                .join(", ")}
        </div>
      </Section>
    </>
  );
}

// ─── Arcane tab — Studies, World Score, water tiers, dysentery shortcuts ───
function ArcaneTab({ state, apply }) {
  const wsScore = state.run.worldScore || 0;
  const completedStudies = Object.keys(state.run.studiesCompleted || {});
  const inProgressStudies = Object.keys(state.run.studyProgress || {});
  const activeStudyId = state.run.activeStudyId;
  const altarBuilt = !!state.run.built?.stoneAltar;

  return (
    <>
      <Section title="Quick-unlock the Arcane Studies arc">
        <Btn
          label={`🕯️ Build Stone Altar (with prereqs)${altarBuilt ? " ✓" : ""}`}
          onClick={() => apply(dev.devBuildStoneAltar(state))}
        />
        <Btn label="📜 +5 Scrolls & Inks" onClick={() => apply(dev.devGiveStudyMaterials(state, 5))} />
        <Btn label="📜 +20 Scrolls & Inks" onClick={() => apply(dev.devGiveStudyMaterials(state, 20))} />
        <div className="dev-row-stats muted">
          Scroll: {state.run.inventory?.scroll || 0} · Ink:{" "}
          {state.run.inventory?.ink || 0}
        </div>
      </Section>

      <Section title="Water tiers">
        <Btn label="🩸 +10 stagnant" onClick={() => apply(dev.devGiveWater(state, "water_stagnant", 10))} />
        <Btn label="💧 +10 muddy" onClick={() => apply(dev.devGiveWater(state, "water_muddy", 10))} />
        <Btn label="🫖 +10 boiled" onClick={() => apply(dev.devGiveWater(state, "water_boiled", 10))} />
        <div className="dev-row-stats muted">
          Stagnant: {state.run.inventory?.water_stagnant || 0} · Muddy:{" "}
          {state.run.inventory?.water_muddy || 0} · Boiled:{" "}
          {state.run.inventory?.water_boiled || 0}
        </div>
      </Section>

      <Section title="Studies">
        <Btn label="Complete active study" onClick={() => apply(dev.devCompleteActiveStudy(state))} />
        <Btn label="Complete ALL studies" onClick={() => apply(dev.devCompleteAllStudies(state))} />
        <Btn label="Reset all study state" danger onClick={() => apply(dev.devResetStudies(state))} />
        <div className="dev-row-stats muted">
          Completed: {completedStudies.length}/{getAllStudies().length} · In progress:{" "}
          {inProgressStudies.length} · Active: {activeStudyId || "none"}
        </div>
        <div className="dev-row-stats muted" style={{ marginTop: 4 }}>
          Per-path completed:{" "}
          {Object.values(STUDY_PATHS).map((p) => {
            const count = getAllStudies().filter(
              (s) => s.path === p.id && state.run.studiesCompleted?.[s.id]
            ).length;
            return `${p.icon}${count}`;
          }).join(" ")}
        </div>
      </Section>

      <Section title="World Score (hidden meter)">
        <Btn label="WS → 0" onClick={() => apply(dev.devSetWorldScore(state, 0))} />
        <Btn label="WS → 5 (gather +5%)" onClick={() => apply(dev.devSetWorldScore(state, 5))} />
        <Btn label="WS → 15 (garden +20%)" onClick={() => apply(dev.devSetWorldScore(state, 15))} />
        <Btn label="WS → 30 (water promote chance)" onClick={() => apply(dev.devSetWorldScore(state, 30))} />
        <Btn label="WS → 50 (water hole → boiled)" onClick={() => apply(dev.devSetWorldScore(state, 50))} />
        <Btn label="WS → 80 (garden → bird meat)" onClick={() => apply(dev.devSetWorldScore(state, 80))} />
        <Btn label="WS → 100 (apex reveal)" onClick={() => apply(dev.devSetWorldScore(state, 100))} />
        <Btn label="WS +5" onClick={() => apply(dev.devSetWorldScore(state, wsScore + 5))} />
        <Btn label="WS -5" onClick={() => apply(dev.devSetWorldScore(state, Math.max(0, wsScore - 5)))} />
        <div className="dev-row-stats muted">
          Current: {Math.round(wsScore * 10) / 10}
          {state.run.worldScoreRevealed ? " · revealed" : ""}
        </div>
      </Section>

      <Section title="Runes / Imbues / Blessings (#136 / #138 / #151)">
        <div className="dev-row-stats muted" style={{ marginBottom: 4 }}>
          Grant runes by rarity (5 of each type).
        </div>
        <Btn label="🩹 +5 each Common" onClick={() => apply(dev.devGiveRunesByRarity(state, "common", 5))} />
        <Btn label="🪶 +5 each Uncommon" onClick={() => apply(dev.devGiveRunesByRarity(state, "uncommon", 5))} />
        <Btn label="🔮 +5 each Rare" onClick={() => apply(dev.devGiveRunesByRarity(state, "rare", 5))} />
        <Btn label="✨ +5 each Epic" onClick={() => apply(dev.devGiveRunesByRarity(state, "epic", 5))} />
        <Btn label="🌟 +5 each Legendary" onClick={() => apply(dev.devGiveRunesByRarity(state, "legendary", 5))} />
        <Btn label="🔥 +5 each Mythic" onClick={() => apply(dev.devGiveRunesByRarity(state, "mythic", 5))} />
        <Btn label="🩸 +1 each GOD" onClick={() => apply(dev.devGiveRunesByRarity(state, "god", 1))} />
        <div className="dev-row-stats muted" style={{ marginTop: 6 }}>
          Imbue + bless management.
        </div>
        <Btn label="🪬 Clear all weapon imbues" danger onClick={() => apply(dev.devClearImbues(state))} />
        <Btn label="🕯️ Clear all blessings" danger onClick={() => apply(dev.devClearBlessings(state))} />
        <Btn label="🕯️ Force bless: lightRune (5 min)" onClick={() => apply(dev.devForceBless(state, "lightRune"))} />
        <Btn label="🕯️ Force bless: voidRune (5 min)" onClick={() => apply(dev.devForceBless(state, "voidRune"))} />
        <div className="dev-row-stats muted" style={{ marginTop: 4 }}>
          Active blessings: {Object.keys(state.run.blessings || {}).length} ·
          Imbued weapons: {Object.keys(state.run.weaponImbues || {}).length}
        </div>
      </Section>

      <Section title="Altar etchings (persistent)">
        <div className="dev-row-stats muted">
          {Object.keys(state.persistent.altarEtchings || {}).length} etching(s)
          {Object.keys(state.persistent.altarEtchings || {}).length > 0 && (
            <>
              <br />
              {Object.entries(state.persistent.altarEtchings || {})
                .map(([id, e]) => `${id}: ${e.label || "(unlabeled)"}`)
                .join(", ")}
            </>
          )}
        </div>
        <Btn
          label="Clear all etchings"
          danger
          onClick={() =>
            apply({
              persistent: { ...state.persistent, altarEtchings: {} },
              msg: "🛠️ Altar etchings wiped.",
            })
          }
        />
      </Section>
    </>
  );
}

function EncountersTab({ state, apply }) {
  const equipped = state.run.equipped || {};
  const weapons = getAllWeapons();
  const inv = state.run.inventory || {};
  // Build a one-line summary of every equipped slot. Empty slots show as
  // "—" so the layout stays consistent.
  const slotLabel = (slot) => {
    const cur = equipped[slot];
    if (!cur) return "—";
    if (cur.twoHandedHeldIn) return `(2h held in ${cur.twoHandedHeldIn})`;
    const def = getEquippable(cur.id);
    return def ? `${def.icon} ${def.name}` : cur.id;
  };

  return (
    <>
      <Section title="Force-fire threats">
        {getAllThreats().map((t) => (
          <Btn key={t.id} small
            label={`${t.icon} ${t.name}${t.kind === "demon" ? " (demon)" : ""}`}
            onClick={() => apply(dev.devForceThreat(state, t.id))} />
        ))}
        <div className="dev-row-stats muted">Bypasses encounter chance and warded gates.</div>
      </Section>

      <Section title="Equipment slots (Phase 1 — #32)">
        <div className="dev-row-stats muted" style={{ marginBottom: 8 }}>
          {SLOTS.HAND_LEFT}: {slotLabel(SLOTS.HAND_LEFT)} ·{" "}
          {SLOTS.HAND_RIGHT}: {slotLabel(SLOTS.HAND_RIGHT)} ·{" "}
          {SLOTS.RANGED}: {slotLabel(SLOTS.RANGED)}
          <br />
          {SLOTS.HEAD}: {slotLabel(SLOTS.HEAD)} ·{" "}
          {SLOTS.CHEST}: {slotLabel(SLOTS.CHEST)} ·{" "}
          {SLOTS.LEGGINGS}: {slotLabel(SLOTS.LEGGINGS)} ·{" "}
          {SLOTS.BOOTS}: {slotLabel(SLOTS.BOOTS)} ·{" "}
          {SLOTS.GLOVES}: {slotLabel(SLOTS.GLOVES)}
          <br />
          rings filled:{" "}
          {(equipped.rings || []).filter(Boolean).length}/10
        </div>
        <Btn label="🔄 Unequip all" danger onClick={() => apply(dev.devUnequipAll(state))} />
        <Btn label="🎁 +1 of every weapon" onClick={() => apply(dev.devGiveAllWeapons(state))} />
      </Section>

      <Section title="Pure weapons — give + equip">
        {weapons.map((w) => {
          const own = inv[w.id] || 0;
          return (
            <div key={w.id} style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
              <Btn small
                label={`${w.icon} ${w.name}${own > 0 ? ` ✓×${own}` : ""}`}
                onClick={() => apply(dev.devGiveItem(state, w.id, 1))}
              />
              {HAND_SLOTS.map((h) => (
                <Btn key={h} small
                  label={`→ ${h}`}
                  onClick={() => apply(dev.devEquip(state, w.id, h))}
                />
              ))}
            </div>
          );
        })}
        <div className="dev-row-stats muted">
          Give first, then equip into a hand. (Pure weapons; dual-use tools
          live in the Content tab and equip the same way once they're in
          inventory.)
        </div>
      </Section>

      <Section title="Quick-equip existing dual-use tools">
        {["stoneAxe", "boneKnife", "stonePickaxe", "fragmentKnife", "bow"].map((id) => {
          const def = getEquippable(id);
          if (!def) return null;
          const own = inv[id] || 0;
          const targetSlot = def.weaponStats?.type === "ranged" ? SLOTS.RANGED : SLOTS.HAND_RIGHT;
          return (
            <Btn key={id} small
              label={`${def.icon} ${def.name}${own > 0 ? "" : " (need to craft)"} → ${targetSlot}`}
              onClick={() => apply(dev.devEquip(state, id, targetSlot))}
            />
          );
        })}
      </Section>

      <Section title="Era 3 arcane weapons (#116) — give + equip">
        <div className="dev-row-stats muted" style={{ marginBottom: 6 }}>
          24 arcane weapons live in tools.js (blacksmithing/woodworking/fletching disciplines). Click to grant one and inspect on Character → Items.
        </div>
        {[
          "fragmentBlade", "shardtoothSabre", "halflightFalchion", "lacunaRapier",
          "echocutShortsword", "soulrendGreatsword",
          "voidsplinterKnife", "mournwhisperDagger", "boneSigilDagger", "censerDagger",
          "echoBow", "spiritsongLongbow", "lightweaveBow", "sigilShortbow", "bonelimbBow",
          "sigilStaff", "memorywoodStaff", "stonewordCrozier", "elementalBranch",
          "lightbearerStaff", "voidstaff",
          "voidcallerWand", "mendweaveWand", "bendwand", "soulflameWand",
          "sigilcasterWand", "echoWand",
          "stonespeakHammer",
        ].map((id) => {
          const def = getEquippable(id);
          if (!def) return null;
          const own = inv[id] || 0;
          const type = def.weaponStats?.type;
          const targetSlot = type === "ranged" ? SLOTS.RANGED
            : type === "two-handed" ? SLOTS.HAND_RIGHT
            : SLOTS.HAND_RIGHT;
          return (
            <div key={id} style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
              <Btn small
                label={`${def.icon} ${def.name}${own > 0 ? ` ✓×${own}` : ""}`}
                onClick={() => apply(dev.devGiveItem(state, id, 1))}
              />
              <Btn small label={`→ ${targetSlot}`}
                onClick={() => apply(dev.devEquip(state, id, targetSlot))}
              />
            </div>
          );
        })}
      </Section>
      <Section title="Pests">
        <Btn label="Trigger bird flock (5 min)" onClick={() => apply(dev.devTriggerPest(state, "birdFlock", 5))} />
        <Btn label="Clear all pests" onClick={() => apply(dev.devClearPests(state))} />
        <div className="dev-row-stats muted">
          Active pests:{" "}
          {Object.keys(state.run.activePests || {}).length === 0
            ? "none" : Object.keys(state.run.activePests).join(", ")}
        </div>
      </Section>
      <Section title="Events">
        <div className="dev-row-stats muted">
          {getAllEvents().length} events defined ·{" "}
          {Object.keys(state.run.events?.cooldowns || {}).length} on cooldown
        </div>
        <Btn label="Clear event cooldowns"
          onClick={() => apply({
            run: { ...state.run, events: { ...(state.run.events || {}), cooldowns: {} } },
            msg: `🛠️ Event cooldowns cleared.`,
          })} />
        <Btn label="Clear active event modal"
          onClick={() => apply({
            run: { ...state.run, activeEvent: null },
            msg: `🛠️ Active event cleared.`,
          })} />
      </Section>
    </>
  );
}

function SystemTab({ state, actions, apply }) {
  const inv = state.run.inventory || {};
  return (
    <>
      <Section title="Time skip">
        <Btn label="Skip 1 minute" onClick={() => apply(dev.devSkipTime(state, 1))} />
        <Btn label="Skip 10 minutes" onClick={() => apply(dev.devSkipTime(state, 10))} />
        <Btn label="Skip 1 hour" onClick={() => apply(dev.devSkipTime(state, 60))} />
        <Btn label="Skip 8 hours" onClick={() => apply(dev.devSkipTime(state, 480))} />
      </Section>
      <Section title="Inventory (debug)">
        <div className="dev-row-stats muted">
          {Object.entries(inv).filter(([, q]) => q > 0).map(([k, q]) => `${k}:${q}`).join(" · ") || "empty"}
        </div>
      </Section>
      <Section title="Reset">
        <Btn label="Wipe run" danger onClick={() => actions.resetRun()} />
        <Btn label="💥 Nuke save (reload)" danger onClick={() => dev.devNuke()} />
      </Section>
    </>
  );
}

// ─── Patrol / Combat-loop / Workers / Coins (#66–#72) ────────────────
function PatrolTab({ state, apply }) {
  const era = computeEra(state);
  const mobsHere = getMobsForEra(Math.max(1, era));
  const allBosses = getAllBosses();
  const unlockedBossIds = new Set(getBossesAvailable(state).map((b) => b.id));
  const mobsDefeated = state.run.mobsDefeated || {};
  const activeLoop = state.run.activeLoop;
  const pile = state.run.activePile || { targetKey: null, drops: {} };
  const pileEntries = Object.entries(pile.drops || {}).filter(([, q]) => q > 0);
  const workerCount = getWorkerCount(state);
  const penalty = getUnarmoredPenalty(state);
  const armored = getArmoredCount(state.run);
  const cooldownMs = getPatrolCooldownMs(state);
  const lastPatrol = state.run.lastPatrolAt || 0;
  const onCooldown = Date.now() - lastPatrol < cooldownMs;
  const cdRemainSec = onCooldown
    ? Math.ceil((cooldownMs - (Date.now() - lastPatrol)) / 1000)
    : 0;

  return (
    <>
      <Section title="Patrol cooldown">
        <div className="dev-row-stats muted">
          Cooldown: {Math.round(cooldownMs / 100) / 10}s ·{" "}
          {onCooldown ? `⏳ ${cdRemainSec}s remaining` : "ready"}
        </div>
        <Btn label="Clear cooldown" onClick={() => apply(dev.devClearPatrolCooldown(state))} />
        <Btn label="🎲 Fire random patrol (era roll)"
          onClick={() => apply(dev.devTriggerPatrol(state, {}))} />
      </Section>

      <Section title={`Force-fight a mob (Era ${era} pool — ${mobsHere.length})`}>
        {mobsHere.length === 0 ? (
          <div className="dev-row-stats muted">No mobs available at this era yet.</div>
        ) : (
          mobsHere.map((m) => {
            const kills = mobsDefeated[m.id] || 0;
            return (
              <Btn key={m.id} small
                label={`${m.icon} ${m.name} · k${kills}`}
                onClick={() => apply(dev.devTriggerPatrol(state, { mobId: m.id }))}
              />
            );
          })
        )}
        <div className="dev-row-stats muted">
          Bypasses cooldown. Resolves passively through systems/combat.js.
        </div>
      </Section>

      <Section title="Bosses (knowledge-gated)">
        <div className="dev-row-stats muted">
          Unlocked: {unlockedBossIds.size}/{allBosses.length} ·{" "}
          {state.run.patrolBossEncounter
            ? `staged: ${state.run.patrolBossEncounter}`
            : "no encounter staged"}
        </div>
        {allBosses.map((b) => {
          const unlocked = unlockedBossIds.has(b.id);
          return (
            <div key={b.id} style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
              <Btn small
                label={`${b.icon || "👑"} ${b.name}${unlocked ? " ✓" : " 🔒"}`}
                onClick={() => apply(dev.devForceBossEncounter(state, b.id))}
              />
              {unlocked && (
                <Btn small
                  label="⚔️ Fight via patrol"
                  onClick={() => apply(dev.devTriggerPatrol(state, { bossId: b.id }))}
                />
              )}
            </div>
          );
        })}
        {state.run.patrolBossEncounter && (
          <Btn label="Clear staged boss encounter" danger
            onClick={() => apply(dev.devClearBossEncounter(state))} />
        )}
      </Section>

      <Section title="Mob reveal thresholds (#70)">
        <div className="dev-row-stats muted">
          Per-mob kills drive the PatrolView reveal: hp@1 · dmg@3 · acc@5 ·
          dmgType@10 · dropNames@1 · dropQty@5 · dropChance@10.
        </div>
        <Btn label="Reveal ALL mobs (kills → 999)"
          onClick={() => apply(dev.devRevealAllMobs(state))} />
        <Btn label="Partial reveal (kills → 3)"
          onClick={() => apply(dev.devPartialRevealMobs(state))} />
        <Btn label="Wipe all kill counts" danger
          onClick={() => apply(dev.devClearMobsDefeated(state))} />
        <div className="dev-row-stats muted" style={{ marginTop: 6 }}>
          Per-mob bump (Era {era} pool):
        </div>
        {mobsHere.map((m) => {
          const kills = mobsDefeated[m.id] || 0;
          return (
            <div key={m.id} style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 2 }}>
              <span className="dev-stat-label" style={{ minWidth: 110 }}>
                {m.icon} {m.name}
              </span>
              <span className="dev-stat-value">{kills}</span>
              <Btn small label="+1" onClick={() =>
                apply(dev.devSetMobsDefeated(state, m.id, kills + 1))} />
              <Btn small label="+5" onClick={() =>
                apply(dev.devSetMobsDefeated(state, m.id, kills + 5))} />
              <Btn small label="max" onClick={() =>
                apply(dev.devSetMobsDefeated(state, m.id, 999))} />
              <Btn small label="0" onClick={() =>
                apply(dev.devSetMobsDefeated(state, m.id, 0))} />
            </div>
          );
        })}
      </Section>

      <Section title="Active loop (#68)">
        <div className="dev-row-stats muted">
          {activeLoop
            ? `▶ ${activeLoop.kind} · ${
                activeLoop.target?.mobId
                  ? `mob:${activeLoop.target.mobId}`
                  : activeLoop.target?.bossId
                  ? `boss:${activeLoop.target.bossId}`
                  : "any"
              } · cycleMs ${activeLoop.cycleMs}`
            : "⏸ none"}
        </div>
        {mobsHere.slice(0, 6).map((m) => (
          <Btn key={m.id} small label={`▶ Loop ${m.icon} ${m.name}`}
            onClick={() => apply(dev.devSetActiveLoop(state, "patrol", { mobId: m.id }))} />
        ))}
        <Btn label="⏹ Clear loop" danger onClick={() => apply(dev.devClearActiveLoop(state))} />
      </Section>

      <Section title="Coins / currency">
        <div className="dev-row-stats muted">
          {Object.keys(COIN_VALUE).map((t) => `${t}:${state.run.inventory?.[t] || 0}`).join(" · ")}
        </div>
        <Btn label="+100 of every coin tier" onClick={() => apply(dev.devGiveCoins(state, null, 100))} />
        <Btn label="+999 of every coin tier" onClick={() => apply(dev.devGiveCoins(state, null, 999))} />
        {Object.keys(COIN_VALUE).map((t) => (
          <Btn key={t} small label={`+25 ${t}`}
            onClick={() => apply(dev.devGiveCoins(state, t, 25))} />
        ))}
      </Section>
    </>
  );
}

export function useDevPanelToggle(settings) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!isDevAvailable(settings)) return;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [settings]);
  return [open, setOpen];
}
