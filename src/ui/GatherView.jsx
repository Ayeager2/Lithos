// Gather view (#97) — unified center page for every gather discipline.
//
// Top tabs: Forage / Mining / Wood / Fishing / Farming / Husbandry / Hunting.
// Each tab is a grid of node cards. Click a card → auto-loop gathers
// that node every cycleMs. Drops accrue into the shared Pile of Goods.
// Hunting tab reuses the prey roster from content/prey.js and fires
// through systems/hunting.js performHunt (kept separate because hunt
// drops combat XP via butchering bonuses).
//
// Replaces the old HuntingView. The standalone "Gather" button in the
// Wasteland panel folded into the Forage tab's Dust Patch / Wild Garden
// nodes. Foraging is now a real skill, not the proof-of-concept it was.

import { useEffect, useState } from "react";
import { RESOURCES } from "../content/resources.js";
import {
  GATHER_DISCIPLINES,
  getGatherNodesForEra,
  getGatherNode,
} from "../content/gatherNodes.js";
import { getAllPrey, getPrey } from "../content/prey.js";
import { getActiveLoop, getLoopProgress } from "../systems/loop.js";
import { getHuntStatus, getHuntCooldownMs, canHunt } from "../systems/hunting.js";
import { getSkillState } from "../systems/skills.js";
import { computeEra } from "../systems/era.js";

const TIER_LABEL = { common: "Common", uncommon: "Uncommon", rare: "Rare", apex: "Apex" };

// "era 1" → "Era One" — flavor reads better in card sublines (#105).
const ERA_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const eraLabel = (n) => `Era ${ERA_WORDS[n] || n}`;

