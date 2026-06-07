// Spellbook view (#81) — read-and-cast browse page for unlocked spells.
//
// Sits in the top-rail view switcher between Hunting (🏹) and Crafting
// (🛠️). The bottom-rail Arcane (✨) view still hosts the action layer
// (Ritual + future conversions); this page is the "what magic do I
// know?" reference, with cast buttons inline.
//
// Spells are grouped into three sections:
//   • Combat — magic that hurts (when #82 ships magic combat)
//   • Utility — buffs, wards, banishments
//   • Restoration — heal, soothe, mending
//
// Grouping is inferred from spell.effect shape until spells carry a
// `category` field. Falls back to "Utility" for ambiguous spells.

import { useEffect, useState } from "react";
import { getAllSpells } from "../content/spells.js";
import { canCastSpell, getKnownSpells } from "../systems/spells.js";

function fmtSec(sec) {
  if (sec <= 0) return "ready";
  if (sec < 60) return `${sec}s`;
  return `${Math.ceil(sec / 60)}m`;
}

function inferCategory(spell) {
  const eff = spell.effect || {};
  if (spell.id?.toLowerCase().includes("strike") || spell.appliesStatus?.id === "burn") return "Combat";
  if (eff.hp > 0 || eff.sanity > 0 || eff.happiness > 0 || eff.spirit > 0) return "Restoration";
  if (spell.id?.toLowerCase().includes("banish") || spell.appliesStatus) return "Utility";
  return "Utility";
}

function SpellCard({ state, actions, spell, known }) {
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
  const castable = known && check.ok;
  const costParts = [];
  if (spell.cost?.fragments) costParts.push(`${spell.cost.fragments} ✨`);
  if (spell.cost?.spirit) costParts.push(`${spell.cost.spirit} spirit`);

  return (
    <div
      className={`spellbook-card ${known ? "is-known" : "is-locked"} ${castable ? "is-castable" : ""}`}
      title={known ? spell.description : "Locked — keep studying."}
    >
      <div className="spellbook-card-head">
        <span className="spellbook-card-icon" aria-hidden="true">
          {known ? spell.icon : "🔒"}
        </span>
        <span className="spellbook-card-name">{spell.name}</span>
      </div>
      <p className="spellbook-card-desc muted">
        {known ? spell.description : "Knowledge of this spell has not arrived."}
      </p>
      <p className="spellbook-card-cost muted">
        {costParts.length > 0 ? `Cost: ${costParts.join(" · ")}` : "Cost: —"}
      </p>
      {known && (
        <button
          className="btn btn-primary btn-sm spellbook-cast-btn"
          onClick={() => actions.castSpell(spell.id)}
          disabled={!castable}
          title={castable ? "Cast" : check.reason || "Not ready"}
        >
          {cooling ? fmtSec(remain) : "Cast"}
        </button>
      )}
    </div>
  );
}

export default function SpellbookView({ state, actions }) {
  const known = getKnownSpells(state);
  const allSpells = getAllSpells();
  const knownIds = new Set(known.map((s) => s.id));

  // Group all spells (known + locked) by inferred category.
  const groups = { Combat: [], Restoration: [], Utility: [] };
  for (const s of allSpells) {
    const cat = inferCategory(s);
    groups[cat] = groups[cat] || [];
    groups[cat].push(s);
  }

  return (
    <section className="action-panel action-panel--spellbook">
      <div className="panel-header">
        <h2>Spellbook</h2>
        <p className="muted">
          What the Stone has taught you. {known.length} of {allSpells.length} learned.
        </p>
      </div>

      {Object.entries(groups).map(([cat, spells]) => {
        if (!spells || spells.length === 0) return null;
        const knownInCat = spells.filter((s) => knownIds.has(s.id)).length;
        return (
          <div key={cat} className="spellbook-section">
            <h3 className="spellbook-section-title">
              {cat}{" "}
              <span className="muted spellbook-section-count">
                ({knownInCat}/{spells.length})
              </span>
            </h3>
            <div className="spellbook-grid">
              {spells.map((s) => (
                <SpellCard
                  key={s.id}
                  state={state}
                  actions={actions}
                  spell={s}
                  known={knownIds.has(s.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {known.length === 0 && (
        <p className="muted spellbook-empty-hint">
          Tip: Sit at the Stone Altar (🕯️ Studies) to unlock spells through Arcane Studies.
        </p>
      )}
    </section>
  );
}
