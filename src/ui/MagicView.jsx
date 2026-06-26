// Magic view (#106) — tabbed page that mirrors the Path Tree order
// from the Studies modal, with the same patrol-card visual language
// used by Patrol / Hunting / Gather. Adds Runesmithing tab (#135).

import { useEffect, useState } from "react";
import { getAllSpells } from "../content/spells.js";
import {
  getKnownSpells,
  canCastSpell,
} from "../systems/spells.js";
import { canPerformSurvivalAction } from "../systems/survival.js";
import { SURVIVAL } from "../content/survival.js";
import { STUDY_PATHS } from "../content/studies.js";
import { getAllResources } from "../content/resources.js";
import { getAllWeapons } from "../content/weapons.js";
import { getAllTools } from "../content/tools.js";
import {
  getWeaponImbues,
  canImbueWeapon,
  getMaxEnchantSlots,
  getEnchantSlotUsage,
  canBless,
  getActiveBlessings,
} from "../systems/runesmithing.js";
import {
  getAllEnchantments,
} from "../content/enchantments.js";
import {
  canEnchant,
  getWeaponEnchantments,
  getMaxEnchantmentSlots,
  getEnchantmentUsage,
} from "../systems/enchantments.js";

function fmtSec(sec) {
  if (sec <= 0) return "ready";
  if (sec < 60) return `${sec}s`;
  return `${Math.ceil(sec / 60)}m`;
}

const SPELL_PATH = {
  greaterMending: "light",
  cleansingWord: "light",
  blessing: "light",
  greaterBend: "bend",
  curse: "bend",
  soulflame: "bend",
  dominate: "bend",
  echo: "memory",
  ghostcall: "memory",
  voidcall: "voidcall",
};

function tabOf(spell) {
  if (spell._ritual) return "conversion";
  if (spell.id === "bend" || spell.id === "mendingWord" || spell.id === "soothe"
    || spell.id === "innerHearth" || spell.id === "banish") {
    return "foundation";
  }
  return SPELL_PATH[spell.id] || "foundation";
}

const TABS = [
  { id: "foundation", label: "Foundation", icon: "✨" },
  { id: "light", label: STUDY_PATHS.light.name, icon: STUDY_PATHS.light.icon },
  { id: "bend", label: STUDY_PATHS.bend.name, icon: STUDY_PATHS.bend.icon },
  { id: "elemental", label: STUDY_PATHS.elemental.name, icon: STUDY_PATHS.elemental.icon },
  { id: "sigilcraft", label: STUDY_PATHS.sigilcraft.name, icon: STUDY_PATHS.sigilcraft.icon },
  { id: "memory", label: STUDY_PATHS.memory.name, icon: STUDY_PATHS.memory.icon },
  { id: "stoneword", label: STUDY_PATHS.stoneword.name, icon: STUDY_PATHS.stoneword.icon },
  { id: "voidcall", label: STUDY_PATHS.voidcall.name, icon: STUDY_PATHS.voidcall.icon },
  { id: "runesmithing", label: "Runesmithing", icon: "🪬" },
  { id: "conversion", label: "Conversions", icon: "🪔" },
];

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

