// Footer action strip — the residue layer (#77).
//
// Previously held: Gather · Hunt · Eat · Drink · Rest · Ritual.
// Now: Hunt (temporary, until #79 ships HuntingView) + the Reset/End-run
// meta button on the right.
//
// All other primary actions migrated:
//   - Gather / Eat / Drink / Rest → ActionPanel (Wasteland view) (#77)
//   - Ritual → ArcaneView "Spirit conversions" section (#75)
//   - Patrol → its own PatrolView (#67)
//   - Hunt → moves to HuntingView in #79 (currently still here)

import { useEffect, useState } from "react";
import { canHunt, getHuntStatus } from "../systems/hunting.js";

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

export default function ActionStrip({
  state,
  actions,
  settings,
  prestigeEligible,
  showResetButton,
  onReset,
}) {
  const [now, setNow] = useState(Date.now());

  const huntStatus = getHuntStatus(state);
  const lastHuntAt = state.run.lastHuntAt || 0;
  const huntCooldownMs = huntStatus.cooldownMs;
  const huntElapsed = now - lastHuntAt;
  const huntCooling = lastHuntAt > 0 && huntElapsed < huntCooldownMs;
  const huntProgress = Math.max(0, Math.min(1, huntElapsed / huntCooldownMs));

  useEffect(() => {
    if (!huntCooling) return;
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, [huntCooling]);

  const huntCheck = canHunt(state);
  const keybinds = settings?.keybindings || {};

  // Hide the strip entirely if nothing in it is renderable.
  const hasHunt = !!huntStatus.owned;
  if (!hasHunt && !showResetButton) return null;

  return (
    <div className="action-strip" role="toolbar" aria-label="Actions">
      <div className="action-strip-row">
        {hasHunt && (
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
