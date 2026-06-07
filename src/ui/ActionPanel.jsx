// Center column on desktop, top of stack on mobile.
//
// "The Wasteland" — the home-base action page (#77).
//
// Before: this panel was a thin header + PestIndicator. The five primary
// survival actions lived in the bottom ActionStrip.
//
// Now: Gather / Eat / Drink / Rest live here, on the page that *is* your
// home. The plan is that as the player explores more biomes / eras /
// elsewhere-in-the-galaxy, each location gets its own action page. The
// Wasteland is just the first one — the dust you start in.
//
// The bottom ActionStrip is now mostly empty — Hunt remains there until
// #79 ships HuntingView; Ritual moved to Arcane (#75).

import { useEffect, useState } from "react";
import PestIndicator from "./PestIndicator.jsx";
import EatButton from "./EatButton.jsx";
import DrinkButton from "./DrinkButton.jsx";
import {
  survivalActive,
  canPerformSurvivalAction,
} from "../systems/survival.js";
import { canGatherFull, getGatherCooldownMs } from "../systems/gathering.js";
import { totalWater } from "../content/resources.js";

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
      <span className="btn-action-icon" aria-hidden="true">{icon}</span>
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

export default function ActionPanel({ state, actions, settings, settingsHook }) {
  const survival = survivalActive(state);
  const keybinds = settings?.keybindings || {};

  // Gather cooldown ticker.
  const [now, setNow] = useState(Date.now());
  const lastGatheredAt = state.run.lastGatheredAt || 0;
  const gatherCooldownMs = getGatherCooldownMs(state);
  const gatherElapsed = now - lastGatheredAt;
  const gatherCooling = lastGatheredAt > 0 && gatherElapsed < gatherCooldownMs;
  const gatherProgress = Math.max(0, Math.min(1, gatherElapsed / gatherCooldownMs));
  useEffect(() => {
    if (!gatherCooling) return;
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, [gatherCooling]);

  const gatherCheck = canGatherFull(state);
  const eatCheck = canPerformSurvivalAction(state, "eat");
  const drinkCheck = (() => {
    if (!survivalActive(state)) return { ok: false, reason: "No needs yet." };
    if (totalWater(state.run.inventory) <= 0) {
      return { ok: false, reason: "No water to drink." };
    }
    return { ok: true };
  })();
  const restCheck = canPerformSurvivalAction(state, "rest");

  return (
    <section className="action-panel action-panel--world">
      <div className="panel-header">
        <h2>The Wasteland</h2>
        <p className="muted">
          There is nothing here. There is everything to find. This is your home for now.
        </p>
      </div>

      <PestIndicator state={state} />

      <div className="wasteland-actions" role="toolbar" aria-label="Wasteland actions">
        {/* The standalone Gather button moved to the new 🌿 Gather page
            (#97) under the Forage tab as Dust Patch / Wild Garden / etc.
            Wasteland keeps only the survival actions — eat / drink / rest. */}
        {survival && (
          <>
            <div className="wasteland-action-slot">
              <EatButton
                state={state}
                actions={actions}
                settings={settings}
                settingsHook={settingsHook}
                eatCheck={eatCheck}
              />
            </div>

            <div className="wasteland-action-slot">
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
              onClick={actions?.rest}
              disabled={!restCheck.ok || !actions?.rest}
              reason={restCheck.reason}
            />
          </>
        )}
      </div>
    </section>
  );
}