// ─── Runesmithing UI (#135) ──────────────────────────────────────────
function getAllRunes() {
  const runes = getAllResources().filter((r) => !!r.imbueEffect);
  // Sort by rarity ladder (#136) so the Apply list reads common → god.
  return runes.sort((a, b) => {
    const ai = RARITY_ORDER.indexOf(a.rarity || "uncommon");
    const bi = RARITY_ORDER.indexOf(b.rarity || "uncommon");
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

function getOwnedWeapons(state) {
  const inv = state.run.inventory || {};
  const out = [];
  const seen = new Set();
  for (const w of getAllWeapons()) {
    if (!w.weaponStats) continue;
    if (!(inv[w.id] > 0)) continue;
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    out.push(w);
  }
  for (const t of getAllTools()) {
    if (!t.weaponStats) continue;
    if (!(inv[t.id] > 0)) continue;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out;
}

// Rarity ladder used for sort + label coloring (#136).
const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "god"];
const RARITY_LABEL = {
  common: "Common", uncommon: "Uncommon", rare: "Rare",
  epic: "Epic", legendary: "Legendary", mythic: "Mythic", god: "GOD",
};

function ImbuedRow({ weapon, rune, effect, onRemove }) {
  const rarity = rune.rarity || "uncommon";
  return (
    <li className="patrol-card-drop" title={effect.label || rune.name}>
      <span aria-hidden="true">{rune.icon}</span>
      <span className="patrol-card-drop-name">{rune.name.replace(" Rune", "")}</span>
      <span className={`patrol-card-tier patrol-card-tier--${rarity}`} style={{ marginRight: 4 }}>
        {RARITY_LABEL[rarity]}
      </span>
      <span className="muted" style={{ fontSize: 11 }}>{effect.label}</span>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ marginLeft: "auto", padding: "2px 6px" }}
        onClick={onRemove}
        title="Remove imbue"
        aria-label={`Remove ${rune.name} from ${weapon.name}`}
      >
        ×
      </button>
    </li>
  );
}

function WeaponImbueCard({ state, actions, weapon, runes }) {
  const inv = state.run.inventory || {};
  const imbues = getWeaponImbues(state, weapon.id);
  const ownedQty = inv[weapon.id] || 0;
  const maxSlots = getMaxEnchantSlots(weapon);
  const usedSlots = getEnchantSlotUsage(state, weapon.id);
  // Render `●` for filled slots, `○` for empty (#138).
  const slotPips = "●".repeat(usedSlots) + "○".repeat(Math.max(0, maxSlots - usedSlots));

  return (
    <div className="patrol-card patrol-card--magic">
      <div className="patrol-card-head">
        <span className="patrol-card-icon" aria-hidden="true">{weapon.icon || "⚔️"}</span>
        <div className="patrol-card-title">
          <div className="patrol-card-name">{weapon.name}</div>
          <div className="patrol-card-sub">
            <span className="patrol-card-tier patrol-card-tier--common">
              × {ownedQty} owned
            </span>
            <span
              className="patrol-card-tier patrol-card-tier--common"
              title={`Enchant slots: ${usedSlots} bound of ${maxSlots} (weapon category: ${weapon.category || "?"})`}
              style={{ marginLeft: 4 }}
            >
              🪬 {usedSlots}/{maxSlots} {slotPips}
            </span>
          </div>
        </div>
      </div>

      <div className="patrol-card-drops">
        <div className="patrol-card-drops-label muted">Imbues</div>
        {imbues.length === 0 ? (
          <p className="muted" style={{ fontSize: 12, margin: "4px 0" }}>
            No runes bound. The metal sleeps.
          </p>
        ) : (
          <ul className="patrol-card-drops-list">
            {imbues.map(({ runeId, rune, effect }) => (
              <ImbuedRow
                key={runeId}
                weapon={weapon}
                rune={rune}
                effect={effect}
                onRemove={() => actions.removeImbue(weapon.id, runeId)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="patrol-card-drops">
        <div className="patrol-card-drops-label muted">Apply rune</div>
        <ul className="patrol-card-drops-list">
          {runes.map((rune) => {
            const owned = inv[rune.id] || 0;
            const check = canImbueWeapon(state, weapon.id, rune.id);
            const rarity = rune.rarity || "uncommon";
            return (
              <li key={rune.id} className="patrol-card-drop">
                <span aria-hidden="true">{rune.icon}</span>
                <span className="patrol-card-drop-name">
                  {rune.name.replace(" Rune", "")}
                  <span className="muted" style={{ marginLeft: 4, fontSize: 11 }}>× {owned}</span>
                </span>
                <span
                  className={`patrol-card-tier patrol-card-tier--${rarity}`}
                  style={{ marginLeft: 4 }}
                  title={rune.imbueEffect?.label || ""}
                >
                  {RARITY_LABEL[rarity]}
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginLeft: "auto", padding: "2px 8px" }}
                  disabled={!check.ok || owned <= 0}
                  title={check.ok ? rune.imbueEffect?.label || "Bind" : check.reason}
                  onClick={() => actions.imbueWeapon(weapon.id, rune.id)}
                >
                  Bind
                </button>
                <BlessButton state={state} actions={actions} rune={rune} />
              </li>
            );
          })}
        </ul>
      </div>

      <EnchantSection state={state} actions={actions} weapon={weapon} />
    </div>
  );
}

// ─── Enchant section (#170 / #37) ─────────────────────
// Permanent, study-gated marks. Distinct slot budget from rune imbues.
function EnchantSection({ state, actions, weapon }) {
  const bound = getWeaponEnchantments(state, weapon.id);
  const max = getMaxEnchantmentSlots(weapon);
  const used = getEnchantmentUsage(state, weapon.id);
  const pips = "●".repeat(used) + "○".repeat(Math.max(0, max - used));

  const all = getAllEnchantments();
  const visible = all.filter((e) => !!state.run.studiesCompleted?.[e.requires?.studied]);

  return (
    <>
      <div className="patrol-card-drops">
        <div
          className="patrol-card-drops-label muted"
          title={`Enchant slots: ${used} of ${max}. Permanent — cannot be removed.`}
        >
          Enchantments  <span className="muted">{used}/{max} {pips}</span>
        </div>
        {bound.length === 0 ? (
          <p className="muted" style={{ fontSize: 12, margin: "4px 0" }}>
            No marks etched. The metal remembers nothing yet.
          </p>
        ) : (
          <ul className="patrol-card-drops-list">
            {bound.map(({ id, def, effect }) => (
              <li key={id} className="patrol-card-drop" title={def.description}>
                <span aria-hidden="true">{def.icon}</span>
                <span className="patrol-card-drop-name">{def.name}</span>
                <span className="patrol-card-tier patrol-card-tier--legendary" style={{ marginRight: 4 }}>
                  Permanent
                </span>
                <span className="muted" style={{ fontSize: 11 }}>{effect.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {visible.length > 0 && used < max && (
        <div className="patrol-card-drops">
          <div className="patrol-card-drops-label muted">Etch enchantment (permanent)</div>
          <ul className="patrol-card-drops-list">
            {visible.map((e) => {
              const check = canEnchant(state, weapon.id, e.id);
              return (
                <li key={e.id} className="patrol-card-drop" title={e.description}>
                  <span aria-hidden="true">{e.icon}</span>
                  <span className="patrol-card-drop-name">
                    {e.name}
                    <span className="muted" style={{ marginLeft: 4, fontSize: 11 }}>
                      ✨{e.cost.fragments} · 🌀{e.cost.spirit}
                    </span>
                  </span>
                  <span className="muted" style={{ marginLeft: 4, fontSize: 11 }}>
                    {e.effect.label}
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginLeft: "auto", padding: "2px 8px" }}
                    disabled={!check.ok}
                    title={check.ok ? `Etch ${e.name} — PERMANENT` : check.reason}
                    onClick={() => {
                      if (!confirm(`Etch ${e.name} onto ${weapon.name}? This cannot be undone.`)) return;
                      actions.enchantWeapon(weapon.id, e.id);
                    }}
                  >
                    Etch
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

// #151 — small button in the Apply-rune list that fires the Bless action.
function BlessButton({ state, actions, rune }) {
  const check = canBless(state, rune.id);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      style={{ marginLeft: 4, padding: "2px 6px" }}
      disabled={!check.ok}
      title={check.ok
        ? `Burn 1 ${rune.name} + 10 Spirit for a 5-minute blessing. ${rune.imbueEffect?.label || ""}`
        : check.reason}
      onClick={() => actions.blessRune?.(rune.id)}
    >
      🕯️ Bless
    </button>
  );
}

// Active blessings strip — shows what's currently burning and how long left.
function BlessingsList({ state }) {
  const live = getActiveBlessings(state);
  const ids = Object.keys(live);
  if (ids.length === 0) return null;
  const now = Date.now();
  return (
    <div className="patrol-card patrol-card--magic" style={{ marginTop: 12 }}>
      <div className="patrol-card-head">
        <span className="patrol-card-icon" aria-hidden="true">🕯️</span>
        <div className="patrol-card-title">
          <div className="patrol-card-name">Active Blessings</div>
          <div className="patrol-card-sub muted">
            Burn-rune buffs · {ids.length} active
          </div>
        </div>
      </div>
      <ul className="patrol-card-drops-list">
        {ids.map((runeId) => {
          const r = getResource(runeId);
          const remainMs = Math.max(0, live[runeId].expiresAt - now);
          const mm = Math.floor(remainMs / 60000);
          const ss = Math.floor((remainMs % 60000) / 1000);
          return (
            <li key={runeId} className="patrol-card-drop">
              <span aria-hidden="true">{r?.icon || "🪬"}</span>
              <span className="patrol-card-drop-name">
                {(r?.name || runeId).replace(" Rune", "")}
                <span className="muted" style={{ marginLeft: 4, fontSize: 11 }}>
                  {r?.imbueEffect?.label || ""}
                </span>
              </span>
              <span className="muted" style={{ marginLeft: "auto" }}>
                {mm}m {ss.toString().padStart(2, "0")}s
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RunesmithingPanel({ state, actions }) {
  const weapons = getOwnedWeapons(state);
  const runes = getAllRunes();
  const ownedRunes = runes.filter((r) => (state.run.inventory?.[r.id] || 0) > 0);

  if (ownedRunes.length === 0 && weapons.length === 0) {
    return (
      <p className="muted magic-empty">
        Craft a rune in the Runesmithing forge first, then bring something
        sharp here.
      </p>
    );
  }
  if (weapons.length === 0) {
    return (
      <p className="muted magic-empty">
        You hold runes but no weapon to bind them to. Forge a blade first.
      </p>
    );
  }

  return (
    <>
      <BlessingsList state={state} actions={actions} />
      <div className="patrol-card-grid">
        {weapons.map((w) => (
          <WeaponImbueCard
            key={w.id}
            state={state}
            actions={actions}
            weapon={w}
            runes={runes}
          />
        ))}
      </div>
    </>
  );
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
  if (spell.cost?.spirit) costParts.push({ label: `${spell.cost.spirit}`, icon: "🌀", suffix: "spirit" });
  if (spell.waterCost) costParts.push({ label: `×${spell.waterCost}`, icon: "💧" });

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

  const buckets = {};
  for (const t of TABS) buckets[t.id] = [];
  for (const s of allSpells) {
    const b = tabOf(s);
    buckets[b].push(s);
  }
  buckets.conversion.unshift(ritual);

  const runesmithingActive =
    (state.run.skills?.runesmithing?.level || 0) > 0 ||
    getAllRunes().some((r) => (state.run.inventory?.[r.id] || 0) > 0);

  const visibleTabs = TABS.filter((t) => {
    if (t.id === "runesmithing") return runesmithingActive;
    return (buckets[t.id] || []).length > 0;
  });
  let activeBucket;
  if (tab === "runesmithing" && runesmithingActive) {
    activeBucket = "runesmithing";
  } else if (buckets[tab] && buckets[tab].length > 0) {
    activeBucket = tab;
  } else {
    activeBucket = visibleTabs[0]?.id;
  }
  const spells = activeBucket === "runesmithing" ? [] : (buckets[activeBucket] || []);

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
          const bucket = buckets[t.id] || [];
          const known = bucket.filter((s) =>
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
              {t.id !== "runesmithing" && (
                <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                  {known}/{bucket.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="magic-tab-panel" key={activeBucket}>
      {activeBucket === "runesmithing" ? (
        <RunesmithingPanel state={state} actions={actions} />
      ) : (
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
      )}
      </div>
    </section>
  );
}
