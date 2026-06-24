// Arcane Studies — full-screen path-tree modal (Task #30).
//
// Tabs across the top, one per path the player can study (paths whose
// nodes are all alignment-hidden don't appear as tabs). Each tab renders
// the path's own SVG tree via PanZoomSvg. Click a node → detail panel
// on the right with "Start study" button + cost + state.
//
// Pattern mirrors TeachingsTreeModal / BuildingsTreeModal — bottom-up
// layout, content-aware pan bounds, locked-nodes visible, green "+"
// affordance badge.
//
// See ERA_PLAN.md "Arcane Studies → UI" + content/studies.js.

import { useState, useMemo, useEffect } from "react";
import {
  STUDIES,
  STUDY_PATHS,
  getStudy,
  getStudiesByPath,
} from "../content/studies.js";
import { getResource } from "../content/resources.js";
import {
  canStartStudy,
  getStudyState,
  getKnownStudies,
} from "../systems/studies.js";
import PanZoomSvg from "./PanZoomSvg.jsx";

import { useDraggableModal } from "./useDraggableModal.js";
// Tree canvas dimensions — viewBox coords; CSS scales the SVG.
const W = 600;
const H = 460;
const PAD_X = 70;
const PAD_Y = 70;
const TIER_GAP = 130;
const NODE_R = 32;
const ROOT_R = 36;

// Bottom-up layout per path: tier maps to y (bottom = root, top = deeper),
// col maps to x. Each path has its own tree, so col-density is small.
function nodePosition(node, bounds) {
  const innerW = W - 2 * PAD_X;
  const cols = Math.max(1, bounds.cols);
  let x;
  if (cols <= 1) {
    x = W / 2;
  } else {
    x = PAD_X + (innerW * (node.col || 0)) / (cols - 1);
  }
  const y = H - PAD_Y - TIER_GAP * (node.tier || 1);
  return { x, y };
}

// Path root pos (the altar mark at the bottom of each path tree).
const rootPos = { x: W / 2, y: H - PAD_Y };

function getNodeView(state, node) {
  if (state.run.studiesCompleted?.[node.id]) return "complete";
  if (state.run.studyProgress?.[node.id]) return "in-progress";
  const check = canStartStudy(state, node.id);
  if (check.ok) return "affordable";
  // Distinguish "missing cost only" from "missing prereqs."
  if (
    check.reason === "Not enough offerings." ||
    check.reason === "Already in progress — make it active instead."
  ) {
    return "available";
  }
  return "locked";
}

// Per-path tree bounds — only includes that path's known nodes.
function computePathBounds(state, pathId) {
  const nodes = getStudiesByPath(pathId).filter((n) =>
    getKnownStudies(state).some((kn) => kn.id === n.id)
  );
  let maxTier = 1;
  let maxCol = 0;
  for (const n of nodes) {
    if (n.tier > maxTier) maxTier = n.tier;
    if ((n.col || 0) > maxCol) maxCol = n.col || 0;
  }
  return { tiers: maxTier, cols: maxCol + 1, nodes };
}

