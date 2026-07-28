// Town view (#186 — economy chunk 4).
//
// Center-view that consolidates the population + housing + production
// systems built in #182-#184. Replaces the Wasteland view from Era 2
// onward (Shell.jsx routes view==="world" → TownView when era>=2).
//
// Layout:
//   ┌─────────────────────────────────────────────────────┐
//   │  🏠 Settlement                  Population N / M     │
//   │  Growth status (food/water/sanity OK / blocked)      │
//   ├─────────────────────────────────────────────────────┤
//   │  Housing                                              │
//   │  ┌──────┐ ┌──────┐ ┌──────┐                          │
//   │  Production                                           │
//   │  ┌──────┐ ┌──────┐ ┌──────┐ (staffed N/M · output)   │
//   │  Arcane                                               │
//   │  ┌──────┐ ┌──────┐                                    │
//   └─────────────────────────────────────────────────────┘

import { useEffect, useState } from "react";
import { getAllBuildings } from "../content/buildings.js";
import {
  getHousingCap,
  populationGrowthEnabled,
  getAssignments,
  getConsumptionRates,
  getShortageStatus,
  getNetProductionRates,
  getNetProductionBreakdown,
  getMoraleMult,
  getMoraleFactors,
  getNextTradeAt,
} from "../systems/town.js";
import { canBuild, canRepair } from "../systems/building.js";
import { computeEra } from "../systems/era.js";
import { getPrestigeReward } from "../systems/prestige.js";
import { getActiveCompanionBonus } from "../systems/companions.js";
import { getCompanion } from "../content/companions.js";
import { isRebellionActive, getRebellionInfo } from "../systems/rebellion.js";
import { getActiveSummon } from "../systems/summoning.js";
import { getSummon } from "../content/summons.js";
import { getReckoningFraction, getReckoningPhase, getReckoningRemainingMs } from "../systems/reckoning.js";
import { getHerald } from "../content/heralds.js";
import { canFireApex } from "../systems/apex.js";
import { APEX_EVENTS } from "../content/reckoning.js";

// Categorize buildings into UI sections. Falls back to "Other" for any
// building category we don't have an explicit mapping for. Order in this
// array is the render order on the page.
const SECTIONS = [
  { id: "shelter",    title: "🏠 Housing",     filter: (b) => b.category === "shelter" || (b.housing || 0) > 0 },
  { id: "production", title: "⚒️ Production",  filter: (b) => b.category === "production" || (b.staffSlots || 0) > 0 || b.productionRecipe },
  { id: "storage",    title: "📦 Storage",     filter: (b) => b.storageCaps && Object.keys(b.storageCaps).length > 0 },
  { id: "arcane",     title: "🕯️ Arcane",      filter: (b) => b.category === "arcane" },
  { id: "comfort",    title: "🔥 Comfort",     filter: (b) => b.category === "comfort" },
  { id: "other",      title: "🏗️ Other",       filter: () => true }, // catch-all
];

function categorizeAll(state) {
  const built = state.run?.built || {};
  const allBuildings = getAllBuildings();
  const buckets = {};
  for (const s of SECTIONS) buckets[s.id] = [];
  const seen = new Set();
  for (const s of SECTIONS) {
    for (const b of allBuildings) {
      if (seen.has(b.id)) continue;
      if (s.filter(b)) {
        buckets[s.id].push(b);
        seen.add(b.id);
      }
    }
  }
  return buckets;
}

