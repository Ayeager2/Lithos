// Footer action strip — Lithos's primary interaction surface.
//
// Six uniform-size, uniform-color buttons in a single row:
//   Gather · Hunt · Eat ▾ · Drink ▾ · Rest · Ritual ▾
//
// (Hunt only renders once a hunting tool is owned. Ritual only renders
//  post-arcaneAwakening. Eat/Drink/Ritual are dropdowns — Eat already has
//  food-preference dropdown via <EatButton/>; Drink and Ritual are stubbed
//  to single-option for now, ready to grow when Parts D/E content lands.)
//
// Cooldown bars still render under Gather and Hunt.
//
// A small Reset/Exit button on the far right replaces the old footer's
// Reset button. Channel-the-Rock moved into the stone strip — see
// StonePanel.jsx and ERA_PLAN.md "Layout refactor — Part C".

import { useEffect, useState } from "react";
import {
  survivalActive,
  canPerformSurvivalAction,
} from "../systems/survival.js";
import { canGatherFull, getGatherCooldownMs } from "../systems/gathering.js";
import { canHunt, getHuntStatus } from "../systems/hunting.js";
import { canPatrol, getPatrolStatus } from "../systems/patrol.js";
import { getEffectiveWeapon } from "../systems/combat.js";
import EatButton from "./EatButton.jsx";
import DrinkButton from "./DrinkButton.jsx";
import { totalWater } from "../content/resources.js";

