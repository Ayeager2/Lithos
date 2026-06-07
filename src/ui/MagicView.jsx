// Magic view (#106) — tabbed page that mirrors the Path Tree order
// from the Studies modal, with the same patrol-card visual language
// used by Patrol / Hunting / Gather.
//
// Tabs (one per Study path + Foundation + Conversions):
//   ✨ Foundation   — Era 3 awakening spells (mendingWord, soothe…)
//   ✨ Light        — Studies-of-the-Light Path
//   🌑 Bend         — Studies-of-the-Bend Path
//   🌿 Elemental    — Studies-of-the-Elemental Path
//   ✒️ Sigilcraft   — Studies-of-Sigilcraft
//   🔔 Memory       — The Path of Memory
//   👂 Stoneword    — Stoneword
//   ⚫ Voidcall     — Apex
//   🪔 Conversions  — Ritual + Spirit trades
//
// Each spell renders as a patrol-card-shaped tile (same as Gather/Hunt
// node cards) so the magic page reads like the rest of the game.

import { useEffect, useState } from "react";
import { getAllSpells } from "../content/spells.js";
import {
  getKnownSpells,
  canCastSpell,
} from "../systems/spells.js";
import { canPerformSurvivalAction } from "../systems/survival.js";
import { SURVIVAL } from "../content/survival.js";
import { STUDY_PATHS } from "../content/studies.js";

function fmtSec(sec) {
  if (sec <= 0) return "ready";
  if (sec < 60) return `${sec}s`;
  return `${Math.ceil(sec / 60)}m`;
}

// ─── Spell → path map.
// Derived from content/studies.js (effect.unlocksSpell). Spells not in
// this map are Foundation (granted by Era-3 research, not a path tree).
// Conversions live in their own bucket because Ritual is synthetic.
const SPELL_PATH = {
  greaterMending: "light",
  cleansingWord:  "light",
  blessing:       "light",

  greaterBend:    "bend",
  curse:          "bend",
  soulflame:      "bend",
  dominate:       "bend",

  echo:           "memory",
  ghostcall:      "memory",

  voidcall:       "voidcall",
};

// Convert any spell into a tab bucket id.
function tabOf(spell) {
  if (spell._ritual) return "conversion";
  // Bend (Era 3 awakening) and bend path's greaterBend share the name.
  // mendingWord/soothe/innerHearth/banish all come from research nodes
  // outside the study trees → Foundation.
  if (spell.id === "bend" || spell.id === "mendingWord" || spell.id === "soothe"
      || spell.id === "innerHearth" || spell.id === "banish") {
    return "foundation";
  }
  return SPELL_PATH[spell.id] || "foundation";
}

// Tab meta — order matches the path tree modal so the player can read
// across both screens.
const TABS = [
  { id: "foundation",  label: "Foundation",  icon: "✨" },
  { id: "light",       label: STUDY_PATHS.light.name,       icon: STUDY_PATHS.light.icon },
  { id: "bend",        label: STUDY_PATHS.bend.name,        icon: STUDY_PATHS.bend.icon },
  { id: "elemental",   label: STUDY_PATHS.elemental.name,   icon: STUDY_PATHS.elemental.icon },
  { id: "sigilcraft",  label: STUDY_PATHS.sigilcraft.name,  icon: STUDY_PATHS.sigilcraft.icon },
  { id: "memory",      label: STUDY_PATHS.memory.name,      icon: STUDY_PATHS.memory.icon },
  { id: "stoneword",   label: STUDY_PATHS.stoneword.name,   icon: STUDY_PATHS.stoneword.icon },
  { id: "voidcall",    label: STUDY_PATHS.voidcall.name,    icon: STUDY_PATHS.voidcall.icon },
  { id: "conversion",  label: "Conversions",  icon: "🪔" },
];

