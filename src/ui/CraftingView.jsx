// Crafting view (#48) — sub-tabbed center page replacing the old
// ToolsModal. Tabs map to the six craft disciplines:
//
//   🔨 Blacksmithing  — stone/bronze/iron/arcane edged tools + weapons
//   🧪 Alchemy        — potions, salves, alchemy reagents
//   🪶 Fletching      — bows, arrows, ranged ammo
//   🌾 Farming        — seeds, cultivation tools (placeholder content)
//   🪵 Woodworking    — shafts, hafts, wood tools (digging stick etc.)
//   🧵 Tailoring      — cordage, hide, fabric (net/snare/water skin/talisman)
//
// Each tab shows a patrol-card grid of recipes the player has unlocked
// (via getVisibleTools), with the same card shell used by Patrol /
// Hunting / Gather / Magic. Click a card → craft (or use, if a stackable
// consumable is already owned).

import { useState } from "react";
import { TOOL_CATEGORIES, getToolDiscipline } from "../content/tools.js";
import { canCraft, getVisibleTools, getCraftSuccessChance } from "../systems/crafting.js";
import { getResource } from "../content/resources.js";
import { getResearch } from "../content/research.js";
import { getSkillState } from "../systems/skills.js";
import { getSkill } from "../content/skills.js";

const DISCIPLINES = [
  { id: "blacksmithing", label: "Blacksmithing", icon: "🔨" },
  { id: "alchemy", label: "Alchemy", icon: "🧪" },
  { id: "fletching", label: "Fletching", icon: "🪶" },
  { id: "farming", label: "Farming", icon: "🌾" },
  { id: "woodworking", label: "Woodworking", icon: "🪵" },
  { id: "tailoring", label: "Tailoring", icon: "🧵" },
];

