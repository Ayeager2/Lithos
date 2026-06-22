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
import { getResource } from "../content/resources.js";

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

function SpellPicker({ state, actions, onPick, onCancel }) {
  const known = getKnownSpells(state);
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
      <div className="boss-sub-row-list">
        {known.map((s) => {
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
  const committed = useRef(false);
  const logBottomRef = useRef(null);

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

  function onAttack() {
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

  function onDefend() {
    if (phase !== "player") return;
    setDefendQueued(true);
    pushLog({ kind: "defend", text: `🛡️ You set your stance. Their next blow lands soft.` });
    setPhase("foe");
    setTimeout(() => runFoeTurn(damage), 400);
  }

  function onSpellCast() {
    setSubPicker(null);
    pushLog({ kind: "spell", text: `✨ The word leaves your mouth.` });
    setPhase("foe");
    setTimeout(() => runFoeTurn(damage), 600);
  }

  function onItemUse() {
    setSubPicker(null);
    pushLog({ kind: "item", text: `🧪 You take the dose.` });
    setPhase("foe");
    setTimeout(() => runFoeTurn(damage), 600);
  }

  function onFlee() {
    if (phase !== "player") return;
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
        disabled={playerLocked}
      >
        ⚔️ Attack
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => setSubPicker("spell")}
        disabled={playerLocked}
      >
        ✨ Spell
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => setSubPicker("item")}
        disabled={playerLocked}
      >
        🧪 Item
      </button>
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
          <div className="boss-fight-portrait" aria-hidden="true">👤</div>
          <div className="boss-fight-side-name">You</div>
          <div className="boss-fight-bars">
            <Bar label="HP" current={liveHp} max={100} accent="hp" />
            <Bar label="Sanity" current={liveSanity} max={100} accent="sanity" />
            <Bar label="Spirit" current={liveSpirit} max={100} accent="spirit" />
                   </div>
          <p className="muted boss-fight-weapon">
            Wielding: {weapon.icon || ""} {weapon.name}
          </p>
          <div className="boss-fight-action-slot">
            {leftPanel}
          </div>
        </div>

        {/* RIGHT: foe portrait + name + foe HP bar. */}
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
        </div>
      </div>

      {/* Combat log below both columns. */}
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
  // #142 — initialBossId is set by Shell when a patrol encounter spawns a
  // boss; the modal jumps straight to the fight in that case. When opened
  // from the rail (no initialBossId), we land on the picker.
  const [chosenId, setChosenId] = useState(initialBossId);
  // If the parent stamps a NEW initialBossId while the modal is open
  // (e.g. consecutive patrol encounters), re-sync.
  useEffect(() => {
    if (initialBossId) setChosenId(initialBossId);
  }, [initialBossId]);

  const available = useMemo(() => getBossesAvailable(state), [state]);
  const boss = chosenId ? getBoss(chosenId) : null;

  // BossFight passes a unique key per chosenId so its internal state
  // (foeHp, damage, phase, log) resets cleanly when the player returns
  // and picks a new boss (#142).
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal--boss">
        <div className="modal-head">
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
                // #142 — return to the picker so the player can choose
                // another fight without re-opening the modal. Close is
                // its own button at the top of the modal head.
                setChosenId(null);
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
