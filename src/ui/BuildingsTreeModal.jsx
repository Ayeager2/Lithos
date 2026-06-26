// Buildings tree modal. Left-to-right SVG tree showing the construction
// dependency chain. Root on the left, branches extend rightward as content
// grows. Same modal/detail pattern as TeachingsTreeModal but oriented
// horizontally — buildings have a clear progression direction (foundation
// → comfort → tools → industry → ...).

import { useState, useMemo } from "react";
import {
  BUILDINGS,
  BUILDING_CATEGORIES,
  getAllBuildings,
  getBuildingTreeBounds,
} from "../content/buildings.js";
import { getResource } from "../content/resources.js";
import { getAutoAssignments } from "../systems/town.js";
import { canBuild, getKnownBuildings } from "../systems/building.js";
import PanZoomSvg from "./PanZoomSvg.jsx";

import { useDraggableModal } from "./useDraggableModal.js";
// Tree canvas dimensions (viewBox coords; CSS scales the SVG).
const W = 820;
const H = 460;
const PAD_X = 90;
const PAD_Y = 60;
const TIER_GAP = 180;
const NODE_R = 32;
const ROOT_R = 36;

// LEFT-TO-RIGHT layout: tier maps to x, col maps to y.
function nodePosition(node, bounds) {
  const innerH = H - 2 * PAD_Y;
  const cols = bounds.cols;
  let y;
  if (cols <= 1) {
    y = H / 2;
  } else {
    y = PAD_Y + (innerH * node.col) / (cols - 1);
  }
  const x = PAD_X + TIER_GAP * node.tier;
  return { x, y };
}

const rootPos = { x: PAD_X, y: H / 2 };

function getNodeState(state, node) {
  if (state.run.built?.[node.id]) return "built";
  const check = canBuild(state, node.id);
  if (check.ok) return "available";
  // Resources are the only missing piece → still browseable as a goal.
  if (check.reason === "Not enough resources.") return "available";
  // Some prerequisite isn't met (research, parent building, rock not woken).
  return "locked";
}

// Affordable === player can build it RIGHT NOW. Used for the green "+"
// badge that nudges "you can take this action."
function isAffordable(state, node) {
  if (state.run.built?.[node.id]) return false;
  return canBuild(state, node.id).ok;
}