function ToolCard({ state, actions, tool }) {
  const owned = state.run.inventory?.[tool.id] || 0;
  const isOwned = owned > 0;
  const check = canCraft(state, tool.id);

  const catMeta = TOOL_CATEGORIES[tool.category];
  const cardCls = `patrol-card patrol-card--craft ${isOwned ? "is-owned" : ""}`;

  // Skill-based success chance (#113) — surfaces so the player can see
  // why their stone axes keep falling apart at lvl 0 blacksmithing.
  const discipline = getToolDiscipline(tool);
  const discDef = getSkill(discipline);
  const discLevel = getSkillState(state.run, discipline).level;
  const successChance = getCraftSuccessChance(state, tool.id);
  const successPct = Math.round(successChance * 100);
  // Tone the chip red/yellow/green based on the chance.
  const successTone = successChance >= 0.85 ? "ok" : successChance >= 0.55 ? "warn" : "danger";

  const costEntries = Object.entries(tool.cost || {});

  const skillReqs = [];
  if (tool.requires?.skill) {
    for (const [sk, lvl] of Object.entries(tool.requires.skill)) {
      const cur = getSkillState(state.run, sk).level;
      skillReqs.push({ skill: sk, level: lvl, current: cur, met: cur >= lvl });
    }
  }
  const researchReq = tool.requires?.researched
    ? getResearch(tool.requires.researched)
    : null;

  let ctaLabel;
  if (isOwned && !tool.isStackable) ctaLabel = "Crafted";
  else if (tool.isStackable && isOwned) ctaLabel = `Brew (×${owned})`;
  else ctaLabel = tool.isStackable ? "Brew" : "Craft";

  const showUse = isOwned && tool.consumable;

  return (
    <div className={cardCls} title={tool.description}>
      <div className="patrol-card-head">
        <span className="patrol-card-icon" aria-hidden="true">{tool.icon}</span>
        <div className="patrol-card-title">
          <div className="patrol-card-name">{tool.name}</div>
          <div className="patrol-card-sub">
            <span className={`patrol-card-tier patrol-card-tier--${tool.category || "common"}`}>
              {catMeta?.name || tool.category || "Tool"}
            </span>
            {isOwned && !tool.isStackable && (
              <span className="patrol-card-kills">· crafted</span>
            )}
          </div>
        </div>
      </div>

      <p className="patrol-card-desc muted">{tool.description}</p>

      {tool.effectSummary && (
        <p className="patrol-card-desc patrol-card-desc--effect">
          ↳ {tool.effectSummary}
        </p>
      )}

      {/* Durability is a USE-time stat — it ticks down when the tool is
          equipped + the matching action runs (hunt/gather/etc.). The
          Crafting page just makes new copies, so we surface the max as
          a flavor note, not the live bar (which lives on Character →
          Equipment and the relevant gather/hunt loops). */}
      {tool.durability && (
        <p className="muted patrol-card-flavor">
          Holds up for ~{tool.durability.max} {tool.durability.wearsOn === "hunt" ? "hunts" : tool.durability.wearsOn === "waterGather" ? "water gathers" : tool.durability.wearsOn === "build" ? "builds" : "uses"} once equipped.
        </p>
      )}

      {(researchReq || skillReqs.length > 0) && (
        <div className="patrol-card-reqs muted">
          {researchReq && (
            <div className="patrol-card-req">
              Needs research: <strong>{researchReq.name}</strong>
            </div>
          )}
          {skillReqs.map((r) => (
            <div
              key={r.skill}
              className={`patrol-card-req ${r.met ? "" : "patrol-card-req--short"}`}
            >
              Needs {r.skill} lvl {r.level} (you: {r.current})
            </div>
          ))}
        </div>
      )}

      {(!isOwned || tool.isStackable) && !tool.producesResource && (
        <div className={`craft-card-success craft-card-success--${successTone}`}
          title={`Skill: ${discDef?.name || discipline} lvl ${discLevel}. Higher levels lift success — failed crafts waste ~half the materials.`}>
          <span aria-hidden="true">{discDef?.icon || "🛠️"}</span>
          <span className="craft-card-success-skill">
            {discDef?.name || discipline} lvl {discLevel}
          </span>
          <span className="craft-card-success-pct">{successPct}%</span>
        </div>
      )}

      {(!isOwned || tool.isStackable) && (
        <>
          {costEntries.length > 0 && (
            <div className="patrol-card-drops">
              <div className="patrol-card-drops-label muted">Cost</div>
              <ul className="patrol-card-drops-list">
                {costEntries.map(([resId, qty]) => {
                  const have = state.run.inventory?.[resId] || 0;
                  const enough = have >= qty;
                  const r = getResource(resId);
                  return (
                    <li
                      key={resId}
                      className={`patrol-card-drop ${enough ? "" : "patrol-card-drop--short"}`}
                    >
                      <span aria-hidden="true">{r?.icon || ""}</span>
                      <span className="patrol-card-drop-name">{r?.name || resId}</span>
                      <span className="muted">×{qty} ({have})</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="craft-card-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm patrol-card-cta-btn"
              onClick={() => actions.craft?.(tool.id)}
              disabled={!check.ok}
              title={check.ok ? "" : (check.reason || "Not ready")}
            >
              {ctaLabel}
            </button>
            {showUse && (
              <button
                type="button"
                className="btn btn-ghost btn-sm patrol-card-cta-btn"
                onClick={() => actions.useTool?.(tool.id)}
                disabled={owned <= 0}
              >
                Use
              </button>
            )}
          </div>
          {!check.ok && (
            <p className="muted patrol-card-reveal-hint">{check.reason}</p>
          )}
        </>
      )}

      {isOwned && !tool.isStackable && (
        <div className="craft-card-owned-cta">Effects active.</div>
      )}
    </div>
  );
}

export default function CraftingView({ state, actions }) {
  const [tab, setTab] = useState("blacksmithing");

  const visible = getVisibleTools(state);

  const buckets = {};
  for (const d of DISCIPLINES) buckets[d.id] = [];
  for (const t of visible) {
    const d = getToolDiscipline(t);
    if (buckets[d]) buckets[d].push(t);
  }

  const catOrder = (id) => TOOL_CATEGORIES[id]?.order ?? 99;
  for (const d of DISCIPLINES) {
    buckets[d.id].sort((a, b) => {
      const c = catOrder(a.category) - catOrder(b.category);
      if (c !== 0) return c;
      return (a.name || "").localeCompare(b.name || "");
    });
  }

  const visibleTabs = DISCIPLINES.filter((d) => buckets[d.id].length > 0);
  const activeTab = buckets[tab] && buckets[tab].length > 0
    ? tab
    : (visibleTabs[0]?.id || "blacksmithing");
  const tools = buckets[activeTab] || [];

  return (
    <section className="action-panel action-panel--crafting">
      <div className="panel-header">
        <h2>Crafting</h2>
        <p className="muted">
          The shaped, the brewed, the forged. The work of making.
        </p>
      </div>

      <nav className="magic-tabs" role="tablist" aria-label="Craft discipline">
        {visibleTabs.map((t) => {
          const isActive = t.id === activeTab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`magic-tab ${isActive ? "is-active" : ""}`}
              onClick={() => setTab(t.id)}
              title={t.label}
            >
              <span aria-hidden="true" style={{ marginRight: 4 }}>{t.icon}</span>
              {t.label}
              <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                {buckets[t.id].length}
              </span>
            </button>
          );
        })}
      </nav>

      {visible.length === 0 ? (
        <p className="muted magic-empty">
          You haven't learned to make anything yet. Listen for it.
        </p>
      ) : (
        <div className="patrol-card-grid">
          {tools.map((t) => (
            <ToolCard
              key={t.id}
              state={state}
              actions={actions}
              tool={t}
            />
          ))}
          {tools.length === 0 && (
            <p className="muted magic-empty">
              No recipes on this discipline yet.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
