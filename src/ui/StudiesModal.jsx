// Studies modal (#76) — Arcane Studies content rendered as an
// off-canvas modal again instead of taking over the center column.
// Wraps StudiesPanel + lets it open the path-tree drilldown modal.
//
// The previous "center view" treatment conflicted with the new role of
// ArcaneView (the casting page). Studies live next to the Altar — you
// open them when you sit down, close them when you go do something
// else. The button is the 🕯️ rail icon in the bottom group.

import StudiesPanel from "./StudiesPanel.jsx";

export default function StudiesModal({ state, actions, onOpenStudyTree, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal modal--studies"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Arcane Studies"
      >
        <header className="modal-header">
          <div>
            <h2>Arcane Studies</h2>
            <p className="muted modal-subtitle">
              Time-cost lessons at the Stone Altar. The clock pauses when you act.
            </p>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </header>
        <div className="modal-body">
          <StudiesPanel
            state={state}
            actions={actions}
            onOpenStudyTree={onOpenStudyTree}
          />
        </div>
      </div>
    </div>
  );
}
