// Patrol view (#66 → #67) — full center-column page for the combat loop.
//
// Shows every foe the player has access to as a card. Cards grouped by era,
// then by tier (common → uncommon → rare → apex). Click a card → click-to-
// fight: dispatches PATROL with that mob/boss id, auto-resolves through
// resolveFight, results land in the log.
//
// Bosses also appear as cards when their knowledge gates are met (via
// getBossesAvailable). Locked bosses appear dimmed with a "Need: …" hint
// from their requires schema, so the player sees the gate.
//
// While the patrol cooldown is active, all cards are disabled with the
// remaining time shown on each card.

import { useEffect, useState } from "react";
import {
  getAllMobs,
  getMobsForEra,
  MOB_CATEGORIES,
} from "../content/mobs.js";
import {
  getAllBosses,
  getBossesAvailable,
} from "../content/bosses.js";
import { canPatrol } from "../systems/patrol.js";
import { getEquippedMagicDef, getEquippedRangedDef } from "../systems/combat.js";

// Combat style picker (#82) — Melvor-style melee / ranged / magic toggle.
// Disables a style if the player has no compatible gear.
function CombatStylePicker({ state, actions }) {
  const style = state.run?.combatStyle || "melee";
  const hasRanged = !!getEquippedRangedDef(state.run);
  const hasMagic = !!getEquippedMagicDef(state.run);
  const spirit = state.run?.stats?.spirit ?? 0;
  const styles = [
    { id: "melee", icon: "⚔️", label: "Melee", available: true, tip: "STR-driven attacks. No resource cost." },
    { id: "ranged", icon: "🏹", label: "Ranged", available: hasRanged, tip: hasRanged ? "DEX-driven bow/throwing attacks." : "Equip a ranged weapon." },
    { id: "magic", icon: "✨", label: "Magic", available: hasMagic, tip: hasMagic ? `MAG-driven attacks. Costs Spirit per swing (have ${Math.round(spirit)}).` : "Equip an arcane weapon (e.g. Fragment Knife) in either hand." },
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
          title={s.tip}
        >
          <span aria-hidden="true">{s.icon}</span> {s.label}
        </button>
      ))}
    </div>
  );
}
import { getUnarmoredPenalty } from "../systems/combat.js";
import { computeEra } from "../systems/era.js";
import { getResource, getDisplayResource } from "../content/resources.js";
import { getResourceCap } from "../systems/storage.js";
import { getActiveLoop, getLoopProgress } from "../systems/loop.js";
import { getWorkerCount, getWorkerCycleMs } from "../systems/workers.js";

const TIER_ORDER = { common: 0, uncommon: 1, rare: 2, apex: 3 };
const TIER_LABEL = { common: "Common", uncommon: "Uncommon", rare: "Rare", apex: "Apex" };

// "era 1" → "Era One" — flavor reads better in card sublines (#105).
const ERA_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const eraLabel = (n) => `Era ${ERA_WORDS[n] || n}`;
const TIER_KIND = { common: "common", uncommon: "uncommon", rare: "rare", apex: "apex" };

// Reveal thresholds (#70) — drives the idle-RPG "see ??? until you've
// fought it enough" loop. Each field unlocks at the listed kill count
// for that specific mob (read state.run.mobsDefeated[mobId]).
const REVEAL = {
  hp: 1,   // first kill reveals HP
  damage: 3,   // 3 kills reveals damage range
  accuracy: 5,
  damageType: 10,
  dropNames: 1,   // 1 kill shows what drops, but not qty/chance
  dropQty: 5,
  dropChance: 10,
};
function nextRevealHint(kills) {
  // Returns the next thing about to unlock — used as flavor text.
  if (kills < REVEAL.hp) return "Beat 1 to reveal HP.";
  if (kills < REVEAL.dropNames) return "Beat 1 to see what it drops.";
  if (kills < REVEAL.damage) return `Beat ${REVEAL.damage - kills} more to reveal its damage.`;
  if (kills < REVEAL.dropQty) return `Beat ${REVEAL.dropQty - kills} more to learn how much it drops.`;
  if (kills < REVEAL.accuracy) return `Beat ${REVEAL.accuracy - kills} more to read its accuracy.`;
  if (kills < REVEAL.damageType) return `Beat ${REVEAL.damageType - kills} more to learn its kind.`;
  if (kills < REVEAL.dropChance) return `Beat ${REVEAL.dropChance - kills} more to learn drop odds.`;
  return null;
}

// Format a drops table for the card.
function formatDrop(d) {
  const res = getResource(d.resource);
  const name = res?.name || d.resource;
  const icon = res?.icon || "";
  const qty = Array.isArray(d.qty) ? `${d.qty[0]}–${d.qty[1]}` : String(d.qty || 1);
  const pct = Math.round((d.chance || 1) * 100);
  return { icon, name, qty, pct, id: d.resource };
}

