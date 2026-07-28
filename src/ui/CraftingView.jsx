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

import { useEffect, useState } from "react";
import { TOOL_CATEGORIES, getToolDiscipline, getProducerForResource } from "../content/tools.js";
import { canCraft, getVisibleTools, getCraftSuccessChance, getCraftDuration, getActiveCraft, getActiveCraftProgress } from "../systems/crafting.js";
import { getResource } from "../content/resources.js";
import { getResearch } from "../content/research.js";
import { getSkillState } from "../systems/skills.js";
import { getSkill } from "../content/skills.js";

// Format ms → human-readable "1m 12s" / "12s".
function fmtMs(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const DISCIPLINES = [
  { id: "survivalcraft", label: "Survival", icon: "🪤" },
  { id: "blacksmithing", label: "Blacksmithing", icon: "🔨" },
  { id: "alchemy", label: "Alchemy", icon: "🧪" },
  { id: "fletching", label: "Fletching", icon: "🪶" },
  { id: "farming", label: "Farming", icon: "🌾" },
  { id: "woodworking", label: "Woodworking", icon: "🪵" },
  { id: "tailoring", label: "Tailoring", icon: "🧵" },
  { id: "runesmithing", label: "Runesmithing", icon: "🪬" },
  { id: "tinker", label: "Tinker", icon: "🪛" },
];

function ToolCard({ state, actions, tool, activeCraft, progress }) {
  const owned = state.run.inventory?.[tool.id] || 0;
  const isOwned = owned > 0;
  const check = canCraft(state, tool.id);
  // #130 — is THIS card the active craft? Other cards get disabled.
  const isThisCrafting = activeCraft?.toolId === tool.id;
  const someoneElseCrafting = !!activeCraft && !isThisCrafting;
  const durationMs = getCraftDuration(state, tool.id);
  const remainingMs = isThisCrafting ? Math.max(0, activeCraft.durationMs - (Date.now() - activeCraft.startedAt)) : 0;
  // #143 — qty selector retired. Crafts loop continuously now.

  const catMeta = TOOL_CATEGORIES[tool.category];
  const cardCls = `patrol-card patrol-card--craft ${isOwned ? "is-owned" : ""} ${isThisCrafting ? "is-active-loop" : ""}`;

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

  // Verb routing (#121) — different disciplines get different action
  // words: Alchemy brews, Runesmithing inscribes, Farming sows; everyone
  // else crafts. Non-stackables (a unique tool/weapon) say "Craft".
  // Multi-craft (#123) — players can stack non-stackables now too.
  const verb = discipline === "alchemy" && tool.isStackable
    ? "Brew"
    : discipline === "runesmithing"
      ? "Inscribe"
      : discipline === "farming" && tool.isStackable
        ? "Sow"
        : discipline === "survivalcraft"
          ? "Lash"
          : "Craft";
  // Drop the (×N) owned-suffix — owned-count lives in the card head/badge,
  // not on the action button.
  const ctaLabel = verb;

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

      {/* Success-chance chip always renders for craftable items (#123) —
          players can craft more even when they already own one. */}
      {!tool.producesResource && (
        <div className={`craft-card-success craft-card-success--${successTone}`}
          title={`Skill: ${discDef?.name || discipline} lvl ${discLevel}. Higher levels lift success — failed crafts waste ~half the materials.`}>
          <span aria-hidden="true">{discDef?.icon || "🛠️"}</span>
          <span className="craft-card-success-skill">
            {discDef?.name || discipline} lvl {discLevel}
          </span>
          <span className="craft-card-success-pct">{successPct}%</span>
        </div>
      )}

      {/* Effects-active badge for owned non-stackables — informational, no
          longer replaces the cost/Craft button. Player can still craft more. */}
      {isOwned && !tool.isStackable && (
        <div className="craft-card-owned-cta">Effects active.</div>
      )}

      {/* Cost + Craft button — ALWAYS shown so players can craft more (#123). */}
      {costEntries.length > 0 && (
        <div className="patrol-card-drops">
          <div className="patrol-card-drops-label muted">Cost</div>
          <ul className="patrol-card-drops-list">
            {costEntries.map(([resId, qty]) => {
              const have = state.run.inventory?.[resId] || 0;
              const enough = have >= qty;
              const r = getResource(resId);
              // #128 — if short AND a recipe produces this resource AND
              // the player isn't already crafting, show a small "+ craft 1"
              // button that auto-fires that recipe.
              const producer = !enough ? getProducerForResource(resId) : null;
              const producerCheck = producer ? canCraft(state, producer.id) : null;
              const canAutoCraft = !!producer && !!producerCheck?.ok && !someoneElseCrafting && !isThisCrafting;
              return (
                <li
                  key={resId}
                  className={`patrol-card-drop ${enough ? "" : "patrol-card-drop--short"}`}
                >
                  <span aria-hidden="true">{r?.icon || ""}</span>
                  <span className="patrol-card-drop-name">{r?.name || resId}</span>
                  <span className="muted">×{qty} ({have})</span>
                  {canAutoCraft && (
                    <button
                      type="button"
                      className="craft-card-plus"
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.craft?.(producer.id, 1);
                      }}
                      title={`Craft 1 ${r?.name || resId} here (${producer.name}).`}
                      aria-label={`Craft 1 ${r?.name || resId}`}
                    >
                      +
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {/* #130 — duration line so the player knows the time cost up-front. */}
      {!isThisCrafting && (
        <p className="muted patrol-card-flavor">
          ⏱ Takes ~{fmtMs(durationMs)} to craft.
        </p>
      )}

      {/* #143/#144 — single CTA: idle "Craft", active "Crafting…", swap
          "Swap to Craft". Progress bar lives as a loopbar at the bottom
          of the card itself, mirroring the gather/patrol pattern. */}
      <div className="craft-card-actions">
        {isThisCrafting ? (
          <button
            type="button"
            className="patrol-card-cta patrol-card-cta--action"
            onClick={() => actions.cancelCraft?.()}
            title={`Click to stop the loop. ${fmtMs(remainingMs)} until next craft.`}
          >
            Crafting…
          </button>
        ) : (
          <>
            <button
              type="button"
              className="patrol-card-cta patrol-card-cta--action"
              onClick={() => actions.craft?.(tool.id)}
              disabled={!check.ok}
              title={
                someoneElseCrafting
                  ? "Starting this will stop the other craft (materials in progress are lost)."
                  : check.ok
                    ? "Craft continuously until materials run out or you stop."
                    : (check.reason || "Not ready")
              }
            >
              {someoneElseCrafting ? `Swap to ${ctaLabel}` : ctaLabel}
            </button>
            {showUse && (
              <button
                type="button"
                className="patrol-card-cta patrol-card-cta--action patrol-card-cta--ghost"
                onClick={() => actions.useTool?.(tool.id)}
                disabled={owned <= 0}
              >
                Use
              </button>
            )}
          </>
        )}
      </div>
      {!check.ok && !isThisCrafting && (
        <p className="muted patrol-card-reveal-hint">{check.reason}</p>
      )}
      {/* #144 — loopbar mirrors gather/patrol cards. Sits at the bottom
          edge of the card and scales horizontally with craft progress. */}
      {isThisCrafting && (
        <span
          className="patrol-card-loopbar"
          style={{ transform: `scaleX(${progress})` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default function CraftingView({ state, actions }) {
  const [tab, setTab] = useState("blacksmithing");
  // #130 — re-render every 250ms while a craft is active so the
  // progress bar animates smoothly. Cheap when nothing's crafting.
  const [, force] = useState(0);
  const activeCraft = getActiveCraft(state.run);
  useEffect(() => {
    if (!activeCraft) return;
    const id = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [activeCraft?.toolId]);
  const progress = getActiveCraftProgress(state.run);

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

      <div className="magic-tab-panel" key={tab}>
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
              activeCraft={activeCraft}
              progress={progress}
            />
          ))}
          {tools.length === 0 && (
            <p className="muted magic-empty">
              No recipes on this discipline yet.
            </p>
                  )}
        </div>
      )}
      </div>
    </section>
  );
}