function BuildingCard({ b, state, actions }) {
  const built = !!state.run?.built?.[b.id];
  const check = canBuild(state, b.id);
  const inv = state.run?.inventory || {};
  const auto = getAssignments(state);
  const assigned = auto[b.id] || 0;
  const locked = state.run?.assignments?.[b.id]?.locked;
  const cap = b.staffSlots || 0;
  const recipe = b.productionRecipe;
  const ratePerMin = recipe ? (recipe.perVillagerPerMinute || 0) * assigned : 0;

  // Output line — what this building gives back per minute (live).
  let outputLine = "";
  if (recipe?.output && ratePerMin > 0) {
    const parts = Object.entries(recipe.output).map(([r, q]) => `+${(q * ratePerMin).toFixed(2)} ${r}/min`);
    outputLine = parts.join(" · ");
  } else if (b.passiveProduce) {
    const parts = Object.entries(b.passiveProduce).map(([r, c]) => `+${(c.perMinute || 0).toFixed(2)} ${r}/min`);
    outputLine = parts.join(" · ");
  } else if (b.effect?.spiritPerMinute || b.effect?.sanityPerMinute) {
    const parts = [];
    if (b.effect.sanityPerMinute) parts.push(`+${b.effect.sanityPerMinute} sanity/min`);
    if (b.effect.spiritPerMinute) parts.push(`+${b.effect.spiritPerMinute} spirit/min`);
    outputLine = parts.join(" · ");
  }

  const cardCls = `patrol-card patrol-card--magic ${built ? "" : "is-locked"} ${!built && !check.ok ? "is-disabled" : ""}`;

  return (
    <div className={cardCls} title={b.description}>
      <div className="patrol-card-head">
        <span className="patrol-card-icon" aria-hidden="true">{b.icon}</span>
        <div className="patrol-card-title">
          <div className="patrol-card-name">{b.name}</div>
          <div className="patrol-card-sub">
            {built ? (
              <span className="patrol-card-tier patrol-card-tier--common">✔ built</span>
            ) : (
              <span className="patrol-card-tier patrol-card-tier--uncommon">unbuilt</span>
            )}
            {(b.housing || 0) > 0 && (
              <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                · houses {b.housing}
              </span>
            )}
            {cap > 0 && built && (
              <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                · 👥 {assigned}/{cap}{locked != null ? " 🔒" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* #187 — manual staffing controls on built production buildings. */}
      {built && cap > 0 && (
        <div className="building-staffing-ctrl"
          style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, padding: "4px 6px", background: "rgba(220,154,74,0.05)", borderRadius: 4 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ padding: "2px 8px", fontSize: 14 }}
            title="Decrease assignment (locks at this count)"
            onClick={() => actions.assignBuilding(b.id, Math.max(0, assigned - 1))}
          >−</button>
          <span
            style={{ fontSize: 11, minWidth: 50, textAlign: "center" }}
            className="town-assign-pulse"
            key={assigned}
          >
            {locked != null ? `locked ${locked}/${cap}` : `auto ${assigned}/${cap}`}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ padding: "2px 8px", fontSize: 14 }}
            title="Increase assignment (locks at this count)"
            onClick={() => actions.assignBuilding(b.id, Math.min(cap, assigned + 1))}
          >+</button>
          {locked != null && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ padding: "2px 6px", fontSize: 10, marginLeft: "auto" }}
              title="Clear lock — auto-fill takes over again"
              onClick={() => actions.assignBuilding(b.id, null)}
            >Auto</button>
          )}
        </div>
      )}

      <p className="patrol-card-desc muted" style={{ fontSize: 11 }}>
        {b.description}
      </p>

      {/* Output ticker for built buildings */}
      {built && outputLine && (
        <div className="muted" style={{ fontSize: 11, padding: "2px 4px", background: "rgba(220,154,74,0.06)", borderRadius: 4 }}>
          {outputLine}
        </div>
      )}
      {built && cap > 0 && assigned === 0 && (
        <div className="muted" style={{ fontSize: 11, fontStyle: "italic" }}>
          No villagers — staffing stalled.
        </div>
      )}

      {/* #204 — storage card: list per-resource caps with companion mult. */}
      {built && b.storageCaps && (() => {
        const compBonus = getActiveCompanionBonus(state);
        const mult = compBonus.storageCapMult || 1.0;
        const entries = Object.entries(b.storageCaps);
        return (
          <div className="muted" style={{ fontSize: 11, padding: "2px 4px", background: "rgba(220,154,74,0.06)", borderRadius: 4 }}>
            Caps:{" "}
            {entries.map(([res, qty], i) => (
              <span key={res}>
                {i > 0 && " · "}
                +{mult !== 1.0 ? Math.floor(qty * mult) : qty} {res}
              </span>
            ))}
            {mult !== 1.0 && (
              <span style={{ marginLeft: 6, color: "#7fc97f" }}>
                (×{mult.toFixed(2)} via companion)
              </span>
            )}
          </div>
        );
      })()}

      {/* #200 — trade route countdown */}
      {built && b.tradeRoute && (() => {
        const nextAt = getNextTradeAt(state, b.id);
        if (nextAt <= 0) return null;
        const remainMs = Math.max(0, nextAt - Date.now());
        const min = Math.floor(remainMs / 60000);
        const sec = Math.floor((remainMs % 60000) / 1000);
        return (
          <div className="muted" style={{ fontSize: 11, padding: "2px 4px", background: "rgba(220,154,74,0.08)", borderRadius: 4 }}>
            🪙 Next trade in {min}m {sec.toString().padStart(2, "0")}s
          </div>
        );
      })()}

      {/* Cost row for unbuilt */}
      {!built && (
        <div className="patrol-card-drops">
          <div className="patrol-card-drops-label muted" style={{ fontSize: 10 }}>Cost</div>
          <ul className="patrol-card-drops-list" style={{ fontSize: 11 }}>
            {Object.entries(b.cost || {}).map(([res, qty]) => {
              const have = inv[res] || 0;
              const enough = have >= qty;
              return (
                <li key={res} className="patrol-card-drop">
                  <span className={enough ? "" : "patrol-card-drop-name"}
                    style={{ color: enough ? undefined : "#c34141" }}>
                    {res} ×{qty} ({have})
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!built && (
        <button
          type="button"
          className="btn btn-primary btn-sm patrol-card-cta-btn"
          disabled={!check.ok}
          title={check.ok ? `Build ${b.name}` : check.reason}
          onClick={() => actions.build(b.id)}
        >
          {check.ok ? "Build" : "Locked"}
        </button>
      )}
    </div>
  );
}

function PopulationHeader({ state }) {
  const pop = state.run?.population ?? 0;
  const cap = getHousingCap(state);
  const growing = populationGrowthEnabled(state);
  const consumption = getConsumptionRates(state);
  const food = state.run?.inventory?.food || 0;
  const water =
    (state.run?.inventory?.water_stagnant || 0) +
    (state.run?.inventory?.water_muddy || 0) +
    (state.run?.inventory?.water_boiled || 0);
  const sanity = state.run?.stats?.sanity ?? 50;

  const blockers = [];
  if (food < 5) blockers.push(`food (${food}/5)`);
  if (water < 1) blockers.push(`water (${water}/1)`);
  if (sanity < 30) blockers.push(`sanity (${Math.round(sanity)}/30)`);

  return (
    <div
      className="patrol-card patrol-card--magic"
      style={{ marginBottom: 12 }}
      title="Population grows passively when food/water/sanity thresholds are met, up to housing cap."
    >
      <div className="patrol-card-head">
        <span className="patrol-card-icon" aria-hidden="true">🏠</span>
        <div className="patrol-card-title" style={{ flex: 1 }}>
          <div className="patrol-card-name">
            Settlement
            <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>
              {pop} / {cap} villagers
            </span>
          </div>
          <div className="patrol-card-sub">
            {pop >= cap ? (
              <span className="patrol-card-tier patrol-card-tier--common">At capacity — build more shelter to grow.</span>
            ) : growing ? (
              <span className="patrol-card-tier patrol-card-tier--rare">🌱 Growing — +1 villager every 5 min</span>
            ) : (
              <span className="patrol-card-tier patrol-card-tier--uncommon">
                ⚠️ Stalled — need {blockers.join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* #192 — consumption ticker. Shows what the settlement burns through */}
      {/* every minute. Workers at production buildings push these into the */}
      {/* black; without them, the stockpile bleeds. */}
      {/* #199 — morale bar. Low morale slows production, high morale boosts. */}
      {pop > 0 && (() => {
        const morale = state.run?.morale ?? 50;
        const mult = getMoraleMult(state);
        const moraleColor = morale < 30 ? "#c34141" : morale > 70 ? "#7fc97f" : "#d09a4a";
        const moraleLabel = morale < 20 ? "Despondent" : morale < 40 ? "Grim" : morale < 60 ? "Settled" : morale < 80 ? "Hopeful" : "Joyful";
        const factors = getMoraleFactors(state);
        const target = Math.max(0, Math.min(100, factors.reduce((a, f) => a + f.delta, 0)));
        const tooltipLines = ["Morale drifts toward equilibrium at +5/min:"];
        for (const f of factors) {
          tooltipLines.push(`  ${f.delta >= 0 ? "+" : ""}${f.delta}  ${f.label}`);
        }
        tooltipLines.push(`  ──`);
        tooltipLines.push(`  =${target} target equilibrium`);
        const tooltip = tooltipLines.join("\n");
        return (
          <div
            style={{ marginTop: 6, padding: "6px 8px", background: `${moraleColor}15`, borderLeft: `3px solid ${moraleColor}`, borderRadius: 4, fontSize: 11 }}
            title={tooltip}
          >
            ✨ <strong>Morale: {Math.round(morale)}</strong> ({moraleLabel}) — production ×{mult.toFixed(2)}
            {target !== Math.round(morale) && (
              <span className="muted" style={{ marginLeft: 6 }}>
                → drifting to {target}
              </span>
            )}
          </div>
        );
      })()}

      {pop > 0 && (
        <div
          className="muted"
          style={{ marginTop: 6, padding: "6px 8px", background: "rgba(195,65,65,0.07)", borderRadius: 4, fontSize: 11 }}
          title="Each villager passively consumes food, water, and wood every minute. Staff production buildings to outpace this drain."
        >
          🔥 Consumption ({pop} villager{pop === 1 ? "" : "s"}):{" "}
          <strong>-{consumption.food.toFixed(2)} food/min</strong>
          {" · "}
          <strong>-{consumption.water.toFixed(2)} water/min</strong>
          {" · "}
          <strong>-{consumption.wood.toFixed(2)} wood/min</strong>
        </div>
      )}

      {/* #194 — net production delta. Shows surplus / deficit per key */}
      {/* resource across production - consumption. */}
      {pop > 0 && (() => {
        const net = getNetProductionRates(state);
        const keys = ["food", "water", "water_muddy", "water_boiled", "wood", "stone", "bread", "fragments"];
        const visible = keys.map((k) => ({ k, v: net[k] || 0 })).filter((e) => Math.abs(e.v) > 0.01);
        if (visible.length === 0) return null;
        const breakdown = getNetProductionBreakdown(state);
        const tooltipLines = ["Net flow per minute (per source):"];
        for (const e of visible) {
          tooltipLines.push("");
          tooltipLines.push(`${e.k}:`);
          const sources = breakdown[e.k] || [];
          for (const s of sources) {
            tooltipLines.push(`  ${s.perMin > 0 ? "+" : ""}${s.perMin.toFixed(2)}  ${s.source}`);
          }
        }
        return (
          <div
            className="muted"
            style={{ marginTop: 6, padding: "6px 8px", background: "rgba(74,220,150,0.06)", borderRadius: 4, fontSize: 11 }}
            title={tooltipLines.join("\n")}
          >
            📊 Net:{" "}
            {visible.map((e, i) => (
              <span key={e.k}>
                {i > 0 && " · "}
                <strong style={{ color: e.v > 0 ? "#7fc97f" : "#c34141" }}>
                  {e.v > 0 ? "+" : ""}{e.v.toFixed(2)} {e.k}/min
                </strong>
              </span>
            ))}
          </div>
        );
      })()}

      {/* #193 — starvation banner. Shows current shortage tier per */}
      {/* resource. Tier escalates: warn → sanity → leaves → deaths. */}
      {(() => {
        const shortages = getShortageStatus(state);
        const entries = Object.entries(shortages);
        if (entries.length === 0) return null;
        const worstTier = entries.reduce((acc, [, s]) => {
          const rank = { warn: 1, sanity: 2, leaves: 3, deaths: 4 }[s.tier] || 0;
          return rank > acc ? rank : acc;
        }, 0);
        const tierLabel = ["", "starving", "starving — sanity bleeding", "starving — villagers leaving", "STARVING — villagers dying"][worstTier];
        const tierColor = ["", "#d09a4a", "#d07a4a", "#c34141", "#9b1313"][worstTier];
        return (
          <div
            style={{ marginTop: 6, padding: "6px 8px", background: `${tierColor}25`, borderLeft: `3px solid ${tierColor}`, borderRadius: 4, fontSize: 11, fontWeight: 600, color: tierColor }}
            title="Sustained shortage drains sanity → makes villagers leave → kills them. Build production buildings or reduce population."
          >
            ⚠️ Settlement is {tierLabel} — short on{" "}
            {entries.map(([r, s], i) => (
              <span key={r}>{i > 0 ? ", " : ""}{r} ({Math.floor(s.ms / 1000)}s)</span>
            ))}
          </div>
        );
      })()}

      {/* #213 — rebellion banner. Fires when run.rebellionActiveSince is set. */}
      {isRebellionActive(state) && (() => {
        const info = getRebellionInfo(state);
        const sumLive = getActiveSummon(state);
        const suppressed =
          (sumLive?.def?.bonuses?.suppressesRebellion === true) ||
          ((state.run.alignment?.evil || 0) >= 20);
        return (
          <div
            style={{ marginTop: 6, padding: "8px 10px", background: "#9b131330", borderLeft: "3px solid #c34141", borderRadius: 4, fontSize: 12, fontWeight: 700, color: "#c34141" }}
            title="Rebellion fires per-60s rounds: resource sweep, building damage, villager loss, assignment clears. Raise morale to ≥30 to end, or suppress with an evil summon / high alignment evil."
          >
            🔥 REBELLION — villagers are destroying the settlement
            {suppressed && <span style={{ marginLeft: 8, color: "#888", fontWeight: 400 }}>(suppressed — morale still low)</span>}
            <div style={{ fontSize: 10, color: "#aaa", fontWeight: 400, marginTop: 3 }}>
              Morale {Math.round(info.morale)}. Path home: raise morale ≥30, bind Aspect of the First Light, or summon Whisper-Bound / Garden-Spirit for +morale/min.
            </div>
          </div>
        );
      })()}

      {/* Morale-low warning (pre-rebellion grace period). */}
      {!isRebellionActive(state) && (() => {
        const info = getRebellionInfo(state);
        if (!info.moraleLowSince || info.lowMsToTrigger <= 0) return null;
        const secs = Math.ceil(info.lowMsToTrigger / 1000);
        return (
          <div
            style={{ marginTop: 6, padding: "6px 8px", background: "#c3414125", borderLeft: "3px solid #c34141", borderRadius: 4, fontSize: 11, color: "#c34141" }}
            title="If morale stays below 20 for 5 sustained minutes, rebellion fires."
          >
            ⚠️ Morale critically low — rebellion in {secs}s if it doesn't recover
          </div>
        );
      })()}

      {/* #225 — Era 5 Reckoning Clock banner. */}
      {state.run?.reckoningClock && (() => {
        const remain = getReckoningRemainingMs(state) || 0;
        const phase = getReckoningPhase(state) || "shudders";
        const arc = state.run.eraArc || "mending";
        const mins = Math.floor(remain / 60000);
        const secs = Math.floor((remain % 60000) / 1000);
        const arcColor = arc === "communion" ? "#8a3030" : arc === "defiance" ? "#888" : "#7fc97f";
        const paused = state.run.reckoningClockPaused;
        return (
          <div
            style={{ marginTop: 6, padding: "8px 10px", background: `${arcColor}25`, borderLeft: `3px solid ${arcColor}`, borderRadius: 4, fontSize: 12, fontWeight: 700, color: arcColor }}
            title={`Era 5 reckoning clock. ${arc} path. Phase: ${phase}. Apex fires when the clock reaches 0.`}
          >
            🌌 Reckoning Clock — {arc} · {phase} · {mins}m {secs.toString().padStart(2,"0")}s remaining{paused ? " (PAUSED)" : ""}
          </div>
        );
      })()}

      {/* #235 — Apex Fire CTA. */}
      {state.run?.reckoningClock && state.run?.reckoningPhase === "apex" && (() => {
        const check = canFireApex(state);
        const def = APEX_EVENTS[state.run.eraArc] || null;
        if (!def) return null;
        const arc = state.run.eraArc;
        const arcColor = arc === "communion" ? "#8a3030" : arc === "defiance" ? "#888" : "#7fc97f";
        const ritualCost = Object.entries(def.ritualCost || {})
          .map(([r, q]) => `${q} ${r}`).join(", ");
        return (
          <div
            style={{ marginTop: 6, padding: "10px 12px", background: `${arcColor}30`, border: `2px solid ${arcColor}`, borderRadius: 6, fontSize: 12 }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: arcColor, marginBottom: 4 }}>
              🌌 Apex Ready: {def.name}
            </div>
            <div style={{ marginBottom: 6, color: "#ccc" }}>
              Cost: {ritualCost}. {def.villagerCost ? `Villagers consumed: ${def.villagerCost}. ` : ""}{check.reason || "All requirements met."}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!check.ok}
              title={check.ok ? `Fire ${def.name}` : check.reason}
              onClick={() => actions.fireApex()}
              style={{ background: arcColor, borderColor: arcColor }}
            >
              🌌 Fire the Apex
            </button>
          </div>
        );
      })()}

      {/* #228 — Active Herald prompt. */}
      {state.run?.activeHerald && (() => {
        const ah = state.run.activeHerald;
        const def = getHerald(ah.id);
        if (!def) return null;
        const arc = state.run.eraArc || "mending";
        const shape = ah.shape || def.shapes[arc];
        const arcColor = arc === "communion" ? "#8a3030" : arc === "defiance" ? "#888" : "#7fc97f";
        return (
          <div
            style={{ marginTop: 6, padding: "10px 12px", background: `${arcColor}30`, border: `2px solid ${arcColor}`, borderRadius: 6, fontSize: 12, color: arcColor }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{def.icon} {def.name} ({shape.kind})</div>
            <div style={{ marginBottom: 6, color: "#ccc" }}>{shape.prompt || shape.description || def.onSpawnMessage}</div>
            {shape.kind === "dialog" && shape.choices && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {shape.choices.map((c) => {
                  const matches = c.alignmentCorrect === arc;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      title={matches ? "Aligned answer (best reward)" : "Cross-arc answer"}
                      onClick={() => actions.resolveHerald(c.id, "success")}
                      style={matches ? { borderColor: arcColor } : undefined}
                    >
                      {matches ? "✦ " : ""}{c.label}
                    </button>
                  );
                })}
              </div>
            )}
            {/* #232 — Ritual combat (Communion Heralds). */}
            {shape.kind === "ritual" && ah.kind !== "ritual" && (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => actions.engageHerald()}
                >
                  🌀 Engage ritual ({shape.rounds || 5} rounds)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => actions.resolveHerald(null, "fail")}
                >
                  Yield
                </button>
              </div>
            )}
            {ah.kind === "ritual" && (
              <div>
                <div style={{ fontSize: 11, color: "#bbb", marginBottom: 4 }}>
                  Obsession: {ah.obsession}/{ah.obsessionMax} · Rounds left: {ah.roundsLeft}
                </div>
                <div style={{ width: "100%", height: 8, background: "#222", borderRadius: 4, marginBottom: 8 }}>
                  <div style={{ width: `${(ah.obsession / ah.obsessionMax) * 100}%`, height: "100%", background: arcColor, borderRadius: 4 }} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => actions.ritualAttack("claim")}
                    title="Push obsession UP — claim the Herald"
                  >
                    ↑ Claim
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => actions.ritualAttack("push")}
                    title="Push obsession DOWN — push the Herald back"
                  >
                    ↓ Push back
                  </button>
                </div>
              </div>
            )}

            {/* #233 — Boss combat (Defiance Heralds). */}
            {shape.kind === "combat" && ah.kind !== "combat" && (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => actions.engageHerald()}
                >
                  ⚔️ Engage combat
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => actions.resolveHerald(null, "fail")}
                >
                  Yield
                </button>
              </div>
            )}
            {ah.kind === "combat" && (
              <div>
                <div style={{ fontSize: 11, color: "#bbb", marginBottom: 4 }}>
                  Herald HP: {ah.heraldHp}/{ah.heraldHpMax} · Your HP: {state.run.stats?.hp ?? 100}
                </div>
                <div style={{ width: "100%", height: 8, background: "#222", borderRadius: 4, marginBottom: 8 }}>
                  <div style={{ width: `${(ah.heraldHp / ah.heraldHpMax) * 100}%`, height: "100%", background: "#c34141", borderRadius: 4 }} />
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => actions.heraldAttack()}
                >
                  ⚔️ Attack
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* #214 — tainted buildings banner. Each drains 0.3 morale/min. */}
      {(() => {
        const tainted = state.run?.taintedBuildings || {};
        const ids = Object.keys(tainted);
        if (ids.length === 0) return null;
        const drain = ids.length * 0.3;
        return (
          <div
            style={{ marginTop: 6, padding: "6px 8px", background: "#8a4a8a25", borderLeft: "3px solid #8a4a8a", borderRadius: 4, fontSize: 11, color: "#8a4a8a" }}
            title="Tainted buildings bleed morale. Cleanse at Stone Altar (5 fragments each). Lasts until cleansed."
          >
            🦠 Tainted: {ids.join(", ")} — −{drain.toFixed(1)} morale/min · cleanse at Stone Altar
          </div>
        );
      })()}

      {/* #212 — active summon chip (when bound). */}
      {(() => {
        const live = getActiveSummon(state);
        if (!live) return null;
        const def = live.def;
        const remainMs = live.expiresAt - Date.now();
        if (remainMs <= 0) return null;
        const mins = Math.floor(remainMs / 60000);
        const secs = Math.floor((remainMs % 60000) / 1000);
        const arcColor = def.arc === "evil" ? "#8a3030" : "#4a7a4a";
        return (
          <div
            style={{ marginTop: 6, padding: "6px 8px", background: `${arcColor}25`, borderLeft: `3px solid ${arcColor}`, borderRadius: 4, fontSize: 11, color: arcColor }}
            title={def.description || ""}
          >
            {def.icon} <strong>{def.name}</strong> bound · {mins}m {secs.toString().padStart(2, "0")}s remaining
          </div>
        );
      })()}
    </div>
  );
}

export default function TownView({ state, actions }) {
  // Re-render every second so the per-minute output rates feel alive.
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const era = computeEra(state);
  const buckets = categorizeAll(state);

  // Filter each bucket to only buildings whose era requirements are
  // already met OR who are already built (so the page doesn't drown in
  // future content).
  const visible = (b) => {
    if (state.run?.built?.[b.id]) return true;
    // Reveal anything whose research+building gates are within reach this era.
    return (b.tier || 1) <= (era + 4);
  };

  return (
    <section className="action-panel action-panel--town">
      <div className="panel-header">
        <h2>🏘️ Town</h2>
        <p className="muted">
          The settlement. People come, walls rise, the stockpile turns over. What you spend builds the place that pays you back.
        </p>
      </div>

      <PopulationHeader state={state} />

      {/* #204 — active companion chip. Surfaced here so the player */}
      {/* sees their companion alongside town status. */}
      {(() => {
        const activeId = state.run?.companions?.active;
        if (!activeId) return null;
        const c = getCompanion(activeId);
        if (!c) return null;
        return (
          <div
            style={{ marginTop: 0, marginBottom: 12, padding: "6px 10px", background: "rgba(127,201,127,0.10)", border: "1px solid rgba(127,201,127,0.4)", borderRadius: 6, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}
            title={c.description}
          >
            <span style={{ fontSize: 20 }} aria-hidden="true">{c.icon}</span>
            <strong>{c.name}</strong>
            <span className="muted" style={{ fontSize: 11 }}>walks with you</span>
          </div>
        );
      })()}

      {/* #201 — prestige hint banner. Show when eligible echoes ≥ 5. */}
      {(() => {
        const rwd = getPrestigeReward(state);
        if (!rwd.eligible || rwd.echoes < 5) return null;
        return (
          <div
            style={{ marginTop: 0, marginBottom: 12, padding: "8px 12px", background: "linear-gradient(135deg, rgba(220,154,74,0.18), rgba(220,154,74,0.06))", border: "1px solid rgba(220,154,74,0.5)", borderRadius: 6, fontSize: 12 }}
            title={"Reasons:\n" + rwd.reasons.map((r) => `  +${r.value}  ${r.label}`).join("\n")}
          >
            🌌 <strong>You've earned {rwd.echoes} Echo{rwd.echoes === 1 ? "" : "s"}</strong> if you Channel the Rock and ascend. ({rwd.reasons.length} milestone{rwd.reasons.length === 1 ? "" : "s"} reached.)
          </div>
        );
      })()}

      {/* #194 — Damaged buildings (raid-destroyed). Player can repair */}
      {/* at 50% original cost. */}
      {(() => {
        const destroyed = state.run?.destroyedBuildings || {};
        const entries = Object.keys(destroyed);
        if (entries.length === 0) return null;
        return (
          <div className="town-section" style={{ marginBottom: 14 }}>
            <h3 className="patrol-era-title" style={{ marginBottom: 6, color: "#c34141" }}>
              🔥 Damaged ({entries.length})
            </h3>
            <div className="patrol-card-grid">
              {entries.map((id) => {
                const b = getAllBuildings().find((x) => x.id === id);
                if (!b) return null;
                const check = canRepair(state, id);
                return (
                  <div key={id} className="patrol-card patrol-card--magic is-disabled" title={b.description}>
                    <div className="patrol-card-head">
                      <span className="patrol-card-icon" aria-hidden="true">{b.icon}</span>
                      <div className="patrol-card-title">
                        <div className="patrol-card-name">{b.name}</div>
                        <div className="patrol-card-sub">
                          <span className="patrol-card-tier patrol-card-tier--uncommon" style={{ background: "rgba(195,65,65,0.2)" }}>
                            Destroyed
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="muted" style={{ fontSize: 11 }}>
                      Repair at 50% cost.
                    </p>
                    <div className="patrol-card-drops">
                      <ul className="patrol-card-drops-list" style={{ fontSize: 11 }}>
                        {Object.entries(b.cost || {}).map(([res, qty]) => {
                          const need = Math.max(1, Math.ceil(qty * 0.5));
                          const have = state.run?.inventory?.[res] || 0;
                          return (
                            <li key={res} className="patrol-card-drop">
                              <span style={{ color: have >= need ? undefined : "#c34141" }}>
                                {res} ×{need} ({have})
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm patrol-card-cta-btn"
                      disabled={!check.ok}
                      title={check.ok ? `Repair ${b.name}` : check.reason}
                      onClick={() => actions.repairBuilding(id)}
                    >
                      🔨 Repair
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* #214 — Tainted buildings. Cleanse at Stone Altar for 5 fragments each. */}
      {(() => {
        const tainted = state.run?.taintedBuildings || {};
        const entries = Object.keys(tainted);
        if (entries.length === 0) return null;
        const hasAltar = !!state.run?.built?.stoneAltar;
        const haveFrags = state.run?.inventory?.fragments || 0;
        return (
          <div className="town-section" style={{ marginBottom: 14 }}>
            <h3 className="patrol-era-title" style={{ marginBottom: 6, color: "#8a4a8a" }}>
              🦠 Tainted ({entries.length})
            </h3>
            <div className="patrol-card-grid">
              {entries.map((id) => {
                const b = getAllBuildings().find((x) => x.id === id);
                if (!b) return null;
                const canCleanse = hasAltar && haveFrags >= 5;
                const reason = !hasAltar
                  ? "Requires Stone Altar."
                  : haveFrags < 5
                    ? `Need 5 fragments (have ${haveFrags}).`
                    : `Cleanse ${b.name}.`;
                return (
                  <div key={id} className="patrol-card" style={{ borderColor: "#8a4a8a" }} title={b.description}>
                    <div className="patrol-card-head">
                      <span className="patrol-card-icon" aria-hidden="true">{b.icon}</span>
                      <div className="patrol-card-title">
                        <div className="patrol-card-name">{b.name}</div>
                        <div className="patrol-card-sub">
                          <span className="patrol-card-tier" style={{ background: "rgba(138,74,138,0.2)", color: "#8a4a8a" }}>
                            Tainted
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="muted" style={{ fontSize: 11 }}>
                      Still produces, but bleeds 0.3 morale/min + 0.2 sanity/min. Cleanse to restore.
                    </p>
                    <div className="patrol-card-drops">
                      <ul className="patrol-card-drops-list" style={{ fontSize: 11 }}>
                        <li className="patrol-card-drop">
                          <span style={{ color: haveFrags >= 5 ? undefined : "#c34141" }}>
                            fragments x5 ({haveFrags})
                          </span>
                        </li>
                      </ul>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm patrol-card-cta-btn"
                      disabled={!canCleanse}
                      title={reason}
                      onClick={() => actions.cleanseTaint(id)}
                    >
                      🕯️ Cleanse
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {SECTIONS.map((s) => {
        const list = (buckets[s.id] || []).filter(visible);
        if (list.length === 0) return null;
        return (
          <div key={s.id} className="town-section" style={{ marginBottom: 14 }}>
            <h3 className="patrol-era-title" style={{ marginBottom: 6 }}>{s.title}</h3>
            <div className="patrol-card-grid">
              {list.map((b) => (
                <BuildingCard key={b.id} b={b} state={state} actions={actions} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
