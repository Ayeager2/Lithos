// Boss-fight modal — turn-based combat UI (#40).
//
// Two phases:
//   1. Picker: list available bosses from getBossesAvailable(state).
//   2. Fight:  per-turn Attack / Spell / Item / Defend / Flee.
//
// Combat math runs client-side via combat.js rollPlayerAttack /
// rollFoeAttack. Spells + consumables dispatched mid-fight use the real
// CAST_SPELL / USE_TOOL paths (so spirit, fragments, inventory, and
// cooldowns all behave naturally). The modal tracks damage taken from the
// foe locally and commits the totals via actions.endBossFight() when the
// fight ends — that single dispatch applies the hp/sanity/spirit deltas,
// awards loot on victory, fires the firstDefeatLog + etching once, or
// applies the death-debuff cascade on defeat. See systems/boss.js.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getAllBosses,
  getBossesAvailable,
  getBoss,
} from "../content/bosses.js";
import {
  rollPlayerAttack,
  rollFoeAttack,
  pickOpener,
  pickVictoryLine,
  pickDefeatLine,
  getEffectiveWeapon,
} from "../systems/combat.js";
import { getKnownSpells, canCastSpell } from "../systems/spells.js";
import { getAllTools } from "../content/tools.js";
import { canUseTool } from "../systems/consumables.js";
import { getResource, getResourcesByCategory } from "../content/resources.js";