export default function BuildingsTreeModal({ state, actions, onClose }) {
  // Tree shows everything past the rock-awaken gate, including locked nodes
  // so the player can plan toward them. See BUGS.md #005.
  const all = useMemo(() => getKnownBuildings(state), [state]);
  const allBounds = useMemo(() => getBuildingTreeBounds(), []);
  // Use full bounds (including hidden buildings) so positions stay stable
  // as more become visible.
  const bounds = allBounds;
  const [selectedId, setSelectedId] = useState(null);

  // Content-bounding-box for the pan/zoom container. The tree extends FAR
  // past the viewBox at scale 1.0 — tier-7 alembic sits at x ≈ 90 + 180*7
  // = 1350 inside an 820-wide viewBox. PanZoomSvg uses this to compute the
  // pan range so every corner of content is reachable. See PanZoomSvg.jsx.
  const contentBounds = useMemo(() => {
    const LABEL_PAD = 28; // node label sits ~20px below the circle
    const ROOT_LABEL_PAD = ROOT_R + 28;
    return {
      minX: rootPos.x - ROOT_R - 10,
      minY: Math.min(PAD_Y - NODE_R, rootPos.y - ROOT_R) - 10,
      maxX: PAD_X + TIER_GAP * bounds.tiers + NODE_R + 40,
      maxY: Math.max(H - PAD_Y + NODE_R + LABEL_PAD, rootPos.y + ROOT_LABEL_PAD),
    };
  }, [bounds]);

  const positions = useMemo(() => {
    const out = {};
    for (const b of all) out[b.id] = nodePosition(b, bounds);
    return out;
  }, [all, bounds]);

  const selected = selectedId ? BUILDINGS[selectedId] : null;
  const selectedState = selected ? getNodeState(state, selected) : null;
  const selectedCheck = selected ? canBuild(state, selected.id) : null;
  const isSelectedBuilt = selected
    ? !!state.run.built?.[selected.id]
    : false;

  // Edges: root → tier-1 (no parents), parent → child for higher tiers.
  const edges = useMemo(() => {
    const out = [];
    for (const b of all) {
      const to = positions[b.id];
      if (!b.parents || b.parents.length === 0) {
        out.push({
          key: `root-${b.id}`,
          x1: rootPos.x,
          y1: rootPos.y,
          x2: to.x,
          y2: to.y,
          built: !!state.run.built?.[b.id],
        });
      } else {
        for (const p of b.parents) {
          const from = positions[p];
          if (!from) continue;
          out.push({
            key: `${p}-${b.id}`,
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y,
            built: !!state.run.built?.[b.id],
          });
        }
      }
    }
    return out;
  }, [all, positions, state.run.built]);

  const { transformStyle, dragHandleProps } = useDraggableModal();

  return (
    <div className="modal-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="presentation">
      <div
        className="modal modal--tree modal--draggable"
        style={transformStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Buildings"
      >
        <header className="modal-header modal-head--drag-handle" onPointerDown={dragHandleProps.onPointerDown} title={dragHandleProps.title}>
          <div>
            <h2>What You've Built</h2>
            <p className="muted modal-subtitle">
              Raise structures from gathered things. Each begets the next.
            </p>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="modal-body modal-body--tree">
          <div className="tree-canvas">
            <PanZoomSvg
              width={W}
              height={H}
              contentBounds={contentBounds}
              className="tree-svg"
              ariaLabel="Buildings tree (drag to pan, wheel to zoom)"
            >
              {/* Edges */}
              {edges.map((e) => (
                <line
                  key={e.key}
                  x1={e.x1}
                  y1={e.y1}
                  x2={e.x2}
                  y2={e.y2}
                  className={`tree-edge ${e.built ? "is-learned" : ""}`}
                />
              ))}

              {/* Root: a small origin marker on the left */}
              <g className="tree-root">
                <circle
                  cx={rootPos.x}
                  cy={rootPos.y}
                  r={ROOT_R}
                  className="tree-root-bg"
                />
                <text
                  x={rootPos.x}
                  y={rootPos.y + 10}
                  className="tree-icon"
                  textAnchor="middle"
                >
                  🌑
                </text>
                <text
                  x={rootPos.x}
                  y={rootPos.y + ROOT_R + 22}
                  className="tree-label"
                  textAnchor="middle"
                >
                  Begin
                </text>
              </g>

              {/* Building nodes */}
              {all.map((b) => {
                const pos = positions[b.id];
                const ns = getNodeState(state, b);
                const affordable = isAffordable(state, b);
                const isSel = selectedId === b.id;
                const cat = b.category || "shelter";
                return (
                  <g
                    key={b.id}
                    className={`tree-node tree-node--${ns} tree-node--cat-${cat} ${
                      affordable ? "is-affordable" : ""
                    } ${isSel ? "is-selected" : ""}`}
                    onClick={() => setSelectedId(b.id)}
                    role="button"
                    tabIndex={0}
                    data-no-pan
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={NODE_R}
                      className="tree-node-bg"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 8}
                      className="tree-icon"
                      textAnchor="middle"
                    >
                      {b.icon}
                    </text>
                    <text
                      x={pos.x}
                      y={pos.y + NODE_R + 20}
                      className="tree-label"
                      textAnchor="middle"
                    >
                      {b.name}
                    </text>
                    {/* Green "+" affordance badge — "you can build this NOW".
                        See BUGS.md #006. */}
                    {affordable && (
                      <g className="tree-node-affordable-mark" aria-hidden="true">
                        <circle
                          cx={pos.x + NODE_R - 4}
                          cy={pos.y - NODE_R + 4}
                          r={10}
                        />
                        <text
                          x={pos.x + NODE_R - 4}
                          y={pos.y - NODE_R + 8}
                          textAnchor="middle"
                        >
                          +
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </PanZoomSvg>
          </div>

          <aside className="tree-detail">
            {!selected ? (
              <div className="tree-detail-empty">
                <p className="muted">
                  Select a structure to see what it costs and what it does.
                </p>
              </div>
            ) : (
              <div className="tree-detail-content">
                <div className="tree-detail-top">
                  <span className="tree-detail-icon">{selected.icon}</span>
                  <div>
                    <h3>{selected.name}</h3>
                    <div className="tree-detail-cat">
                      {BUILDING_CATEGORIES[selected.category]?.name}
                    </div>
                  </div>
                </div>
                <p className="building-desc">{selected.description}</p>
                {selected.effectSummary && (
                  <p className="muted building-effect">
                    {selected.effectSummary}
                  </p>
                )}

                {/* #183 — staffing + live production rate for production buildings. */}
                {isSelectedBuilt && (selected.staffSlots || 0) > 0 && (() => {
                  const auto = getAutoAssignments(state);
                  const assigned = auto[selected.id] || 0;
                  const cap = selected.staffSlots || 0;
                  const recipe = selected.productionRecipe;
                  const ratePerMin = recipe ? (recipe.perVillagerPerMinute || 0) * assigned : 0;
                  let outputLine = "";
                  if (recipe?.output) {
                    const parts = Object.entries(recipe.output).map(([r, q]) => `+${(q * ratePerMin).toFixed(2)} ${r}/min`);
                    outputLine = parts.join(" · ");
                  }
                  let inputLine = "";
                  if (recipe?.input && Object.keys(recipe.input).length > 0) {
                    const parts = Object.entries(recipe.input).map(([r, q]) => `-${(q * ratePerMin).toFixed(2)} ${r}/min`);
                    inputLine = parts.join(" · ");
                  }
                  return (
                    <div className="building-staffing" style={{ marginTop: 6, padding: "6px 8px", background: "rgba(220,154,74,0.07)", border: "1px solid var(--border)", borderRadius: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        👥 Staffed: {assigned}/{cap} villager{cap === 1 ? "" : "s"}
                      </div>
                      {outputLine && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                          {outputLine}
                        </div>
                      )}
                      {inputLine && (
                        <div className="muted" style={{ fontSize: 11 }}>
                          {inputLine}
                        </div>
                      )}
                      {assigned === 0 && cap > 0 && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 2, fontStyle: "italic" }}>
                          No villagers — production stalled. Grow your settlement or assign manually (coming soon).
                        </div>
                      )}
                    </div>
                  );
                })()}

                {isSelectedBuilt ? (
                  <div className="tree-detail-learned">Built.</div>
                ) : (
                  <>
                    <div className="research-cost">
                      {Object.entries(selected.cost).map(([res, qty]) => {
                        const have = state.run.inventory[res] || 0;
                        const enough = have >= qty;
                        const r = getResource(res);
                        return (
                          <span
                            key={res}
                            className={`cost-chip ${
                              enough ? "" : "cost-chip--short"
                            }`}
                          >
                            {r?.icon} {qty} ({have})
                          </span>
                        );
                      })}
                    </div>
                    <button
                      className="btn btn-primary"
                      disabled={!selectedCheck?.ok}
                      onClick={() => actions.build(selected.id)}
                    >
                      Build {selected.name}
                    </button>
                    {!selectedCheck?.ok && (
                      <p className="muted tree-detail-reason">
                        {selectedCheck?.reason}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