export default function StudyTreeModal({ state, actions, onClose }) {
  // ─── Which paths to show as tabs ───────────────────────────────────
  // Hide paths that have ZERO known nodes (covers Voidcall hidden until
  // alignment.evil >= 5).
  const known = useMemo(() => getKnownStudies(state), [state]);
  const knownPaths = useMemo(() => {
    const set = new Set(known.map((n) => n.path));
    return Object.values(STUDY_PATHS).filter((p) => set.has(p.id));
  }, [known]);

  const [activeTab, setActiveTab] = useState(knownPaths[0]?.id || "light");
  const [selectedId, setSelectedId] = useState(null);

  // If the active tab disappears (rare — would only happen if the player
  // somehow lost a path during the modal session), snap back.
  useEffect(() => {
    if (!knownPaths.some((p) => p.id === activeTab)) {
      setActiveTab(knownPaths[0]?.id || "light");
    }
  }, [knownPaths, activeTab]);

  const path = STUDY_PATHS[activeTab];
  const bounds = useMemo(
    () => computePathBounds(state, activeTab),
    [state, activeTab]
  );

  // Position every node in the current path.
  const positions = useMemo(() => {
    const out = {};
    for (const n of bounds.nodes) out[n.id] = nodePosition(n, bounds);
    return out;
  }, [bounds]);

  // Edges: root → tier-1 (no parents), parent → child for higher tiers.
  // For cross-path nodes the parent may not be in THIS path's tree —
  // draw a dotted "off-tree" pip to indicate the dependency.
  const edges = useMemo(() => {
    const out = [];
    for (const n of bounds.nodes) {
      const to = positions[n.id];
      const parents = n.parents || [];
      if (parents.length === 0) {
        out.push({
          key: `root-${n.id}`,
          x1: rootPos.x,
          y1: rootPos.y,
          x2: to.x,
          y2: to.y,
          done: !!state.run.studiesCompleted?.[n.id],
          offPath: false,
        });
      } else {
        for (const p of parents) {
          const pdef = getStudy(p);
          if (!pdef) continue;
          if (pdef.path !== activeTab) {
            // Cross-path parent — draw a short pip from the side of the
            // node showing "this depends on something outside this tree."
            out.push({
              key: `${p}-${n.id}`,
              x1: to.x - 50,
              y1: to.y,
              x2: to.x,
              y2: to.y,
              done: !!state.run.studiesCompleted?.[p],
              offPath: true,
              offPathLabel: pdef.name,
            });
            continue;
          }
          const from = positions[p];
          if (!from) continue;
          out.push({
            key: `${p}-${n.id}`,
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y,
            done: !!state.run.studiesCompleted?.[n.id],
            offPath: false,
          });
        }
      }
    }
    return out;
  }, [bounds.nodes, positions, state.run.studiesCompleted, activeTab]);

  // Content bounds for pan/zoom — see PanZoomSvg.
  const contentBounds = useMemo(() => {
    const LABEL_PAD = 28;
    const topY = H - PAD_Y - TIER_GAP * bounds.tiers - NODE_R - LABEL_PAD;
    return {
      minX: 0,
      minY: topY - 10,
      maxX: W,
      maxY: rootPos.y + ROOT_R + LABEL_PAD,
    };
  }, [bounds.tiers]);

  const selected = selectedId ? STUDIES[selectedId] : null;
  const selectedView = selected ? getNodeView(state, selected) : null;
  const selectedCheck = selected ? canStartStudy(state, selected.id) : null;

  const { transformStyle, dragHandleProps } = useDraggableModal();

  return (
    <div className="modal-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="presentation">
      <div
        className="modal modal--tree modal--draggable"
        style={transformStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Arcane Studies — Path Trees"
      >
        <header className="modal-header modal-head--drag-handle" onPointerDown={dragHandleProps.onPointerDown} title={dragHandleProps.title}>
          <div>
            <h2>The Path Trees</h2>
            <p className="muted modal-subtitle">
              Choose a path. Sit with the lesson. The clock turns over when you
              are still.
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {/* Path tabs */}
        <nav className="study-tab-strip" role="tablist" aria-label="Path">
          {knownPaths.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={activeTab === p.id}
              className={`study-tab ${activeTab === p.id ? "is-active" : ""} study-tab--${p.id}`}
              onClick={() => {
                setActiveTab(p.id);
                setSelectedId(null);
              }}
              title={p.flavor}
            >
              <span className="study-tab-icon" aria-hidden="true">{p.icon}</span>
              <span className="study-tab-label">{p.name}</span>
            </button>
          ))}
        </nav>

        <div className="modal-body modal-body--tree">
          {/* Tree */}
          <div className="tree-canvas">
            <PanZoomSvg
              width={W}
              height={H}
              contentBounds={contentBounds}
              className="tree-svg"
              ariaLabel={`${path?.name} tree (drag to pan, wheel to zoom)`}
            >
              {/* Edges */}
              {edges.map((e) => (
                <g key={e.key}>
                  <line
                    x1={e.x1}
                    y1={e.y1}
                    x2={e.x2}
                    y2={e.y2}
                    className={`tree-edge ${e.done ? "is-learned" : ""} ${e.offPath ? "is-offpath" : ""}`}
                  />
                  {e.offPath && (
                    <text
                      x={e.x1 - 4}
                      y={e.y1 + 4}
                      className="tree-offpath-label"
                      textAnchor="end"
                    >
                      ← {e.offPathLabel}
                    </text>
                  )}
                </g>
              ))}

              {/* Path root (the altar mark for this path) */}
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
                  {path?.icon || "🕯️"}
                </text>
                <text
                  x={rootPos.x}
                  y={rootPos.y + ROOT_R + 22}
                  className="tree-label"
                  textAnchor="middle"
                >
                  Altar
                </text>
              </g>

              {/* Nodes */}
              {bounds.nodes.map((n) => {
                const pos = positions[n.id];
                const view = getNodeView(state, n);
                const affordable = view === "affordable";
                const isSel = selectedId === n.id;
                return (
                  <g
                    key={n.id}
                    className={`tree-node tree-node--${view} ${
                      affordable ? "is-affordable" : ""
                    } ${isSel ? "is-selected" : ""}`}
                    onClick={() => setSelectedId(n.id)}
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
                      {n.icon}
                    </text>
                    <text
                      x={pos.x}
                      y={pos.y + NODE_R + 20}
                      className="tree-label"
                      textAnchor="middle"
                    >
                      {n.name}
                    </text>
                    {affordable && (
                      <g
                        className="tree-node-affordable-mark"
                        aria-hidden="true"
                      >
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
                    {view === "in-progress" && (
                      <g
                        className="tree-node-inprogress-mark"
                        aria-hidden="true"
                      >
                        <circle
                          cx={pos.x - NODE_R + 4}
                          cy={pos.y - NODE_R + 4}
                          r={10}
                        />
                        <text
                          x={pos.x - NODE_R + 4}
                          y={pos.y - NODE_R + 8}
                          textAnchor="middle"
                        >
                          ⏳
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </PanZoomSvg>
          </div>

          {/* Detail panel */}
          <aside className="tree-detail">
            {!selected ? (
              <div className="tree-detail-empty">
                <p className="muted">
                  Select a lesson to see what it costs and what it teaches.
                </p>
                {path && (
                  <p className="muted" style={{ marginTop: "12px", fontStyle: "italic" }}>
                    {path.flavor}
                  </p>
                )}
              </div>
            ) : (
              <div className="tree-detail-content">
                <div className="tree-detail-top">
                  <span className="tree-detail-icon">{selected.icon}</span>
                  <div>
                    <h3>{selected.name}</h3>
                    <div className="tree-detail-cat">
                      {STUDY_PATHS[selected.path]?.name}
                    </div>
                  </div>
                </div>
                <p className="research-whisper">"{selected.whisper}"</p>
                {selected.description && (
                  <p className="muted">{selected.description}</p>
                )}

                {selectedView === "complete" ? (
                  <div className="tree-detail-learned">Learned.</div>
                ) : selectedView === "in-progress" ? (
                  <div className="tree-detail-inprogress">
                    In progress —{" "}
                    {selectedId === state.run.activeStudyId
                      ? "active right now"
                      : "paused"}. Use the Studies tab to manage.
                  </div>
                ) : (
                  <>
                    <div className="research-cost">
                      {Object.entries(selected.cost || {}).map(([res, qty]) => {
                        // Virtual "water" cost — show as generic 💧.
                        const def =
                          res === "water"
                            ? { icon: "💧", name: "Water" }
                            : getResource(res) || { icon: "•", name: res };
                        const have =
                          res === "water"
                            ? (state.run.inventory?.water_stagnant || 0) +
                              (state.run.inventory?.water_muddy || 0) +
                              (state.run.inventory?.water_boiled || 0)
                            : state.run.inventory?.[res] || 0;
                        const enough = have >= qty;
                        return (
                          <span
                            key={res}
                            className={`cost-chip ${enough ? "" : "cost-chip--short"}`}
                          >
                            {def.icon} {qty} ({have})
                          </span>
                        );
                      })}
                    </div>
                    <div className="research-duration muted">
                      Study time: {Math.round((selected.durationMs || 0) / 60000)}{" "}
                      min — accrues while you're idle.
                    </div>
                    <button
                      className="btn btn-primary"
                      disabled={!selectedCheck?.ok}
                      onClick={() => actions.startStudy(selected.id)}
                      title={selectedCheck?.ok ? "" : selectedCheck?.reason}
                    >
                      Start study
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
