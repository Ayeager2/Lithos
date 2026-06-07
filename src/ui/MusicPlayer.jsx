// Mini music player (#88) — inline widget rendered in Settings, and
// optionally also in the shell header when the user flips the
// "Show player in header" toggle.
//
// Layout: [⏮]  [⏸/▶]  [⏭]  Track Title
//
// Pulls current track id from systems/audio.js getCurrentMusicId() and
// re-polls every 500ms while mounted so the title stays in sync with
// crossfades + auto-rotation. Buttons respect mutedMusicIds + unlocked
// tracks lists.
//
// Variants:
//   "settings" — full label, full size (default; lives in Settings modal)
//   "header"   — compact, truncated label, sits in the shell header
//
// Hides itself entirely if the player has no unlocked tracks (Era 0
// before anything's been earned).

import { useEffect, useState } from "react";
import {
  getCurrentMusicId,
  getIsPaused,
  togglePause,
  skipToNextEligibleTrack,
  skipToPreviousEligibleTrack,
} from "../systems/audio.js";
import { getMusic, getAllMusic } from "../content/audio.js";

export default function MusicPlayer({ state, settings, variant = "settings" }) {
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

  const unlocked = state?.persistent?.unlockedMusic || {};
  const muted = settings?.mutedMusicIds || {};
  const eligible = getAllMusic().filter(
    (t) => unlocked[t.id] && !muted[t.id]
  );
  if (Object.keys(unlocked).length === 0) return null;

  const currentId = getCurrentMusicId();
  const track = currentId ? getMusic(currentId) : null;
  const paused = getIsPaused();
  const label = track?.title || (eligible.length === 0 ? "All muted" : "Silence");
  const canControl = eligible.length > 0 || !!track;

  return (
    <div
      className={`music-player music-player--${variant}`}
      role="region"
      aria-label="Music player"
    >
      <button
        type="button"
        className="music-player-btn"
        onClick={() => skipToPreviousEligibleTrack(state, settings)}
        title="Previous track"
        aria-label="Previous track"
        disabled={!canControl}
      >
        ⏮
      </button>

      <button
        type="button"
        className="music-player-btn music-player-btn--play"
        onClick={() => togglePause()}
        title={paused ? "Resume" : "Pause"}
        aria-label={paused ? "Resume" : "Pause"}
        disabled={!track}
      >
        {paused ? "▶" : "⏸"}
      </button>

      <button
        type="button"
        className="music-player-btn"
        onClick={() => skipToNextEligibleTrack(state, settings)}
        title="Next track"
        aria-label="Next track"
        disabled={!canControl}
      >
        ⏭
      </button>

      <span className="music-player-label" title={label}>
        {label}
      </span>
    </div>
  );
}