function MobCard({ mob, state, killCount, isActive, loopPct, onClick }) {
  const dmgType = mob.combat?.damageType || "hp";
  const drops = (mob.drops || []).map(formatDrop);

  return (
    <button
      type="button"
      className={`patrol-card patrol-card--tier-${TIER_KIND[mob.tier] || "common"} ${isActive ? "is-active-loop" : ""
        }`}
      onClick={onClick}
      title={
        isActive
          ? `Auto-engaging — click another to swap, or Stop to halt.`
          : `Engage ${mob.name} (auto-loops until interrupted)`
      }
    >
      <div className="patrol-card-head">
        <span className="patrol-card-icon" aria-hidden="true">{mob.icon}</span>
        <div className="patrol-card-title">
          <div className="patrol-card-name">{mob.name}</div>
          <div className="patrol-card-sub">
            <span className={`patrol-card-tier patrol-card-tier--${mob.tier || "common"}`}>
              {TIER_LABEL[mob.tier] || "Common"}
            </span>
            <span className="patrol-card-kind muted">· {mob.kind || "foe"}</span>
            {killCount > 0 && (
              <span className="patrol-card-kills">· beaten ×{killCount}</span>
            )}
          </div>
        </div>
      </div>

      <p className="patrol-card-desc muted">{mob.description}</p>

      <div className="patrol-card-stats">
        <div className="patrol-card-stat" title="Hit points">
          <span aria-hidden="true">❤️</span>{" "}
          {killCount >= REVEAL.hp ? (mob.combat?.hp ?? "?") : <span className="muted">???</span>}
        </div>
        <div className="patrol-card-stat" title="Attack accuracy">
          <span aria-hidden="true">🎯</span>{" "}
          {killCount >= REVEAL.accuracy
            ? `${Math.round((mob.combat?.acc ?? 0) * 100)}%`
            : <span className="muted">???</span>}
        </div>
        <div
          className="patrol-card-stat"
          title={killCount >= REVEAL.damageType ? `Damage type: ${dmgType}` : "Damage type unknown"}
        >
          <span aria-hidden="true">
            {killCount >= REVEAL.damageType
              ? (dmgType === "sanity" ? "◐" : dmgType === "spirit" ? "✨" : "⚔️")
              : "?"}
          </span>{" "}
          {killCount >= REVEAL.damage
            ? `${mob.combat?.damage?.min ?? "?"}–${mob.combat?.damage?.max ?? "?"}`
            : <span className="muted">???</span>}
        </div>
      </div>

      {drops.length > 0 && (
        <div className="patrol-card-drops">
          <div className="patrol-card-drops-label muted">Drops</div>
          {killCount < REVEAL.dropNames ? (
            <div className="patrol-card-drops-locked muted">???</div>
          ) : (
            <ul className="patrol-card-drops-list">
              {drops.map((d) => (
                <li key={d.id} className="patrol-card-drop">
                  <span aria-hidden="true">{d.icon}</span>
                  <span className="patrol-card-drop-name">{d.name}</span>
                  <span className="muted">
                    {killCount >= REVEAL.dropQty ? `×${d.qty}` : "×?"}
                    {killCount >= REVEAL.dropChance ? ` · ${d.pct}%` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {nextRevealHint(killCount) && (
        <div className="patrol-card-reveal-hint muted">
          🔎 {nextRevealHint(killCount)}
        </div>
      )}

      <div className="patrol-card-cta">
        {isActive ? "Engaging…" : "Engage"}
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

function BossCard({ boss, state, isActive, loopPct, locked, unlockHint, onClick }) {
  const beaten = !!state.persistent.bossesDefeated?.[boss.id];

  return (
    <button
      type="button"
      className={`patrol-card patrol-card--boss ${locked ? "is-locked" : ""} ${isActive ? "is-active-loop" : ""
        }`}
      onClick={locked ? undefined : onClick}
      disabled={locked}
      title={
        locked
          ? unlockHint
          : isActive
            ? `Auto-challenging — click another to swap.`
            : `Challenge ${boss.name}`
      }
    >
      <div className="patrol-card-head">
        <span className="patrol-card-icon" aria-hidden="true">{boss.icon}</span>
        <div className="patrol-card-title">
          <div className="patrol-card-name">{boss.name}</div>
          <div className="patrol-card-sub">
            <span className="patrol-card-tier patrol-card-tier--apex">
              {boss.tier === "main" ? "Main Boss" : "Mini Boss"}
            </span>
            <span className="patrol-card-kind muted">· {eraLabel(boss.era)}</span>
            {beaten && <span className="patrol-card-kills">· beaten</span>}
          </div>
        </div>
      </div>

      <p className="patrol-card-desc muted">{boss.description}</p>

      {locked ? (
        <div className="patrol-card-lock">
          🔒 {unlockHint}
        </div>
      ) : (
        <>
          <div className="patrol-card-stats">
            <div className="patrol-card-stat">
              <span aria-hidden="true">❤️</span> {boss.combat?.hp ?? "?"}
            </div>
            <div className="patrol-card-stat">
              <span aria-hidden="true">🎯</span> {Math.round((boss.combat?.acc ?? 0) * 100)}%
            </div>
            <div className="patrol-card-stat">
              <span aria-hidden="true">⚔️</span> {boss.combat?.damage?.min}–{boss.combat?.damage?.max}
            </div>
          </div>
          <div className="patrol-card-cta patrol-card-cta--boss">
            {isActive ? "Challenging…" : "Challenge"}
          </div>
          {isActive && (
            <span
              className="patrol-card-loopbar"
              style={{ transform: `scaleX(${loopPct})` }}
              aria-hidden="true"
            />
          )}
        </>
      )}
    </button>
  );
}

// Pile of Goods — what you've looted from the current target since you
// started auto-engaging. Resets when you swap targets or stop.
function PileOfGoods({ state, activeLoop, activeMobId, activeBossId, onStop }) {
  const pile = state.run.activePile?.drops || {};
  const ids = Object.keys(pile).filter((id) => (pile[id] || 0) > 0);
  const workerCount = getWorkerCount(state);
  const workerCycleSec = Math.round(getWorkerCycleMs() / 1000);
  const targetName = (() => {
    if (activeMobId) {
      // Lookup the mob's name from the era-pool we have in scope at call site
      // — easier: just read run.activeLoop.target and let the caller pass it.
      return null;
    }
    return null;
  })();

  return (
    <aside className="patrol-pile">
      <div className="patrol-pile-head">
        <div className="patrol-pile-title">
          {activeLoop ? (
            <>
              <span className="patrol-pile-dot patrol-pile-dot--live" /> Engaging
            </>
          ) : (
            <>
              <span className="patrol-pile-dot" /> Idle
            </>
          )}
        </div>
        <div className="patrol-pile-head-right">
          {workerCount > 0 && (
            <span
              className="patrol-pile-workers"
              title={`${workerCount} hired townsperson${workerCount === 1 ? "" : "s"} patrol the Era 1 wilds for you (~${workerCycleSec}s per worker per fight). Drops land in your inventory; check the Recent log.`}
            >
              🛠 × {workerCount}
            </span>
          )}
          {activeLoop && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={onStop}
              title="Stop the auto-engage loop"
            >
              Stop
            </button>
          )}
        </div>
      </div>
      {ids.length === 0 ? (
        <p className="patrol-pile-empty muted">
          {activeLoop ? "Spoils will pile up here…" : "Pick a foe to begin."}
        </p>
      ) : (
        <ul className="patrol-pile-list">
          {ids.map((id) => {
            const res = getResource(id);
            const display = res ? getDisplayResource(state, res) : null;
            const owned = state.run.inventory?.[id] || 0;
            const cap = res ? getResourceCap(state, id) : null;
            const capStr =
              cap == null || cap === Infinity ? "" : ` / ${cap}`;
            return (
              <li key={id} className="patrol-pile-item">
                <span className="patrol-pile-icon" aria-hidden="true">
                  {display?.icon || res?.icon || "📦"}
                </span>
                <span className="patrol-pile-qty">×{pile[id]}</span>
                <div className="patrol-pile-tooltip">
                  <div className="patrol-pile-tip-head">
                    <span className="patrol-pile-tip-icon" aria-hidden="true">
                      {display?.icon || res?.icon || "📦"}
                    </span>
                    <span className="patrol-pile-tip-name">
                      {display?.name || res?.name || id}
                    </span>
                    <span className="patrol-pile-tip-qty muted">
                      {owned}{capStr}
                    </span>
                  </div>
                  <p className="patrol-pile-tip-desc muted">
                    {display?.description || res?.description || ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

// Build a human-readable "Need: X" hint from a boss's requires/elementalGate.
function describeLock(boss, state) {
  const parts = [];
  const r = boss.requires || {};
  if (r.researched && !state.run.researched?.[r.researched]) {
    parts.push(`learn ${r.researched}`);
  }
  if (r.hasBuilding && !state.run.built?.[r.hasBuilding]) {
    parts.push(`build a ${r.hasBuilding}`);
  }
  if (r.hutBuilt && !state.run.built?.hut) {
    parts.push("build a hut");
  }
  if (boss.elementalGate) {
    const completed = Object.keys(state.run.studiesCompleted || {});
    const match = completed.some((sid) => sid.startsWith(`${boss.elementalGate}_`));
    if (!match) parts.push(`complete any ${boss.elementalGate} study`);
  }
  return parts.length === 0
    ? "Not yet."
    : `Need: ${parts.join(", ")}.`;
}

export default function PatrolView({ state, actions }) {
  const era = computeEra(state);
  const [, force] = useState(0);

  // Active-loop UI tick — re-render at ~10fps while a patrol loop is
  // running so the per-card progress bar moves smoothly between the
  // store's 250ms commits.
  const activeLoop = getActiveLoop(state);
  const hasLoop = !!activeLoop && activeLoop.kind === "patrol";
  useEffect(() => {
    if (!hasLoop) return;
    const id = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [hasLoop]);

  const check = canPatrol(state);
  const loopPct = getLoopProgress(activeLoop);
  const activeMobId = activeLoop?.target?.mobId || null;
  const activeBossId = activeLoop?.target?.bossId || null;

  const mobs = getMobsForEra(era).slice().sort((a, b) => {
    if ((a.era || 1) !== (b.era || 1)) return (a.era || 1) - (b.era || 1);
    return (TIER_ORDER[a.tier] || 0) - (TIER_ORDER[b.tier] || 0);
  });
  const bossesAll = getAllBosses().filter((b) => (b.era || 1) <= era);
  const unlockedBossIds = new Set(getBossesAvailable(state).map((b) => b.id));

  // Group by era.
  const byEra = {};
  for (const m of mobs) {
    const e = m.era || 1;
    (byEra[e] = byEra[e] || { mobs: [], bosses: [] }).mobs.push(m);
  }
  for (const b of bossesAll) {
    const e = b.era || 1;
    (byEra[e] = byEra[e] || { mobs: [], bosses: [] }).bosses.push(b);
  }

  const eras = Object.keys(byEra).map(Number).sort((a, b) => a - b);

  // Click engaged card → stop. Click different card → swap target.
  // Click locked/blocked → ignore. Mirror of Gather/Hunting pattern.
  const handleMob = (mobId) => {
    if (activeMobId === mobId) {
      actions.clearActiveLoop?.();
      return;
    }
    if (!check.ok) return;
    actions.setActiveLoop("patrol", { mobId });
  };
  const handleBoss = (bossId) => {
    if (activeBossId === bossId) {
      actions.clearActiveLoop?.();
      return;
    }
    if (!check.ok) return;
    actions.setActiveLoop("patrol", { bossId });
  };
  const handleStop = () => actions.clearActiveLoop();

  return (
    <section className="action-panel action-panel--patrol">
      <div className="panel-header">
        <h2>Patrol</h2>
        <p className="muted">
          What walks the wasteland — and what walks toward you. Click a foe to auto-engage.
        </p>
        <CombatStylePicker state={state} actions={actions} />
        {!check.ok && !hasLoop && (
          <div className="patrol-status muted">
            <span className="patrol-status-blocked">⚠️ {check.reason}</span>
          </div>
        )}
        {(() => {
          const pen = getUnarmoredPenalty(state);
          if (pen.accPenalty === 0) return null;
          const pct = Math.round(pen.accPenalty * 100);
          const dmg = Math.round((pen.dmgMult - 1) * 100);
          return (
            <div
              className="patrol-armor-warn"
              title={`You're wearing ${pen.armored}/5 armor pieces. The wasteland eats the underdressed.`}
            >
              🩸 Underdressed: −{pct}% accuracy, +{dmg}% damage taken.{" "}
              <span className="muted">
                ({pen.armored}/5 armor slots filled — equip head/chest/legs/boots/gloves to soften it.)
              </span>
            </div>
          );
        })()}
      </div>

      <PileOfGoods
        state={state}
        activeLoop={activeLoop}
        activeMobId={activeMobId}
        activeBossId={activeBossId}
        onStop={handleStop}
      />

      {eras.map((e) => {
        const group = byEra[e];
        return (
          <div key={e} className="patrol-era">
            <h3 className="patrol-era-title">Era {e}</h3>
            <div className="patrol-grid">
              {group.mobs.map((m) => (
                <MobCard
                  key={m.id}
                  mob={m}
                  state={state}
                  killCount={state.run.mobsDefeated?.[m.id] || 0}
                  isActive={activeMobId === m.id}
                  loopPct={activeMobId === m.id ? loopPct : 0}
                  onClick={() => handleMob(m.id)}
                />
              ))}
              {group.bosses.map((b) => {
                const locked = !unlockedBossIds.has(b.id);
                return (
                  <BossCard
                    key={b.id}
                    boss={b}
                    state={state}
                    isActive={activeBossId === b.id}
                    loopPct={activeBossId === b.id ? loopPct : 0}
                    locked={locked}
                    unlockHint={locked ? describeLock(b, state) : null}
                    onClick={() => handleBoss(b.id)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