// Synthetic spell-shaped object for Ritual.
function buildRitualSpell(state) {
  const def = SURVIVAL?.actions?.ritual || {};
  const known = !!state.run.researched?.arcaneAwakening;
  return {
    id: "ritual",
    name: "Ritual",
    icon: "🕯️",
    description: "Sit with the shards. The fragments pour into Spirit, the way water finds a riverbed.",
    cost: {
      fragments: def.cost?.fragments || 0,
      spirit: 0,
    },
    waterCost: def.cost?.water || 0,
    effect: { spirit: def.effect?.spirit || 0, sanity: def.effect?.sanity || 0 },
    cooldownMs: 0,
    _ritual: true,
    _known: known,
  };
}

// ─── Spell card — patrol-card-shaped tile for visual parity with
// Patrol / Hunting / Gather pages.
function SpellCard({ state, actions, spell, known, pathId }) {
  const [, force] = useState(0);
  const cdUntil = state.run.spellCooldowns?.[spell.id] || 0;
  const cooling = Date.now() < cdUntil;

  useEffect(() => {
    if (!cooling) return;
    const id = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [cooling]);

  let check;
  let onCast;
  if (spell._ritual) {
    check = canPerformSurvivalAction(state, "ritual");
    onCast = () => actions.ritual?.();
  } else {
    check = canCastSpell(state, spell.id);
    onCast = () => actions.castSpell(spell.id);
  }

  const ready = known && check.ok;
  const remain = Math.max(0, Math.ceil((cdUntil - Date.now()) / 1000));

  const costParts = [];
  if (spell.cost?.fragments) costParts.push({ label: `×${spell.cost.fragments}`, icon: "✨" });
  if (spell.cost?.spirit)    costParts.push({ label: `${spell.cost.spirit}`,     icon: "🌀", suffix: "spirit" });
  if (spell.waterCost)       costParts.push({ label: `×${spell.waterCost}`,      icon: "💧" });

  const pathMeta = pathId && STUDY_PATHS[pathId];
  const cardCls = `patrol-card patrol-card--magic ${known ? "" : "is-locked"} ${cooling ? "is-cooling" : ""}`;
  const ctaLabel = !known ? "Locked" : cooling ? fmtSec(remain) : "Cast";

  return (
    <div
      className={cardCls}
      title={known ? spell.description : "Locked — keep studying."}
    >
      <div className="patrol-card-head">
        <span className="patrol-card-icon" aria-hidden="true">
          {known ? spell.icon : "🔒"}
        </span>
        <div className="patrol-card-title">
          <div className="patrol-card-name">{spell.name}</div>
          <div className="patrol-card-sub">
            {pathMeta ? (
              <span className={`patrol-card-tier patrol-card-tier--path patrol-card-tier--path-${pathId}`}>
                {pathMeta.icon} {pathMeta.name.replace(/^The /, "")}
              </span>
            ) : (
              <span className="patrol-card-tier patrol-card-tier--common">
                {spell._ritual ? "Ritual" : "Foundation"}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="patrol-card-desc muted">
        {known ? spell.description : "Knowledge of this spell has not arrived."}
      </p>

      {costParts.length > 0 && (
        <div className="patrol-card-drops">
          <div className="patrol-card-drops-label muted">Cost</div>
          <ul className="patrol-card-drops-list">
            {costParts.map((c, i) => (
              <li key={i} className="patrol-card-drop">
                <span aria-hidden="true">{c.icon}</span>
                <span className="patrol-card-drop-name">{c.suffix || ""}</span>
                <span className="muted">{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-sm patrol-card-cta-btn"
        onClick={onCast}
        disabled={!ready}
        title={!known ? "Locked" : ready ? "Cast" : (check.reason || "Not ready")}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

export default function MagicView({ state, actions }) {
  const [tab, setTab] = useState("foundation");

  const knownIds = new Set(getKnownSpells(state).map((s) => s.id));
  const allSpells = getAllSpells();
  const ritual = buildRitualSpell(state);
  if (ritual._known) knownIds.add("ritual");

  // Bucket spells per tab (real spells + synthetic ritual).
  const buckets = {};
  for (const t of TABS) buckets[t.id] = [];
  for (const s of allSpells) {
    const b = tabOf(s);
    buckets[b].push(s);
  }
  buckets.conversion.unshift(ritual);

  // Hide tabs with no content — keeps the strip clean as content grows.
  const visibleTabs = TABS.filter((t) => buckets[t.id].length > 0);
  const activeBucket = buckets[tab] && buckets[tab].length > 0 ? tab : visibleTabs[0]?.id;
  const spells = buckets[activeBucket] || [];

  const totalKnown = allSpells.filter((s) => knownIds.has(s.id)).length
                   + (ritual._known ? 1 : 0);
  const totalSpells = allSpells.length + 1;

  return (
    <section className="action-panel action-panel--magic">
      <div className="panel-header">
        <h2>Magic</h2>
        <p className="muted">
          Cast what the Stone taught you. {totalKnown} of {totalSpells} known.
        </p>
      </div>

      <nav className="magic-tabs" role="tablist" aria-label="Spell path">
        {visibleTabs.map((t) => {
          const known = buckets[t.id].filter((s) =>
            s.id === "ritual" ? ritual._known : knownIds.has(s.id)
          ).length;
          const isActive = t.id === activeBucket;
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
              {t.label.replace(/^The /, "")}
              <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                {known}/{buckets[t.id].length}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="patrol-card-grid">
        {spells.map((s) => (
          <SpellCard
            key={s.id}
            state={state}
            actions={actions}
            spell={s}
            known={s.id === "ritual" ? ritual._known : knownIds.has(s.id)}
            pathId={s._ritual ? null : SPELL_PATH[s.id] || null}
          />
        ))}
        {spells.length === 0 && (
          <p className="muted magic-empty">No spells on this path yet.</p>
        )}
      </div>
    </section>
  );
}
tn btn-primary btn-sm patrol-card-cta-btn"
        onClick={onCast}
        disabled={!ready}
        title={!known ? "Locked" : ready ? "Cast" : (check.reason || "Not ready")}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

export default function MagicView({ state, actions }) {
  const [tab, setTab] = useState("foundation");

  const knownIds = new Set(getKnownSpells(state).map((s) => s.id));
  const allSpells = getAllSpells();
  const ritual = buildRitualSpell(state);
  if (ritual._known) knownIds.add("ritual");

  // Bucket spells per tab (real spells + synthetic ritual).
  const buckets = {};
  for (const t of TABS) buckets[t.id] = [];
  for (const s of allSpells) {
    const b = tabOf(s);
    buckets[b].push(s);
  }
  buckets.conversion.unshift(ritual);

  // Hide tabs with no content — keeps the strip clean as content grows.
  const visibleTabs = TABS.filter((t) => buckets[t.id].length > 0);
  const activeBucket = buckets[tab] && buckets[tab].length > 0 ? tab : visibleTabs[0]?.id;
  const spells = buckets[activeBucket] || [];

  const totalKnown = allSpells.filter((s) => knownIds.has(s.id)).length
                   + (ritual._known ? 1 : 0);
  const totalSpells = allSpells.length + 1;

  return (
    <section className="action-panel action-panel--magic">
      <div className="panel-header">
        <h2>Magic</h2>
        <p className="muted">
          Cast what the Stone taught you. {totalKnown} of {totalSpells} known.
        </p>
      </div>

      <nav className="magic-tabs" role="tablist" aria-label="Spell path">
        {visibleTabs.map((t) => {
          const known = buckets[t.id].filter((s) =>
            s.id === "ritual" ? ritual._known : knownIds.has(s.id)
          ).length;
          const isActive = t.id === activeBucket;
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
              {t.label.replace(/^The /, "")}
              <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                {known}/{buckets[t.id].length}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="patrol-card-grid">
        {spells.map((s) => (
          <SpellCard
            key={s.id}
            state={state}
            actions={actions}
            spell={s}
            known={s.id === "ritual" ? ritual._known : knownIds.has(s.id)}
            pathId={s._ritual ? null : SPELL_PATH[s.id] || null}
          />
        ))}
        {spells.length === 0 && (
          <p className="muted magic-empty">No spells on this path yet.</p>
        )}
      </div>
    </section>
  );
}
