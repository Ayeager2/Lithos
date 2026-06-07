// Hunting view (#79) — full center page parallel to PatrolView.
//
// Prey cards grouped by era. Click a card → auto-loop hunt fires every
// cycleMs; pile of goods accumulates drops. Click another card → swap
// target. Click Stop → halt the loop. Same idle-RPG model as Patrol.
//
// Currently the hunting tool is required (bow/net/etc.); if you don't
// own one, the page shows a hint instead of cards.

import { useEffect, useState } from "react";
import { getAllPrey } from "../content/prey.js";
import { RESOURCES } from "../content/resources.js";
import { getActiveLoop, getLoopProgress } from "../systems/loop.js";
import { getHuntStatus, getHuntCooldownMs, canHunt } from "../systems/hunting.js";
import { getSkillState } from "../systems/skills.js";
import { computeEra } from "../systems/era.js";
import { getEquippedMagicDef, getEquippedRangedDef } from "../systems/combat.js";

function CombatStylePicker({ state, actions }) {
  const style = state.run?.combatStyle || "melee";
  const hasRanged = !!getEquippedRangedDef(state.run);
  const hasMagic = !!getEquippedMagicDef(state.run);
  const spirit = state.run?.stats?.spirit ?? 0;
  const styles = [
    { id: "melee", icon: "⚔️", label: "Melee", available: true },
    { id: "ranged", icon: "🏹", label: "Ranged", available: hasRanged },
    { id: "magic", icon: "✨", label: "Magic", available: hasMagic, tip: `Costs Spirit per swing (have ${Math.round(spirit)}).` },
  ];
  return (
    <div className="combat-style-picker" role="radiogroup" aria-label="Combat style">
      {styles.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={style === s.id}
          className={`combat-style-btn ${style === s.id ? "is-active" : ""} ${s.available ? "" : "is-unavailable"}`}
          onClick={() => s.available && actions.setCombatStyle?.(s.id)}
          disabled={!s.available && style !== s.id}
          title={s.tip || s.label}
        >
          <span aria-hidden="true">{s.icon}</span> {s.label}
        </button>
      ))}
    </div>
  );
}

// Prey reveal thresholds — mirror the Patrol MobCard system so the
// hunting page has the same "see ??? until you've hunted it enough"
// rhythm. Difficulty unlocks first, then drop names, then drop qty,
// then drop chance.
const PREY_REVEAL = {
  difficulty: 1,
  dropNames: 1,
  dropQty: 5,
  dropChance: 10,
  xp: 3,
};
function preyRevealHint(kills) {
  if (kills < PREY_REVEAL.difficulty) return "Hunt 1 to learn its difficulty.";
  if (kills < PREY_REVEAL.dropQty) return `Hunt ${PREY_REVEAL.dropQty - kills} more to see drop quantity.`;
  if (kills < PREY_REVEAL.dropChance) return `Hunt ${PREY_REVEAL.dropChance - kills} more to read drop odds.`;
  return null;
}

const TIER_LABEL = { common: "Common", uncommon: "Uncommon", rare: "Rare", apex: "Apex" };