// Era-One/Two/Three label helper (#105 carry-over).
const ERA_LABEL = { 1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five" };
function eraLabel(n) { return ERA_LABEL[n] || String(n); }

const FLEE_SUCCESS_CHANCE = 0.6;

function Bar({ label, current, max, accent = "hp" }) {
  const pct = Math.max(0, Math.min(1, current / max));
  return (
    <div className={`boss-bar boss-bar--${accent}`}>
      <span className="boss-bar-label">{label}</span>
      <div className="boss-bar-track">
        <div
          className="boss-bar-fill"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="boss-bar-num">{Math.round(current)} / {max}</span>
    </div>
  );
}

function BossPicker({ state, available, onPick, onClose }) {
  return (
    <div className="boss-picker">
      <p className="muted boss-picker-lead">
        Bosses you can challenge right now. A defeat doesn't reset the run
        — but the cost will linger.
      </p>
      {available.length === 0 ? (
        <p className="muted magic-empty">No challengers stand in your way yet.</p>
      ) : (
        <div className="patrol-card-grid">
          {available.map((b) => {
            const beaten = !!state.persistent.bossesDefeated?.[b.id];
            const tierKey = b.tier === "main" ? "epic" : "rare"; // main = epic chip, mini = rare chip
            const dmgType = b.combat.damageType && b.combat.damageType !== "hp"
              ? ` (${b.combat.damageType})` : "";
            return (
              <div
                key={b.id}
                className={`patrol-card patrol-card--magic ${beaten ? "is-beaten" : ""}`}
              >
                <div className="patrol-card-head">
                  <span className="patrol-card-icon" aria-hidden="true">{b.icon}</span>
                  <div className="patrol-card-title">
                    <div className="patrol-card-name">
                      {b.name}
                      {beaten && (
                        <span
                          className="patrol-card-tier patrol-card-tier--common"
                          style={{ marginLeft: 6 }}
                          title="You've already beaten this boss"
                        >
                          🥇 beaten
                        </span>
                      )}
                    </div>
                    <div className="patrol-card-sub">
                      <span className={`patrol-card-tier patrol-card-tier--${tierKey}`}>
                        Era {eraLabel(b.era)} · {b.tier === "main" ? "Main" : "Mini"}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="patrol-card-desc muted">{b.description}</p>

                <div className="patrol-card-drops">
                  <div className="patrol-card-drops-label muted">Stats</div>
                  <ul className="patrol-card-drops-list">
                    <li className="patrol-card-drop">
                      <span aria-hidden="true">❤️</span>
                      <span className="patrol-card-drop-name">HP</span>
                      <span className="muted">{b.combat.hp}</span>
                    </li>
                    <li className="patrol-card-drop">
                      <span aria-hidden="true">🎯</span>
                      <span className="patrol-card-drop-name">Accuracy</span>
                      <span className="muted">{Math.round(b.combat.acc * 100)}%</span>
                    </li>
                    <li className="patrol-card-drop">
                      <span aria-hidden="true">⚔️</span>
                      <span className="patrol-card-drop-name">Damage{dmgType}</span>
                      <span className="muted">{b.combat.damage.min}–{b.combat.damage.max}</span>
                    </li>
                  </ul>
                </div>

                {Array.isArray(b.runeDrops) && b.runeDrops.length > 0 && (
                  <div className="patrol-card-drops">
                    <div className="patrol-card-drops-label muted">Possible rune drops</div>
                    <ul className="patrol-card-drops-list">
                      {b.runeDrops.map((drop, i) => {
                        const r = getResource(drop.resource);
                        const rarity = r?.rarity || "uncommon";
                        return (
                          <li key={i} className="patrol-card-drop" title={r?.imbueEffect?.label || ""}>
                            <span aria-hidden="true">{r?.icon || "🪬"}</span>
                            <span className="patrol-card-drop-name">
                              {(r?.name || drop.resource).replace(" Rune", "")}
                            </span>
                            <span
                              className={`patrol-card-tier patrol-card-tier--${rarity}`}
                              style={{ marginRight: 4 }}
                            >
                              {rarity}
                            </span>
                            <span className="muted">{Math.round(drop.chance * 100)}%</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary btn-sm patrol-card-cta-btn"
                  onClick={() => onPick(b.id)}
                >
                  ⚔️ Challenge
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// #141 — pretty-printers for spell/item effects + costs.
// Builds short chip-friendly strings like "+20 HP", "−10 Spirit", "+30 Sanity".
function formatEffect(effect) {
  if (!effect) return [];
  const out = [];
  if (effect.hp) out.push(`${effect.hp > 0 ? "+" : ""}${effect.hp} HP`);
  if (effect.sanity) out.push(`${effect.sanity > 0 ? "+" : ""}${effect.sanity} San`);
  if (effect.spirit) out.push(`${effect.spirit > 0 ? "+" : ""}${effect.spirit} Spi`);
  if (effect.hunger) out.push(`${effect.hunger > 0 ? "+" : ""}${effect.hunger} Hunger`);
  if (effect.thirst) out.push(`${effect.thirst > 0 ? "+" : ""}${effect.thirst} Thirst`);
  if (effect.energy) out.push(`${effect.energy > 0 ? "+" : ""}${effect.energy} Energy`);
  return out;
}
function formatCost(cost) {
  if (!cost) return [];
  const out = [];
  if (cost.fragments) out.push(`✨ ${cost.fragments}`);
  if (cost.spirit) out.push(`🌀 ${cost.spirit}`);
  if (cost.water) out.push(`💧 ${cost.water}`);
  if (cost.food) out.push(`🍖 ${cost.food}`);
  return out;
}
// Build a multi-line tooltip for spells/items.
function buildTip(item, kind) {
  const lines = [];
  if (item.description) lines.push(item.description);
  const effs = formatEffect(item.effect || item.useEffect);
  if (effs.length) lines.push(`Effect: ${effs.join(", ")}`);
  const costs = formatCost(item.cost);
  if (costs.length) lines.push(`Cost: ${costs.join(", ")}`);
  if (item.cooldownMs) lines.push(`Cooldown: ${Math.round(item.cooldownMs / 1000)}s`);
  if (item.effectSummary && !effs.length) lines.push(item.effectSummary);
  return lines.join("\n");
}

function SubPickerRow({ icon, name, qty, effects, costs, tooltip, disabled, disabledReason, onClick }) {
  return (
    <button
      type="button"
      className="boss-sub-row"
      disabled={disabled}
      title={disabled ? (disabledReason || "Not available") : tooltip}
      onClick={onClick}
    >
      <span className="boss-sub-row-icon" aria-hidden="true">{icon}</span>
      <span className="boss-sub-row-name">
        {name}
        {qty != null && <span className="muted boss-sub-row-qty"> × {qty}</span>}
      </span>
      <span className="boss-sub-row-effects">
        {effects.map((e, i) => (
          <span key={`e${i}`} className="boss-sub-row-chip boss-sub-row-chip--eff">{e}</span>
        ))}
        {costs.map((c, i) => (
          <span key={`c${i}`} className="boss-sub-row-chip boss-sub-row-chip--cost muted">{c}</span>
        ))}
      </span>
    </button>
  );
}

// #159 — categorize spells by inferred role so the SpellPicker can tab
// them as Heal / Buff / Attack. Heuristic: positive hp/sanity/spirit
// effects = heal; weapon/buff effects = buff; everything else = attack.
function spellCategory(spell) {
  const e = spell?.effect || {};
  const target = spell?.targetsFoe || spell?.damage;
  if (target) return "attack";
  if (e.hp > 0 || e.sanity > 0 || e.spirit > 0 || e.hunger < 0 || e.thirst < 0) return "heal";
  if (e.acc != null || e.crit != null || e.damage != null) return "buff";
  if (e.spirit > 0) return "heal";
  // Bend / Greater Bend / Dominate / Curse / Soulflame / Echo / Voidcall:
  // names imply offense even when stats aren't surfaced — fallback by id.
  const id = spell?.id || "";
  if (/bend|curse|soulflame|dominate|echo|ghostcall|voidcall|banish|soothe/i.test(id)) {
    if (/soothe|bend/i.test(id)) return "heal";
    return "attack";
  }
  return "buff";
}

// #159 — quick-eat row. Auto-picks the best-nutrition food the player
// holds and exposes a one-click Eat button. Same idea for potions
// (consumable tools that restore HP/Sanity/Spirit). Lives on the
// player column above the action stack so the player doesn't have to
// open the Item sub-picker mid-fight to use a single dose.
// #161 — split-button row: a main "Eat" button that uses the best
// available food, and a dropdown arrow that opens a popover listing
// every owned food. Same pattern for the "Items" button (combat
// consumables — potions, salves, vials). Keyboard shortcuts E/I.
function QuickConsumables({ state, actions }) {
  const inv = state.run.inventory || {};
  const foods = getResourcesByCategory("food")
    .filter((f) => (inv[f.id] || 0) > 0 && (f.nutrition || 0) > 0)
    .sort((a, b) => (b.nutrition || 0) - (a.nutrition || 0));
  const items = getAllTools()
    .filter((t) => t.consumable && (inv[t.id] || 0) > 0)
    .sort((a, b) => (b.useEffect?.hp || 0) - (a.useEffect?.hp || 0));
  const [openMenu, setOpenMenu] = useState(null); // null | "food" | "item"

  // Keyboard: E = eat best food, I = use best item.
  useEffect(() => {
    function onKey(e) {
      if (e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA") return;
      if (e.key === "e" || e.key === "E") {
        if (foods[0]) actions.eat?.(foods[0].id);
      } else if (e.key === "i" || e.key === "I") {
        if (items[0]) actions.useTool?.(items[0].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [foods, items, actions]);

  // Click-away to close menus.
  useEffect(() => {
    if (!openMenu) return;
    function onAway(e) {
      if (!e.target.closest(".boss-fight-split")) setOpenMenu(null);
    }
    window.addEventListener("mousedown", onAway);
    return () => window.removeEventListener("mousedown", onAway);
  }, [openMenu]);

  if (foods.length === 0 && items.length === 0) return null;
  return (
    <div className="boss-fight-quick">
      <div className="boss-fight-quick-row-split">
        {/* EAT split-button */}
        {foods.length > 0 && (
          <div className="boss-fight-split">
            <button
              type="button"
              className="boss-fight-split-main"
              title={`Eat ${foods[0].name} — restores ${foods[0].nutrition} hunger (press E)`}
              onClick={() => actions.eat?.(foods[0].id)}
            >
              <span className="boss-fight-split-icon" aria-hidden="true">{foods[0].icon}</span>
              <span>Eat</span>
              <span className="boss-fight-split-key" aria-label="Shortcut">E</span>
            </button>
            <button
              type="button"
              className="boss-fight-split-arrow"
              title="Pick another food"
              aria-expanded={openMenu === "food"}
              onClick={() => setOpenMenu(openMenu === "food" ? null : "food")}
            >
              ▾
            </button>
            {openMenu === "food" && (
              <div className="boss-fight-split-menu" role="menu">
                {foods.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="menuitem"
                    className="boss-fight-split-menu-item"
                    title={`${f.name} — restores ${f.nutrition} hunger`}
                    onClick={() => { actions.eat?.(f.id); setOpenMenu(null); }}
                  >
                    <span aria-hidden="true">{f.icon}</span>
                    <span className="boss-fight-split-menu-name">{f.name}</span>
                    <span className="muted">× {inv[f.id] || 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {/* ITEMS split-button */}
        {items.length > 0 && (
          <div className="boss-fight-split">
            <button
              type="button"
              className="boss-fight-split-main"
              title={`Use ${items[0].name} — ${items[0].effectSummary || ""} (press I)`}
              disabled={!canUseTool(state, items[0].id).ok}
              onClick={() => actions.useTool?.(items[0].id)}
            >
              <span className="boss-fight-split-icon" aria-hidden="true">{items[0].icon}</span>
              <span>Item</span>
              <span className="boss-fight-split-key" aria-label="Shortcut">I</span>
            </button>
            <button
              type="button"
              className="boss-fight-split-arrow"
              title="Pick another item"
              aria-expanded={openMenu === "item"}
              onClick={() => setOpenMenu(openMenu === "item" ? null : "item")}
            >
              ▾
            </button>
            {openMenu === "item" && (
              <div className="boss-fight-split-menu" role="menu">
                {items.map((p) => {
                  const check = canUseTool(state, p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="menuitem"
                      className="boss-fight-split-menu-item"
                      title={`${p.name} — ${p.effectSummary || p.description || ""}`}
                      disabled={!check.ok}
                      onClick={() => { actions.useTool?.(p.id); setOpenMenu(null); }}
                    >
                      <span aria-hidden="true">{p.icon}</span>
                      <span className="boss-fight-split-menu-name">{p.name}</span>
                      <span className="muted">× {inv[p.id] || 0}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SpellPicker({ state, actions, onPick, onCancel }) {
  const known = getKnownSpells(state);
  // #159 — bucket spells by inferred role. Tab defaults to "attack" since
  // that's the most-common boss-fight pick; falls back to whichever bucket
  // has spells if attack is empty.
  const TABS = [
    { id: "attack", label: "⚔️ Attack" },
    { id: "buff", label: "✨ Buff" },
    { id: "heal", label: "💗 Heal" },
  ];
  const buckets = { attack: [], buff: [], heal: [] };
  for (const s of known) (buckets[spellCategory(s)] || buckets.attack).push(s);
  const visibleTabs = TABS.filter((t) => buckets[t.id].length > 0);
  const [tab, setTab] = useState(() => visibleTabs[0]?.id || "attack");
  const activeId = buckets[tab]?.length > 0 ? tab : (visibleTabs[0]?.id || "attack");
  const list = buckets[activeId] || [];
  if (known.length === 0) {
    return (
      <div className="boss-subpicker">
        <p className="muted">No spells known.</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Back
        </button>
      </div>
    );
  }
  return (
    <div className="boss-subpicker">
      <p className="muted boss-subpicker-lead">Pick a spell. Tap to cast.</p>
      <div className="boss-subpicker-tabs" role="tablist">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === activeId}
            className={`boss-subpicker-tab ${t.id === activeId ? "is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
              {buckets[t.id].length}
            </span>
          </button>
        ))}
      </div>
      <div className="boss-sub-row-list">
        {list.map((s) => {
          const check = canCastSpell(state, s.id);
          return (
            <SubPickerRow
              key={s.id}
              icon={s.icon}
              name={s.name}
              effects={formatEffect(s.effect)}
              costs={formatCost(s.cost)}
              tooltip={buildTip(s, "spell")}
              disabled={!check.ok}
              disabledReason={check.reason}
              onClick={() => {
                actions.castSpell(s.id);
                onPick(s);
              }}
            />
          );
        })}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
        Back
      </button>
    </div>
  );
}

function ItemPicker({ state, actions, onPick, onCancel }) {
  const consumables = useMemo(() => {
    return getAllTools().filter(
      (t) => t.consumable && (state.run.inventory?.[t.id] || 0) > 0
    );
  }, [state.run.inventory]);
  if (consumables.length === 0) {
    return (
      <div className="boss-subpicker">
        <p className="muted">No usable items.</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Back
        </button>
      </div>
    );
  }
  return (
    <div className="boss-subpicker">
      <p className="muted boss-subpicker-lead">Pick an item. Tap to use.</p>
      <div className="boss-sub-row-list">
        {consumables.map((t) => {
          const qty = state.run.inventory?.[t.id] || 0;
          const check = canUseTool(state, t.id);
          return (
            <SubPickerRow
              key={t.id}
              icon={t.icon}
              name={t.name}
              qty={qty}
              effects={formatEffect(t.useEffect)}
              costs={[]}
              tooltip={buildTip(t, "item")}
              disabled={!check.ok}
              disabledReason={check.reason}
              onClick={() => {
                actions.useTool(t.id);
                onPick(t);
              }}
            />
          );
        })}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
        Back
      </button>
    </div>
  );
}

function BossFight({ state, actions, boss, onExit }) {
  const startStats = state.run.stats || {};
  const startHp = Math.round(startStats.hp ?? 100);
  const startSanity = Math.round(startStats.sanity ?? 50);
  const startSpirit = Math.round(startStats.spirit ?? 50);

  const [foeHp, setFoeHp] = useState(boss.combat.hp);
  const [damage, setDamage] = useState({ hp: 0, sanity: 0, spirit: 0 });
  const [log, setLog] = useState(() => [
    { kind: "opener", text: pickOpener(boss) },
  ]);
  const [phase, setPhase] = useState("player"); // player | foe | done
  const [outcome, setOutcome] = useState(null); // victory | defeat | flee
  const [defendQueued, setDefendQueued] = useState(false);
  const [subPicker, setSubPicker] = useState(null); // null | "spell" | "item"
  // #157 — auto-attack mode. Click Attack once → auto-attack continues
  // every TURN_CYCLE_MS until win/defeat/flee or user clicks Stop. The
  // count-down on the player portrait reads "next attack in Ns".
  const TURN_CYCLE_MS = 6000;
  const [autoAttack, setAutoAttack] = useState(false);
  const [nextAttackAt, setNextAttackAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const committed = useRef(false);
  const logBottomRef = useRef(null);

  // #157 — 250ms ticker while auto-attack is active so the countdown
  // re-renders smoothly. No-op otherwise.
  useEffect(() => {
    if (!autoAttack || phase === "done") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [autoAttack, phase]);

  useEffect(() => {
    if (logBottomRef.current) {
      logBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [log]);

  // Player real stats this fight = state values minus accumulated damage.
  // Healing/spell effects mutate state.run.stats directly through real
  // dispatches, so the "current" reading auto-updates.
  const liveHp = Math.max(0, Math.round((state.run.stats?.hp ?? 0) - damage.hp));
  const liveSanity = Math.max(
    0,
    Math.round((state.run.stats?.sanity ?? 0) - damage.sanity)
  );
  const liveSpirit = Math.max(
    0,
    Math.round((state.run.stats?.spirit ?? 0) - damage.spirit)
  );

  const weapon = getEffectiveWeapon(state.run);

  function pushLog(entry) {
    setLog((l) => [...l, entry]);
  }

  function commit(finalOutcome, finalDamage) {
    if (committed.current) return;
    committed.current = true;
    actions.endBossFight({
      bossId: boss.id,
      outcome: finalOutcome,
      damage: finalDamage,
    });
  }

  function finishWithVictory(finalDamage) {
    pushLog({ kind: "victory", text: pickVictoryLine(boss) });
    setPhase("done");
    setOutcome("victory");
    commit("victory", finalDamage);
  }

  function finishWithDefeat(finalDamage) {
    pushLog({ kind: "defeat", text: pickDefeatLine(boss) });
    setPhase("done");
    setOutcome("defeat");
    commit("defeat", finalDamage);
  }

  function finishWithFlee(finalDamage) {
    pushLog({ kind: "flee", text: "🏃 You break off and stagger into the dust." });
    setPhase("done");
    setOutcome("flee");
    commit("flee", finalDamage);
  }

  function runFoeTurn(nextDamage) {
    const foe = rollFoeAttack(state, boss);
    let dmg = foe.dmg;
    let prefix = "";
    if (defendQueued && dmg > 0) {
      dmg = Math.floor(dmg / 2);
      prefix = "🛡️ Halved by your guard. ";
      setDefendQueued(false);
    }
    pushLog({ kind: foe.hit ? "foe-hit" : "foe-miss", text: prefix + foe.message });

    if (!foe.hit || dmg === 0) {
      setDamage(nextDamage);
      setPhase("player");
      return;
    }

    const updated = { ...nextDamage };
    if (foe.damageType === "sanity") updated.sanity += dmg;
    else if (foe.damageType === "spirit") updated.spirit += dmg;
    else updated.hp += dmg;
    setDamage(updated);

    // Check defeat: would current real stat drop below 1?
    const liveAfterHp = (state.run.stats?.hp ?? 0) - updated.hp;
    if (liveAfterHp <= 0) {
      finishWithDefeat(updated);
      return;
    }
    setPhase("player");
  }

  // #157 — single attack swing. The auto-attack scheduler calls this
  // on each tick. The button handler below sets autoAttack=true and
  // also calls this for the first swing.
  function performAttackSwing() {
    if (phase !== "player") return;
    const hit = rollPlayerAttack(state, boss);
    pushLog({
      kind: hit.hit ? (hit.isCrit ? "player-crit" : "player-hit") : "player-miss",
      text: hit.message,
    });
    let nextFoeHp = Math.max(0, foeHp - hit.dmg);

    // Rune imbues (#132 → #133) — apply on-hit effects to the damage
    // tracker so they show up live on the bars and get committed via
    // endBossFight. Negative damage = heal; sanity cost = positive sanity
    // damage; echo strike = extra foe damage tick.
    let nextDamage = damage;
    if (hit.hit && hit.imbues) {
      const updated = { ...damage };
      if (hit.imbues.hpReturnOnHit) {
        updated.hp = Math.max(-100, (updated.hp || 0) - hit.imbues.hpReturnOnHit);
        pushLog({ kind: "player-hit", text: `💧 +${hit.imbues.hpReturnOnHit} HP from the imbue.` });
      }
      if (hit.imbues.spiritReturnOnHit) {
        updated.spirit = Math.max(-100, (updated.spirit || 0) - hit.imbues.spiritReturnOnHit);
        pushLog({ kind: "spell", text: `🌀 +${hit.imbues.spiritReturnOnHit} Spirit from the imbue.` });
      }
      if (hit.imbues.sanityCostOnHit) {
        updated.sanity = (updated.sanity || 0) + hit.imbues.sanityCostOnHit;
        pushLog({ kind: "foe-hit", text: `🕳️ The Void takes ${hit.imbues.sanityCostOnHit} Sanity.` });
      }
      if (hit.imbues.echoDmg > 0 && nextFoeHp > 0) {
        const before = nextFoeHp;
        nextFoeHp = Math.max(0, nextFoeHp - hit.imbues.echoDmg);
        pushLog({ kind: "player-crit", text: `🔔 The strike echoes. ${hit.imbues.echoDmg} more damage.` });
        // Echo re-applies on-hit returns (mirrors resolveFight).
        if (hit.imbues.hpReturnOnHit) {
          updated.hp = Math.max(-100, (updated.hp || 0) - hit.imbues.hpReturnOnHit);
        }
        if (hit.imbues.spiritReturnOnHit) {
          updated.spirit = Math.max(-100, (updated.spirit || 0) - hit.imbues.spiritReturnOnHit);
        }
        if (before > 0 && nextFoeHp === 0) {
          // echo finished the foe
        }
      }
      nextDamage = updated;
      setDamage(updated);
    }

    setFoeHp(nextFoeHp);
    if (nextFoeHp <= 0) {
      finishWithVictory(nextDamage);
      return;
    }
    setPhase("foe");
    setTimeout(() => runFoeTurn(nextDamage), 600);
  }

  // #157 — Attack button click. If auto-attack is already on, this acts
  // as a stop button. Otherwise it turns on auto-attack and fires the
  // first swing immediately; the scheduler useEffect below paces the rest.
  function onAttack() {
    if (autoAttack) {
      setAutoAttack(false);
      setNextAttackAt(0);
      pushLog({ kind: "defend", text: "🛑 You pull your swings. Auto-attack off." });
      return;
    }
    setAutoAttack(true);
    setNextAttackAt(Date.now() + TURN_CYCLE_MS);
    performAttackSwing();
  }

  // #157 — auto-attack scheduler. While autoAttack is true and we're back
  // in the player phase, schedule the next swing for nextAttackAt. Cleared
  // when the player or foe drops, when the user cancels, or when a sub-
  // picker opens (spell/item). Defend/Flee turn auto-attack off.
  useEffect(() => {
    if (!autoAttack || phase !== "player" || subPicker !== null) return;
    const remain = Math.max(0, nextAttackAt - Date.now());
    const id = setTimeout(() => {
      performAttackSwing();
      setNextAttackAt(Date.now() + TURN_CYCLE_MS);
    }, remain);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAttack, phase, subPicker, nextAttackAt]);

  function onDefend() {
    if (phase !== "player") return;
    setAutoAttack(false);
    setDefendQueued(true);
    pushLog({ kind: "defend", text: `🛡️ You set your stance. Their next blow lands soft.` });
    setPhase("foe");
    setTimeout(() => runFoeTurn(damage), 400);
  }

  function onSpellCast() {
    setAutoAttack(false);
    setSubPicker(null);
    pushLog({ kind: "spell", text: `✨ The word leaves your mouth.` });
    setPhase("foe");
    setTimeout(() => runFoeTurn(damage), 600);
  }

  function onItemUse() {
    setAutoAttack(false);
    setSubPicker(null);
    pushLog({ kind: "item", text: `🧪 You take the dose.` });
    setPhase("foe");
    setTimeout(() => runFoeTurn(damage), 600);
  }

  function onFlee() {
    if (phase !== "player") return;
    setAutoAttack(false);
    const success = Math.random() < FLEE_SUCCESS_CHANCE;
    if (success) {
      finishWithFlee(damage);
      return;
    }
    pushLog({ kind: "flee-fail", text: `❌ You can't break clear. They get a swing in.` });
    setPhase("foe");
    setTimeout(() => runFoeTurn(damage), 400);
  }

  const playerLocked = phase !== "player" || subPicker !== null;

  // #140 — combat panel content for the LEFT column. Either the action
  // stack, the spell/item sub-picker, or the victory/defeat outro.
  const leftPanel = phase === "done" ? (
    <div className="boss-fight-end">
      <p className="boss-fight-end-label">
        {outcome === "victory" && "🏆 Victory."}
        {outcome === "defeat" && "💀 You fell."}
        {outcome === "flee" && "🏃 You escaped."}
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onExit}
      >
        Return
      </button>
    </div>
  ) : subPicker === "spell" ? (
    <SpellPicker
      state={state}
      actions={actions}
      onPick={onSpellCast}
      onCancel={() => setSubPicker(null)}
    />
  ) : subPicker === "item" ? (
    <ItemPicker
      state={state}
      actions={actions}
      onPick={onItemUse}
      onCancel={() => setSubPicker(null)}
    />
  ) : (
    <div className="boss-fight-actions boss-fight-actions--stack">
      <button
        type="button"
        className="btn btn-primary"
        onClick={onAttack}
        disabled={playerLocked && !autoAttack}
      >
        {autoAttack ? "⏹ Stop Attacking" : "⚔️ Attack"}
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => setSubPicker("spell")}
        disabled={playerLocked}
      >
        ✨ Spell
      </button>
      {/* #162 — Item button retired. Quick-Item split-button above the
          action stack covers this faster (best-pick + dropdown with every
          consumable + I keyboard shortcut). */}
      <button
        type="button"
        className="btn"
        onClick={onDefend}
        disabled={playerLocked}
      >
        🛡️ Defend
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={onFlee}
        disabled={playerLocked}
      >
        🏃 Flee
      </button>
    </div>
  );

  return (
    <div className="boss-fight">
      <div className="boss-fight-arena">
        {/* LEFT: player portrait + stats + action stack. */}
        <div className="boss-fight-side boss-fight-side--player">
          <div className="boss-fight-portrait" aria-hidden="true">
            👤
            {autoAttack && phase === "player" && (() => {
              const remainMs = Math.max(0, nextAttackAt - now);
              const remainS = Math.ceil(remainMs / 1000);
              const isFinal = remainS <= 5 && remainS > 0;
              if (remainS <= 0) return null;
              return (
                <div className={`boss-fight-countdown ${isFinal ? "is-final" : ""}`}>
                  {remainS}
                </div>
              );
            })()}
          </div>
          <div className="boss-fight-side-name">You</div>
          <div className="boss-fight-bars">
            <Bar label="HP" current={liveHp} max={100} accent="hp" />
            <Bar label="Sanity" current={liveSanity} max={100} accent="sanity" />
            <Bar label="Spirit" current={liveSpirit} max={100} accent="spirit" />
          </div>
          <p className="muted boss-fight-weapon">
            Wielding: {weapon.icon || ""} {weapon.name}
          </p>
          <QuickConsumables state={state} actions={actions} />
          <div className="boss-fight-action-slot">
            {leftPanel}
          </div>
        </div>

        <div className="boss-fight-side boss-fight-side--foe">
          <div className="boss-fight-portrait boss-fight-portrait--foe" aria-hidden="true">
            {boss.icon}
          </div>
          <div className="boss-fight-side-name">{boss.name}</div>
          <div className="boss-fight-bars">
            <Bar label="Foe" current={foeHp} max={boss.combat.hp} accent="foe" />
          </div>
          <p className="muted boss-fight-weapon">
            {boss.tier === "main" ? "Main · Era " : "Mini · Era "}{eraLabel(boss.era)}
          </p>
          {/* #163 — full foe stats panel mirroring the boss-picker card so
              the player can size up what they're hitting mid-fight. */}
          <div className="patrol-card-drops">
            <div className="patrol-card-drops-label muted">Stats</div>
            <ul className="patrol-card-drops-list">
              <li className="patrol-card-drop">
                <span aria-hidden="true">❤️</span>
                <span className="patrol-card-drop-name">HP</span>
                <span className="muted">{Math.round(foeHp)} / {boss.combat.hp}</span>
              </li>
              <li className="patrol-card-drop">
                <span aria-hidden="true">🎯</span>
                <span className="patrol-card-drop-name">Accuracy</span>
                <span className="muted">{Math.round((boss.combat.acc || 0) * 100)}%</span>
              </li>
              <li className="patrol-card-drop">
                <span aria-hidden="true">⚔️</span>
                <span className="patrol-card-drop-name">
                  Damage{boss.combat.damageType && boss.combat.damageType !== "hp"
                    ? ` (${boss.combat.damageType})` : ""}
                </span>
                <span className="muted">
                  {boss.combat.damage?.min}–{boss.combat.damage?.max}
                </span>
              </li>
              {boss.combat.eva != null && (
                <li className="patrol-card-drop">
                  <span aria-hidden="true">💨</span>
                  <span className="patrol-card-drop-name">Evasion</span>
                  <span className="muted">{Math.round((boss.combat.eva || 0) * 100)}%</span>
                </li>
              )}
            </ul>
          </div>
          {Array.isArray(boss.runeDrops) && boss.runeDrops.length > 0 && (
            <div className="patrol-card-drops">
              <div className="patrol-card-drops-label muted">Possible rune drops</div>
              <ul className="patrol-card-drops-list">
                {boss.runeDrops.map((drop, i) => {
                  const r = getResource(drop.resource);
                  const rarity = r?.rarity || "uncommon";
                  return (
                    <li key={i} className="patrol-card-drop" title={r?.imbueEffect?.label || ""}>
                      <span aria-hidden="true">{r?.icon || "🪬"}</span>
                      <span className="patrol-card-drop-name">
                        {(r?.name || drop.resource).replace(" Rune", "")}
                      </span>
                      <span
                        className={`patrol-card-tier patrol-card-tier--${rarity}`}
                        style={{ marginRight: 4 }}
                      >
                        {rarity}
                      </span>
                      <span className="muted">{Math.round(drop.chance * 100)}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="boss-fight-log" role="log" aria-live="polite">
        {log.map((entry, i) => (
          <p key={i} className={`boss-fight-line boss-fight-line--${entry.kind}`}>
            {entry.text}
          </p>
        ))}
        <div ref={logBottomRef} />
      </div>
    </div>
  );
}

export default function BossFightModal({ state, actions, initialBossId = null, onClose }) {
  const [chosenId, setChosenId] = useState(initialBossId);
  const lastSyncedInitialId = useRef(initialBossId);
  useEffect(() => {
    if (initialBossId && initialBossId !== lastSyncedInitialId.current) {
      lastSyncedInitialId.current = initialBossId;
      setChosenId(initialBossId);
    }
  }, [initialBossId]);

  const available = useMemo(() => getBossesAvailable(state), [state]);
  const boss = chosenId ? getBoss(chosenId) : null;

  // #165 — draggable modal. Grab the title bar to move it around the
  // viewport. Resize lives on the modal itself via CSS `resize: both`.
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragState = useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });
  function onDragStart(e) {
    // Skip when the user is interacting with a button inside the head
    // (don't hijack Close clicks).
    if (e.target.closest("button")) return;
    dragState.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos.x,
      baseY: pos.y,
    };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd, { once: true });
  }
  function onDragMove(e) {
    if (!dragState.current.active) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPos({ x: dragState.current.baseX + dx, y: dragState.current.baseY + dy });
  }  function onDragEnd() {
    dragState.current.active = false;
    window.removeEventListener("pointermove", onDragMove);
  }

  return (
    <div className="modal-overlay modal-overlay--draggable" role="dialog" aria-modal="true">
      <div
        className="modal modal--boss modal--draggable"
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      >
        <div
          className="modal-head modal-head--drag-handle"
          onPointerDown={onDragStart}
          title="Drag to reposition · Drag the bottom-right corner to resize"
        >
          <h2>{boss ? `⚔️ ${boss.name}` : "Boss Challenges"}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          {boss ? (
            <BossFight
              key={chosenId}
              state={state}
              actions={actions}
              boss={boss}
              onExit={() => {
                setChosenId(null);
                lastSyncedInitialId.current = null;
                onClose?.();
              }}
            />
          ) : (
            <BossPicker
              state={state}
              available={available}
              onPick={(id) => setChosenId(id)}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