// ─── Generic node card (foraging/mining/wood/fishing/farming/husbandry).
function NodeCard({ node, isActive, loopPct, onClick }) {
  const drops = (node.drops || []).map((d) => {
    const res = RESOURCES[d.resource];
    return {
      id: d.resource,
      icon: res?.icon || "",
      name: res?.name || d.resource,
      qty: Array.isArray(d.qty) ? `${d.qty[0]}–${d.qty[1]}` : String(d.qty || 1),
      pct: Math.round((d.chance ?? 1) * 100),
    };
  });
  return (
    <button
      type="button"
      className={`patrol-card patrol-card--tier-${node.tier || "common"} ${isActive ? "is-active-loop" : ""}`}
      onClick={onClick}
      title={isActive ? "Auto-gathering — click another to swap, or Stop to halt." : `Gather ${node.name}`}
    >
      <div className="patrol-card-head">
        <span className="patrol-card-icon" aria-hidden="true">{node.icon}</span>
        <div className="patrol-card-title">
          <div className="patrol-card-name">{node.name}</div>
          <div className="patrol-card-sub">
            <span className={`patrol-card-tier patrol-card-tier--${node.tier || "common"}`}>
              {TIER_LABEL[node.tier] || "Common"}
            </span>
            <span className="patrol-card-kind muted">· {eraLabel(node.era)}</span>
          </div>
        </div>
      </div>
      <p className="patrol-card-desc muted">{node.description}</p>
      {drops.length > 0 && (
        <div className="patrol-card-drops">
          <div className="patrol-card-drops-label muted">Drops</div>
          <ul className="patrol-card-drops-list">
            {drops.map((d) => (
              <li key={d.id} className="patrol-card-drop">
                <span aria-hidden="true">{d.icon}</span>
                <span className="patrol-card-drop-name">{d.name}</span>
                <span className="muted">×{d.qty} · {d.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="patrol-card-cta">
        {isActive ? "Gathering…" : "Gather"}
      </div>
      {isActive && (
        <span
          className="patrol-card-loopbar"
          style={{ transform: `scaleX(${loopPct})` }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ─── Hunting tab card — reuses the prey roster, fires performHunt.
function PreyCard({ prey, kills, isActive, loopPct, onClick }) {
  const drops = (prey.drops || []).map((d) => {
    const res = RESOURCES[d.resource];
    return {
      id: d.resource,
      icon: res?.icon || "",
      name: res?.name || d.resource,
      qty: Array.isArray(d.qty) ? `${d.qty[0]}–${d.qty[1]}` : String(d.qty || 1),
      pct: Math.round((d.chance ?? 1) * 100),
    };
  });
  return (
    <button
      type="button"
      className={`patrol-card patrol-card--tier-${prey.tier || "common"} ${isActive ? "is-active-loop" : ""}`}
      onClick={onClick}
      title={isActive ? "Auto-hunting — click another to swap." : `Hunt ${prey.name}`}
    >
      <div className="patrol-card-head">
        <span className="patrol-card-icon" aria-hidden="true">{prey.icon}</span>
        <div className="patrol-card-title">
          <div className="patrol-card-name">{prey.name}</div>
          <div className="patrol-card-sub">
            <span className={`patrol-card-tier patrol-card-tier--${prey.tier || "common"}`}>
              {TIER_LABEL[prey.tier] || "Common"}
            </span>
            <span className="patrol-card-kind muted">· prey · {eraLabel(prey.era)}</span>
            {kills > 0 && (
              <span className="patrol-card-kills">· hunted ×{kills}</span>
            )}
          </div>
        </div>
      </div>
      <p className="patrol-card-desc muted">{prey.description}</p>
      {drops.length > 0 && (
        <div className="patrol-card-drops">
          <div className="patrol-card-drops-label muted">Drops</div>
          <ul className="patrol-card-drops-list">
            {drops.map((d) => (
              <li key={d.id} className="patrol-card-drop">
                <span aria-hidden="true">{d.icon}</span>
                <span className="patrol-card-drop-name">{d.name}</span>
                <span className="muted">×{d.qty} · {d.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="patrol-card-cta">
        {isActive ? "Stalking…" : "Hunt"}
      </div>
      {isActive && (
        <span
          className="patrol-card-loopbar"
          style={{ transform: `scaleX(${loopPct})` }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ─── Shared pile of goods (across all disciplines while looping).
function PileOfGoods({ pile }) {
  const entries = Object.entries(pile?.drops || {}).filter(([, q]) => q > 0);
  if (entries.length === 0) {
    return (
      <div className="patrol-pile">
        <h3 className="patrol-pile-title">Pile of Goods</h3>
        <p className="muted">Drops pile up here while you gather.</p>
      </div>
    );
  }
  return (
    <div className="patrol-pile">
      <h3 className="patrol-pile-title">Pile of Goods</h3>
      <ul className="patrol-pile-list">
        {entries.map(([id, qty]) => {
          const res = RESOURCES[id];
          return (
            <li key={id} className="patrol-pile-item" title={res?.description || id}>
              <span aria-hidden="true">{res?.icon || ""}</span>
              <span className="patrol-pile-name">{res?.name || id}</span>
              <span className="patrol-pile-qty">×{qty}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function GatherView({ state, actions }) {
  const [tab, setTab] = useState("foraging");
  const [, force] = useState(0);

  const era = computeEra(state);
  const loop = getActiveLoop(state);
  const isLooping = loop?.kind === "gather" || loop?.kind === "hunt";
  const activeNodeId = loop?.kind === "gather" ? loop.target?.nodeId : null;
  const activePreyId = loop?.kind === "hunt" ? loop.target?.preyId : null;
  const pile = isLooping ? state.run.activePile : null;
  const preyDefeated = state.run.preyDefeated || {};
  const huntStatus = getHuntStatus(state);
  const huntingLvl = getSkillState(state.run, "hunting").level;
  const huntCheck = canHunt(state);

  useEffect(() => {
    if (!isLooping) return;
    const id = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [isLooping]);

  const loopPct = isLooping ? getLoopProgress(loop) : 0;

  const handlePickNode = (nodeId) => {
    if (activeNodeId === nodeId) {
      actions.clearActiveLoop?.();
    } else {
      actions.setActiveLoop?.("gather", { nodeId });
    }
  };
  const handlePickPrey = (preyId) => {
    if (!huntStatus.owned) return;
    if (activePreyId === preyId) {
      actions.clearActiveLoop?.();
    } else {
      actions.setActiveLoop?.("hunt", { preyId });
    }
  };

  const renderTab = () => {
    if (tab === "hunting") {
      if (!huntStatus.owned) {
        return (
          <p className="muted gather-empty">
            You need a hunting tool — a net or a bow. Craft one to begin.
          </p>
        );
      }
      const allPrey = getAllPrey().filter((p) => (p.era || 1) <= era);
      return (
        <>
          <p className="muted gather-tab-lead">
            🏹 Hunting Lv {huntingLvl} · cooldown {Math.round(getHuntCooldownMs(state) / 100) / 10}s
          </p>
          {!huntCheck.ok && (
            <div className="patrol-armor-warn">⚠️ {huntCheck.reason}</div>
          )}
          <div className="patrol-card-grid">
            {allPrey.map((prey) => (
              <PreyCard
                key={prey.id}
                prey={prey}
                kills={preyDefeated[prey.id] || 0}
                isActive={activePreyId === prey.id}
                loopPct={activePreyId === prey.id ? loopPct : 0}
                onClick={() => handlePickPrey(prey.id)}
              />
            ))}
          </div>
        </>
      );
    }

    const nodes = getGatherNodesForEra(tab, era);
    if (nodes.length === 0) {
      return (
        <p className="muted gather-empty">
          Nothing in this discipline yet — progress to a later era to unlock nodes.
        </p>
      );
    }
    const disc = GATHER_DISCIPLINES.find((d) => d.id === tab);
    const skillLvl = disc ? getSkillState(state.run, disc.skill).level : 0;
    return (
      <>
        <p className="muted gather-tab-lead">
          {disc?.icon} {disc?.name} Lv {skillLvl} · {nodes.length} node{nodes.length === 1 ? "" : "s"}
        </p>
        <div className="patrol-card-grid">
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              isActive={activeNodeId === node.id}
              loopPct={activeNodeId === node.id ? loopPct : 0}
              onClick={() => handlePickNode(node.id)}
            />
          ))}
        </div>
      </>
    );
  };

  return (
    <section className="action-panel action-panel--gather">
      <div className="panel-header">
        <h2>Gather</h2>
        <p className="muted">
          Forage, mine, fish, farm, husband, hunt. Each discipline grows its own skill.
        </p>
      </div>

      <nav className="magic-tabs" role="tablist" aria-label="Gather disciplines">
        {GATHER_DISCIPLINES.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={tab === d.id}
            className={`magic-tab ${tab === d.id ? "is-active" : ""}`}
            onClick={() => setTab(d.id)}
            title={d.name}
          >
            <span aria-hidden="true">{d.icon}</span> {d.name}
          </button>
        ))}
      </nav>

      {/* Loop banner (#104) — sits above the Pile so the player sees
          what's running first. Uses the node/prey icon + proper name
          instead of the raw id. Wraps a mini patrol-card aesthetic. */}
      {isLooping && (() => {
        const target = activeNodeId
          ? getGatherNode(activeNodeId)
          : getPrey(activePreyId);
        const verb = loop.kind === "hunt" ? "Auto-hunting" : "Auto-gathering";
        return (
          <div className="gather-loop-banner">
            <span className="gather-loop-icon" aria-hidden="true">
              {target?.icon || "▶"}
            </span>
            <div className="gather-loop-body">
              <div className="gather-loop-verb">
                ▶ {verb}
              </div>
              <div className="gather-loop-name">
                {target?.name || activeNodeId || activePreyId}
                {target?.tier && (
                  <span className="muted"> · {target.tier}</span>
                )}
              </div>
            </div>
            <span
              className="gather-loop-progress"
              style={{ transform: `scaleX(${loopPct})` }}
              aria-hidden="true"
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm gather-loop-stop"
              onClick={() => actions.clearActiveLoop?.()}
            >
              Stop
            </button>
          </div>
        );
      })()}

      <PileOfGoods pile={pile} />

      <div className="magic-tab-body">
        {renderTab()}
      </div>
    </section>
  );
}
