// Skill tree modal for "The Stone's Teachings".
// SVG-based tree with the rock at the bottom and tier 1 nodes radiating up.
// Layout is data-driven: research nodes specify their tier and column, and
// this component just renders. Adding tier 2/3/N is purely a content change.
//
// Click a node to select it; the right-side detail panel shows the whisper
// and a Listen button. Modal closes on outside-click or X.

import { useState, useMemo } from "react";
import {
  RESEARCH,
  getTreeBounds,
} from "../content/research.js";
import { getResource } from "../content/resources.js";
import { canListen, getKnownResearch } from "../systems/research.js";
import PanZoomSvg from "./PanZoomSvg.jsx";

import { useDraggableModal } from "./useDraggableModal.js";
// Tree canvas dimensions (in viewBox coords; CSS scales the SVG).
const W = 600;
const H = 460;
const PAD_X = 70;
const PAD_Y = 60;
const TIER_GAP = 150;
const NODE_R = 30;
const ROOT_R = 36;

// Compute pixel position for a research node, given the tree bounds.
function nodePosition(node, bounds) {
  const innerW = W - 2 * PAD_X;
  const cols = bounds.cols;
  let x;
  if (cols <= 1) {
    x = W / 2;
  } else {
    x = PAD_X + (innerW * node.col) / (cols - 1);
  }
  const y = H - PAD_Y - TIER_GAP * node.tier;
  return { x, y };
}

// Position of the root (rock).
const rootPos = { x: W / 2, y: H - PAD_Y };

function getNodeState(state, node) {
  if (state.run.researched?.[node.id]) return "learned";
  const check = canListen(state, node.id);
  if (check.ok) return "available";
  // Only resources are missing → still browseable as a planning goal.
  if (check.reason === "Not enough offerings.") return "available";
  // Some hard prerequisite isn't met (parents, era, hut, etc.).
  return "locked";
}

// Affordable === player can act on this teaching RIGHT NOW.
function isAffordable(state, node) {
  if (state.run.researched?.[node.id]) return false;
  return canListen(state, node.id).ok;
}

export default function TeachingsTreeModal({ state, actions, onClose }) {
  const bounds = useMemo(() => getTreeBounds(), []);
  // Show every research node the player should know about. Alignment-gated
  // nodes (banish / bend) stay hidden until the silent counter tips — see
  // getKnownResearch in systems/research.js. Era-gated and prereq-locked
  // nodes render here as `locked`.
  const all = useMemo(() => getKnownResearch(state), [state]);
  const [selectedId, setSelectedId] = useState(null);

  // Content bounding box for pan/zoom. The tree grows UPWARD from the rock
  // (root at y = H - PAD_Y), so tier-8 spells sit at y ≈ 400 - 150*8 = -800,
  // well above the viewBox top. PanZoomSvg uses this so users can drag up
  // to reach tier-4+ nodes. See PanZoomSvg.jsx.
  const contentBounds = useMemo(() => {
    const LABEL_PAD = 28;
    const topY = H - PAD_Y - TIER_GAP * bounds.tiers - NODE_R - LABEL_PAD;
    return {
      minX: 0,
      minY: topY - 10,
      maxX: W,
      maxY: rootPos.y + ROOT_R + LABEL_PAD,
    };
  }, [bounds]);

  const positions = useMemo(() => {
    const out = {};
    for (const r of all) out[r.id] = nodePosition(r, bounds);
    return out;
  }, [all, bounds]);

  const selected = selectedId ? RESEARCH[selectedId] : null;
  const selectedState = selected ? getNodeState(state, selected) : null;
  const selectedCheck = selected ? canListen(state, selected.id) : null;

  // Edges: root → tier-1 roots, parent → child for higher tiers.
  const edges = useMemo(() => {
    const out = [];
    for (const r of all) {
      const to = positions[r.id];
      if (!r.parents || r.parents.length === 0) {
        out.push({
          key: `root-${r.id}`,
          x1: rootPos.x,
          y1: rootPos.y,
          x2: to.x,
          y2: to.y,
          learned: !!state.run.researched?.[r.id],
        });
      } else {
        for (const p of r.parents) {
          const from = positions[p];
          if (!from) continue;
          out.push({
            key: `${p}-${r.id}`,
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y,
            learned: !!state.run.researched?.[r.id],
          });
        }
      }
    }
    return out;
  }, [all, positions, state.run.researched]);

  const { transformStyle, dragHandleProps } = useDraggableModal();

  return (
    <div className="modal-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="presentation">
      <div
        className="modal modal--tree modal--draggable"
        style={transformStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="The Stone's Teachings"
      >
        <header className="modal-header modal-head--drag-handle" onPointerDown={dragHandleProps.onPointerDown} title={dragHandleProps.title}>
          <div>
            <h2>The Stone's Teachings</h2>
            <p className="muted modal-subtitle">
              The stone whispers. Listen, and offer what it asks for.
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
              ariaLabel="Teachings tree (drag to pan, wheel to zoom)"
            >
              {/* Edges */}
              {edges.map((e) => (
                <line
                  key={e.key}
                  x1={e.x1}
                  y1={e.y1}
                  x2={e.x2}
                  y2={e.y2}
                  className={`tree-edge ${e.learned ? "is-learned" : ""}`}
                />
              ))}

              {/* Root (the rock) */}
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
                  👁️
                </text>
                <text
                  x={rootPos.x}
                  y={rootPos.y + ROOT_R + 22}
                  className="tree-label"
                  textAnchor="middle"
                >
                  The Stone
                </text>
              </g>

              {/* Research nodes */}
              {all.map((r) => {
                const pos = positions[r.id];
                const ns = getNodeState(state, r);
                const affordable = isAffordable(state, r);
                const isSel = selectedId === r.id;
                return (
                  <g
                    key={r.id}
                    className={`tree-node tree-node--${ns} ${
                      affordable ? "is-affordable" : ""
                    } ${isSel ? "is-selected" : ""}`}
                    onClick={() => setSelectedId(r.id)}
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
                      {r.icon}
                    </text>
                    <text
                      x={pos.x}
                      y={pos.y + NODE_R + 20}
                      className="tree-label"
                      textAnchor="middle"
                    >
                      {r.name}
                    </text>
                    {/* Green "+" affordance badge — "you can listen NOW".
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
                  Select a teaching to hear the stone's whisper.
                </p>
              </div>
            ) : (
              <div className="tree-detail-content">
                <div className="tree-detail-top">
                  <span className="tree-detail-icon">{selected.icon}</span>
                  <h3>{selected.name}</h3>
                </div>
                <p className="research-whisper">"{selected.whisper}"</p>

                {selectedState === "learned" ? (
                  <div className="tree-detail-learned">Learned.</div>
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
                      disabled={!selectedCheck.ok}
                      onClick={() => actions.research(selected.id)}
                      title={selectedCheck.ok ? "" : selectedCheck.reason}
                    >
                      Listen
                    </button>
                    {!selectedCheck.ok && (
                      <p className="muted tree-detail-reason">
                        {selectedCheck.reason}
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