function PreyCard({ prey, kills, isActive, loopPct, onClick }) {
  const drops = (prey.drops || []).map((d) => {
    const res = RESOURCES[d.resource];
    return {
      id: d.resource,
      icon: res?.icon || "",
      name: res?.name || d.resource,
      qty: Array.isArray(d.qty) ? `${d.qty[0]}–${d.qty[1]}` : String(d.qty || 1),
      pct: Math.round((d.chance ?? 1) * 100),
    };
  });

  return (
    <button
      type="button"
      className={`patrol-card patrol-card--tier-${prey.tier || "common"} ${isActive ? "is-active-loop" : ""}`}
      onClick={onClick}
      title={isActive ? "Auto-hunting — click another to swap, or Stop to halt." : `Hunt ${prey.name}`}
    >
      <div className="patrol-card-head">
        <span className="patrol-card-icon" aria-hidden="true">{prey.icon}</span>
        <div className="patrol-card-title">
          <div className="patrol-card-name">{prey.name}</div>
          <div className="patrol-card-sub">
            <span className={`patrol-card-tier patrol-card-tier--${prey.tier || "common"}`}>
              {TIER_LABEL[prey.tier] || "Common"}
            </span>
            <span className="patrol-card-kind muted">· prey</span>
            {kills > 0 && (
              <span className="patrol-card-kills">· hunted ×{kills}</span>
            )}
          </div>
        </div>
      </div>

      <p className="patrol-card-desc muted">{prey.description}</p>

      <div className="patrol-card-stats">
        <div className="patrol-card-stat" title="Stalk difficulty (chance the hunt fails).">
          <span aria-hidden="true">🎯</span>{" "}
          {kills >= PREY_REVEAL.difficulty
            ? `${Math.round((prey.difficulty || 0) * 100)}%`
            : <span className="muted">???</span>}
        </div>
        <div className="patrol-card-stat" title="Hunting XP on success.">
          <span aria-hidden="true">⭐</span>{" "}
          {kills >= PREY_REVEAL.xp ? (prey.xp || 1) : <span className="muted">???</span>}
        </div>
        <div className="patrol-card-stat" title="Mob category">
          <span aria-hidden="true">🏷️</span>{" "}
          {TIER_LABEL[prey.tier] || "Common"}
        </div>
      </div>

      {drops.length > 0 && (
        <div className="patrol-card-drops">
          <div className="patrol-card-drops-label muted">Drops</div>
          {kills < PREY_REVEAL.dropNames ? (
            <div className="patrol-card-drops-locked muted">???</div>
          ) : (
            <ul className="patrol-card-drops-list">
              {drops.map((d) => (
                <li key={d.id} className="patrol-card-drop">
                  <span aria-hidden="true">{d.icon}</span>
                  <span className="patrol-card-drop-name">{d.name}</span>
                  <span className="muted">
                    {kills >= PREY_REVEAL.dropQty ? `×${d.qty}` : "×?"}
                    {kills >= PREY_REVEAL.dropChance ? ` · ${d.pct}%` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {preyRevealHint(kills) && (
        <div className="patrol-card-reveal-hint muted">
          🔎 {preyRevealHint(kills)}
        </div>
      )}

      <div className="patrol-card-cta">
        {isActive ? "Stalking…" : "Hunt"}
      </div>
      {isActive && (
        <span
          className="patrol-card-loopbar"
          style={{ transform: `scaleX(${loopPct})` }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function PileOfGoods({ pile }) {
  const entries = Object.entries(pile?.drops || {}).filter(([, q]) => q > 0);
  if (entries.length === 0) {
    return (
      <div className="patrol-pile">
        <h3 className="patrol-pile-title">Pile of Goods</h3>
        <p className="muted">Drops accumulate here while you hunt.</p>
      </div>
    );
  }
  return (
    <div className="patrol-pile">
      <h3 className="patrol-pile-title">Pile of Goods</h3>
      <ul className="patrol-pile-list">
        {entries.map(([id, qty]) => {
          const res = RESOURCES[id];
          return (
            <li
              key={id}
              className="patrol-pile-item"
              title={res?.description || id}
            >
              <span aria-hidden="true">{res?.icon || ""}</span>
              <span className="patrol-pile-name">{res?.name || id}</span>
              <span className="patrol-pile-qty">×{qty}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function HuntingView({ state, actions }) {
  const [, force] = useState(0);
  const huntStatus = getHuntStatus(state);
  const era = computeEra(state);
  const loop = getActiveLoop(state);
  const isHuntLoop = loop?.kind === "hunt";
  const activePreyId = isHuntLoop ? loop.target?.preyId : null;
  const pile = isHuntLoop ? state.run.activePile : null;
  const preyDefeated = state.run.preyDefeated || {};
  const huntingLvl = getSkillState(state.run, "hunting").level;
  const huntCheck = canHunt(state);

  // Smooth loop progress bar.
  useEffect(() => {
    if (!isHuntLoop) return;
    const id = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [isHuntLoop]);

  const loopPct = isHuntLoop ? getLoopProgress(loop) : 0;

  if (!huntStatus.owned) {
    return (
      <section className="action-panel action-panel--hunting">
        <div className="panel-header">
          <h2>Hunting</h2>
          <p className="muted">
            You need a hunting tool — a net or a bow. Craft one to begin.
          </p>
        </div>
      </section>
    );
  }

  const allPrey = getAllPrey().filter((p) => (p.era || 1) <= era);
  const byEra = [1, 2, 3]
    .map((e) => ({ era: e, prey: allPrey.filter((p) => (p.era || 1) === e) }))
    .filter((g) => g.prey.length > 0);

  const handlePick = (preyId) => {
    if (!huntStatus.owned) return;
    if (activePreyId === preyId) {
      actions.clearActiveLoop?.();
    } else {
      actions.setActiveLoop?.("hunt", { preyId });
    }
  };

  return (
    <section className="action-panel action-panel--hunting">
      <div className="panel-header">
        <h2>Hunting</h2>
        <p className="muted">
          Stalk and strike. Better tools and a higher Hunting skill scale
          everything. Butchering scales drops.
        </p>
        <p className="muted" style={{ marginTop: 4 }}>
          🏹 Hunting Lv {huntingLvl} · cooldown{" "}
          {Math.round(getHuntCooldownMs(state) / 100) / 10}s
        </p>
        <CombatStylePicker state={state} actions={actions} />
      </div>

      {!huntCheck.ok && (
        <div className="patrol-armor-warn">⚠️ {huntCheck.reason}</div>
      )}

      <PileOfGoods pile={pile} />

      {isHuntLoop && (
        <div className="patrol-loop-status">
          <span>
            ▶ Auto-hunting{" "}
            {allPrey.find((p) => p.id === activePreyId)?.name || activePreyId}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => actions.clearActiveLoop?.()}
          >
            Stop
          </button>
        </div>
      )}

      {byEra.map((g) => (
        <div key={g.era} className="patrol-era-group">
          <h3 className="patrol-era-title">Era {g.era}</h3>
          <div className="patrol-card-grid">
            {g.prey.map((prey) => (
              <PreyCard
                key={prey.id}
                prey={prey}
                kills={preyDefeated[prey.id] || 0}
                isActive={activePreyId === prey.id}
                loopPct={activePreyId === prey.id ? loopPct : 0}
                onClick={() => handlePick(prey.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
(() => {
    if (!isHuntLoop) return;
    const id = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [isHuntLoop]);

  const loopPct = isHuntLoop ? getLoopProgress(loop) : 0;

  if (!huntStatus.owned) {
    return (
      <section className="action-panel action-panel--hunting">
        <div className="panel-header">
          <h2>Hunting</h2>
          <p className="muted">
            You need a hunting tool — a net or a bow. Craft one to begin.
          </p>
        </div>
      </section>
    );
  }

  const allPrey = getAllPrey().filter((p) => (p.era || 1) <= era);
  const byEra = [1, 2, 3]
    .map((e) => ({ era: e, prey: allPrey.filter((p) => (p.era || 1) === e) }))
    .filter((g) => g.prey.length > 0);

  const handlePick = (preyId) => {
    if (!huntStatus.owned) return;
    if (activePreyId === preyId) {
      actions.clearActiveLoop?.();
    } else {
      actions.setActiveLoop?.("hunt", { preyId });
    }
  };

  return (
    <section className="action-panel action-panel--hunting">
      <div className="panel-header">
        <h2>Hunting</h2>
        <p className="muted">
          Stalk and strike. Better tools and a higher Hunting skill scale
          everything. Butchering scales drops.
        </p>
        <p className="muted" style={{ marginTop: 4 }}>
          🏹 Hunting Lv {huntingLvl} · cooldown{" "}
          {Math.round(getHuntCooldownMs(state) / 100) / 10}s
        </p>
        <CombatStylePicker state={state} actions={actions} />
      </div>

      {!huntCheck.ok && (
        <div className="patrol-armor-warn">⚠️ {huntCheck.reason}</div>
      )}

      <PileOfGoods pile={pile} />

      {isHuntLoop && (
        <div className="patrol-loop-status">
          <span>
            ▶ Auto-hunting{" "}
            {allPrey.find((p) => p.id === activePreyId)?.name || activePreyId}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => actions.clearActiveLoop?.()}
          >
            Stop
          </button>
        </div>
      )}

      {byEra.map((g) => (
        <div key={g.era} className="patrol-era-group">
          <h3 className="patrol-era-title">Era {g.era}</h3>
          <div className="patrol-card-grid">
            {g.prey.map((prey) => (
              <PreyCard
                key={prey.id}
                prey={prey}
                kills={preyDefeated[prey.id] || 0}
                isActive={activePreyId === prey.id}
                loopPct={activePreyId === prey.id ? loopPct : 0}
                onClick={() => handlePick(prey.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