// Generic "primary action" button used by Gather/Hunt/Rest. Honors disabled
// reasoning + optional hotkey hint + optional cooldown progress bar.
function ActionButton({
  label,
  icon,
  hotkey,
  onClick,
  disabled,
  reason,
  cooling,
  progress,
  busyLabel,
  className = "",
}) {
  const formatKey = (k) => (k ? k.toUpperCase() : "");
  return (
    <button
      type="button"
      className={`btn btn-action ${cooling ? "is-cooling" : ""} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={!disabled ? (hotkey ? `${label} (${formatKey(hotkey)})` : label) : reason}
    >
      <span className="btn-action-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="btn-action-label">
        {cooling && busyLabel ? busyLabel : label}
      </span>
      {hotkey && <span className="btn-hotkey">{formatKey(hotkey)}</span>}
      {progress != null && (
        <span
          className="btn-cooldown-fill"
          style={{
            transform: `scaleX(${cooling ? progress : 0})`,
            opacity: cooling ? 1 : 0,
          }}
        />
      )}
    </button>
  );
}

export default function ActionStrip({
  state,
  actions,
  settings,
  settingsHook,
  prestigeEligible,
  showResetButton,
  onReset,
}) {
  const survival = survivalActive(state);

  // Cooldown ticks.
  const [now, setNow] = useState(Date.now());
  const lastGatheredAt = state.run.lastGatheredAt || 0;
  const gatherCooldownMs = getGatherCooldownMs(state);
  const gatherElapsed = now - lastGatheredAt;
  const gatherCooling =
    lastGatheredAt > 0 && gatherElapsed < gatherCooldownMs;
  const gatherProgress = Math.max(
    0,
    Math.min(1, gatherElapsed / gatherCooldownMs)
  );

  const huntStatus = getHuntStatus(state);
  const lastHuntAt = state.run.lastHuntAt || 0;
  const huntCooldownMs = huntStatus.cooldownMs;
  const huntElapsed = now - lastHuntAt;
  const huntCooling = lastHuntAt > 0 && huntElapsed < huntCooldownMs;
  const huntProgress = Math.max(
    0,
    Math.min(1, huntElapsed / huntCooldownMs)
  );

  // Patrol — combat loop (#66). Gated on having a real weapon equipped.
  const patrolStatus = getPatrolStatus(state, now);
  const lastPatrolAt = state.run.lastPatrolAt || 0;
  const patrolCooldownMs = patrolStatus.cooldownMs;
  const patrolElapsed = now - lastPatrolAt;
  const patrolCooling = lastPatrolAt > 0 && patrolElapsed < patrolCooldownMs;
  const patrolProgress = Math.max(
    0,
    Math.min(1, patrolElapsed / patrolCooldownMs)
  );
  const equippedWeapon = getEffectiveWeapon(state.run);
  const patrolVisible = equippedWeapon && equippedWeapon.id !== "_fists";

  const anyCooling = gatherCooling || huntCooling || patrolCooling;
  useEffect(() => {
    if (!anyCooling) return;
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, [anyCooling]);

  const gatherCheck = canGatherFull(state);
  const huntCheck = canHunt(state);
  const patrolCheck = canPatrol(state, now);
  const eatCheck = canPerformSurvivalAction(state, "eat");
  // Drink no longer uses cost-based gating (the cost is dynamic per
  // chosen tier — see performDrink in systems/survival.js). Gate manually:
  // survival must be active AND the player must hold any water tier.
  const drinkCheck = (() => {
    if (!survivalActive(state)) return { ok: false, reason: "No needs yet." };
    if (totalWater(state.run.inventory) <= 0) {
      return { ok: false, reason: "No water to drink." };
    }
    return { ok: true };
  })();
  const restCheck = canPerformSurvivalAction(state, "rest");
  const ritualKnown = !!state.run.researched?.arcaneAwakening;
  const ritualCheck = ritualKnown
    ? canPerformSurvivalAction(state, "ritual")
    : { ok: false };

  const keybinds = settings?.keybindings || {};

  return (
    <div className="action-strip" role="toolbar" aria-label="Actions">
      <div className="action-strip-row">
        <ActionButton
          label="Gather"
          busyLabel="Gathering…"
          icon="🌿"
          hotkey={keybinds.gather}
          onClick={actions.gather}
          disabled={!gatherCheck.ok}
          reason={gatherCheck.reason}
          cooling={gatherCooling}
          progress={gatherProgress}
        />

        {huntStatus.owned && (
          <ActionButton
            label={`Hunt · Lv ${huntStatus.level}`}
            busyLabel="Hunting…"
            icon="🏹"
            hotkey={keybinds.hunt}
            onClick={actions.hunt}
            disabled={!huntCheck.ok}
            reason={huntCheck.reason}
            cooling={huntCooling}
            progress={huntProgress}
          />
        )}

        {patrolVisible && (
          <ActionButton
            label="Patrol"
            busyLabel="Patrolling…"
            icon="🗡️"
            hotkey={keybinds.patrol}
            onClick={actions.patrol}
            disabled={!patrolCheck.ok}
            reason={patrolCheck.reason}
            cooling={patrolCooling}
            progress={patrolProgress}
          />
        )}

        {survival && (
          <>
            {/* Eat dropdown (uses EatButton's existing preference popover) */}
            <div className="action-strip-slot">
              <EatButton
                state={state}
                actions={actions}
                settings={settings}
                settingsHook={settingsHook}
                eatCheck={eatCheck}
              />
            </div>

            {/* Drink dropdown — tiered water + Boil utility. ERA_PLAN.md
                "Water tiers + dysentery" Part D. */}
            <div className="action-strip-slot">
              <DrinkButton
                state={state}
                actions={actions}
                settings={settings}
                settingsHook={settingsHook}
                drinkCheck={drinkCheck}
              />
            </div>

            <ActionButton
              label="Rest"
              icon={state.run.built?.firepit ? "🔥" : "🛌"}
              hotkey={keybinds.rest}
              onClick={actions.rest}
              disabled={!restCheck.ok}
              reason={restCheck.reason}
            />

            {ritualKnown && (
              <ActionButton
                label="Ritual"
                icon="🕯️"
                onClick={actions.ritual}
                disabled={!ritualCheck.ok}
                reason={ritualCheck.reason}
              />
            )}
          </>
        )}
      </div>

      {showResetButton && (
        <div className="action-strip-meta">
          <button
            type="button"
            className="btn btn-ghost btn-reset-run"
            onClick={onReset}
            title={
              prestigeEligible
                ? "End run (channel option also available on the Stone)"
                : "Reset this run"
            }
          >
            {prestigeEligible ? "End run" : "Reset run"}
          </button>
        </div>
      )}
    </div>
  );
}
