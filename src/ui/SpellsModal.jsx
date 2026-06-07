// Spells modal — list known spells, show cost + cooldown, cast on click.
// Style mirrors the Tools modal but flatter — spells are quick-cast,
// not crafted, so the detail pane is replaced with an inline Cast button
// inside each row.
//
// ArcaneView (#65 + #75) uses this file's `SpellsBody` export to render
// the magic-casting page in the center column. SpellsBody adds a
// "Spirit conversions" section above the spell list — Ritual (fragments
// → Spirit) lives here, with room for future conversion-style actions
// (fragment grinder, sanity well, etc.). Ritual no longer lives in the
// bottom ActionStrip.

import { useEffect, useState } from "react";
import { getKnownSpells, canCastSpell } from "../systems/spells.js";
import { canPerformSurvivalAction } from "../systems/survival.js";
import { SURVIVAL } from "../content/survival.js";

function fmtSec(sec) {
  if (sec <= 0) return "ready";
  if (sec < 60) return `${sec}s`;
  return `${Math.ceil(sec / 60)}m`;
}

function SpellRow({ state, actions, spell }) {
  const [, force] = useState(0);
  const cdUntil = state.run.spellCooldowns?.[spell.id] || 0;
  const cooling = Date.now() < cdUntil;

  useEffect(() => {
    if (!cooling) return;
    const id = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [cooling]);

  const check = canCastSpell(state, spell.id);
  const remain = Math.max(0, Math.ceil((cdUntil - Date.now()) / 1000));
  const ready = check.ok;

  const costParts = [];
  if (spell.cost?.fragments) costParts.push(`${spell.cost.fragments} ✨`);
  if (spell.cost?.spirit) costParts.push(`${spell.cost.spirit} spirit`);

  return (
    <li className={`spell-row ${ready ? "is-ready" : "is-blocked"}`}>
      <div className="spell-row-head">
        <span className="spell-row-icon" aria-hidden="true">{spell.icon}</span>
        <span className="spell-row-name">{spell.name}</span>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => actions.castSpell(spell.id)}
          disabled={!ready}
          title={ready ? "Cast" : check.reason}
        >
          {cooling ? fmtSec(remain) : "Cast"}
        </button>
      </div>
      <p className="spell-row-desc muted">{spell.description}</p>
      <p className="spell-row-cost muted">Cost: {costParts.join(" · ")}</p>
    </li>
  );
}

function SpellsContent({ state, actions }) {
  const known = getKnownSpells(state);
  if (known.length === 0) {
    return <p className="muted">No spells known.</p>;
  }
  return (
    <ul className="spell-list">
      {known.map((s) => (
        <SpellRow key={s.id} state={state} actions={actions} spell={s} />
      ))}
    </ul>
  );
}

// Spirit conversions (#75) — Ritual now lives here. Future conversion-
// style actions land in this section too. Hidden until the player has
// researched arcaneAwakening (the gate for the Ritual itself).
function SpiritConversions({ state, actions }) {
  const ritualKnown = !!state.run.researched?.arcaneAwakening;
  if (!ritualKnown) return null;

  const ritualCheck = canPerformSurvivalAction(state, "ritual");
  const ritualDef = SURVIVAL?.actions?.ritual || {};
  const costParts = [];
  if (ritualDef.cost?.fragments) costParts.push(`${ritualDef.cost.fragments} ✨ fragments`);
  if (ritualDef.cost?.water) costParts.push(`${ritualDef.cost.water} 💧 water`);
  const effParts = [];
  if (ritualDef.effect?.spirit) effParts.push(`+${ritualDef.effect.spirit} spirit`);
  if (ritualDef.effect?.sanity) effParts.push(`+${ritualDef.effect.sanity} sanity`);

  return (
    <div className="arcane-conversions">
      <h3 className="arcane-section-title">Spirit conversions</h3>
      <p className="muted arcane-section-lead">
        Turn what you have into what you need.
      </p>
      <ul className="conversion-list">
        <li className={`conversion-row ${ritualCheck.ok ? "is-ready" : "is-blocked"}`}>
          <div className="conversion-row-head">
            <span className="conversion-row-icon" aria-hidden="true">🕯️</span>
            <span className="conversion-row-name">Ritual</span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={actions.ritual}
              disabled={!ritualCheck.ok}
              title={ritualCheck.ok ? "Perform the Ritual" : ritualCheck.reason}
            >
              Perform
            </button>
          </div>
          <p className="conversion-row-desc muted">
            Sit with the shards. The fragments pour into Spirit, the way water finds a riverbed.
          </p>
          <p className="conversion-row-cost muted">
            Cost: {costParts.join(" · ")} · Gain: {effParts.join(" · ")}
          </p>
        </li>
      </ul>
    </div>
  );
}

// Reusable inline body — used by ArcaneView in the center column.
export function SpellsBody({ state, actions }) {
  return (
    <section className="action-panel action-panel--arcane">
      <div className="panel-header">
        <h2>Arcane</h2>
        <p className="muted">
          Cast what the Stone taught you. Convert fragments to Spirit when the well runs low.
        </p>
      </div>

      <SpiritConversions state={state} actions={actions} />

      <div className="arcane-spells-section">
        <h3 className="arcane-section-title">Spells</h3>
        <p className="muted arcane-section-lead">Cast costs Fragments and Spirit.</p>
        <SpellsContent state={state} actions={actions} />
      </div>
    </section>
  );
}

export default function SpellsModal({ state, actions, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal modal--spells"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Spells"
      >
        <header className="modal-header">
          <h2>Spells</h2>
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
          <SpellsContent state={state} actions={actions} />
        </div>
      </div>
    </div>
  );
}
