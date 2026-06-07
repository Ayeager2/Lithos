// Settings modal — accessible via the floating gear icon.
// Hosts theme/font/size accessibility options + save export/import.
// Settings apply live as the user clicks (no Apply button needed).

import { useEffect, useState } from "react";
import {
  downloadSaveFile,
  importSaveFromJSON,
  readSaveFile,
} from "../systems/saveIO.js";
import CreditsSection from "./CreditsSection.jsx";
import { getMusic, getAllMusic } from "../content/audio.js";
import { skipToNextEligibleTrack, getCurrentMusicId } from "../systems/audio.js";
import MusicPlayer from "./MusicPlayer.jsx";

// One row in the keybindings section. Click to start capturing a new key.
// During capture, the next key press becomes the new binding (Esc cancels,
// Backspace clears).
function KeybindingRow({ label, action, currentKey, onRebind, onClear, allBindings }) {
  const [capturing, setCapturing] = useState(false);
  const [conflictKey, setConflictKey] = useState(null);

  useEffect(() => {
    if (!capturing) return;
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setCapturing(false);
        setConflictKey(null);
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        onClear(action);
        setCapturing(false);
        setConflictKey(null);
        return;
      }
      // Single character keys only (lowercased) — no modifiers, no F-keys, etc.
      const key = e.key.length === 1 ? e.key.toLowerCase() : null;
      if (!key) return;

      // Check for conflict with another binding.
      const conflict = Object.entries(allBindings || {}).find(
        ([a, k]) => a !== action && k === key
      );
      if (conflict) {
        setConflictKey(key);
        // Auto-clear the warning after a moment.
        return;
      }

      onRebind(action, key);
      setCapturing(false);
      setConflictKey(null);
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [capturing, action, onRebind, onClear, allBindings]);

  return (
    <div className="settings-row">
      <div className="settings-label">{label}</div>
      <div className="settings-options">
        <button
          className={`settings-option keybind-button ${capturing ? "is-capturing" : ""
            }`}
          onClick={() => {
            setCapturing(!capturing);
            setConflictKey(null);
          }}
        >
          {capturing
            ? conflictKey
              ? `"${conflictKey.toUpperCase()}" already used — try another`
              : "Press a key… (Esc to cancel, Backspace to clear)"
            : currentKey
              ? currentKey.toUpperCase()
              : "—"}
        </button>
      </div>
    </div>
  );
}

function OptionRow({ label, options, value, onChange }) {
  return (
    <div className="settings-row">
      <div className="settings-label">{label}</div>
      <div className="settings-options">
        {options.map((opt) => (
          <button
            key={opt.value}
            className={`settings-option ${value === opt.value ? "is-active" : ""}`}
            onClick={() => onChange(opt.value)}
            title={opt.description || ""}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsModal({
  settings,
  update,
  state,
  prestigeEligible,
  onReset,
  onClose,
}) {
  const allMusic = getAllMusic();
  const unlocked = state.persistent.unlockedMusic || {};
  const unlockedTracks = allMusic.filter((m) => unlocked[m.id]);
  const pinnedTrack = settings.pinnedMusicId
    ? getMusic(settings.pinnedMusicId)
    : null;
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !window.confirm(
        "Importing a save will replace your current progress. Continue?"
      )
    ) {
      e.target.value = "";
      return;
    }
    readSaveFile(
      file,
      (text) => {
        const result = importSaveFromJSON(text);
        if (result.success) {
          window.location.reload();
        } else {
          window.alert("Import failed: " + result.error);
        }
      },
      (err) => window.alert("Import failed: " + err)
    );
    e.target.value = "";
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal modal--settings"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <header className="modal-header">
          <div>
            <h2>Settings</h2>
            <p className="muted modal-subtitle">
              Display preferences, accessibility, and saves.
            </p>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          <section className="settings-section">
            <h3>Display</h3>

            <OptionRow
              label="Theme"
              value={settings.theme}
              onChange={(v) => update({ theme: v })}
              options={[
                { value: "dark", label: "Dark" },
                { value: "sepia", label: "Sepia" },
              ]}
            />

            <OptionRow
              label="Font"
              value={settings.font}
              onChange={(v) => update({ font: v })}
              options={[
                { value: "system", label: "System", description: "Default sans-serif" },
                {
                  value: "lexend",
                  label: "Lexend",
                  description: "Designed for reading proficiency",
                },
                {
                  value: "atkinson",
                  label: "Atkinson",
                  description: "Atkinson Hyperlegible, designed for low vision",
                },
              ]}
            />

            <OptionRow
              label="Text size"
              value={settings.fontSize}
              onChange={(v) => update({ fontSize: v })}
              options={[
                { value: "small", label: "Small" },
                { value: "normal", label: "Normal" },
                { value: "large", label: "Large" },
              ]}
            />
          </section>

          <section className="settings-section">
            <h3>Keyboard shortcuts</h3>
            <p className="muted settings-help">
              Click a key, press a new one to rebind. Esc cancels, Backspace clears.
              Holding a key won't auto-fire — gather keeps its cooldown.
            </p>
            {[
              { action: "gather", label: "Gather" },
              { action: "hunt", label: "Hunt" },
              { action: "eat", label: "Eat" },
              { action: "drink", label: "Drink" },
              { action: "rest", label: "Rest" },
            ].map(({ action, label }) => (
              <KeybindingRow
                key={action}
                action={action}
                label={label}
                currentKey={settings.keybindings?.[action]}
                allBindings={settings.keybindings}
                onRebind={(a, k) =>
                  update({
                    keybindings: { ...settings.keybindings, [a]: k },
                  })
                }
                onClear={(a) =>
                  update({
                    keybindings: { ...settings.keybindings, [a]: null },
                  })
                }
              />
            ))}
          </section>

          <section className="settings-section">
            <h3>Accessibility</h3>
            <p className="muted settings-help">
              Some moments in the game use brief flashing or pulsing
              animations (the rock awakening, etc.). If you have
              photosensitive epilepsy or vestibular disorders, choose
              "Reduced" to replace them with gentle fade-ins.
            </p>
            <OptionRow
              label="Motion"
              value={settings.motion}
              onChange={(v) => update({ motion: v })}
              options={[
                {
                  value: "auto",
                  label: "Auto",
                  description: "Follow your system's reduced-motion setting",
                },
                {
                  value: "reduced",
                  label: "Reduced",
                  description: "Always calm — gentle fades, no flashes",
                },
                {
                  value: "full",
                  label: "Full",
                  description: "Always full animations",
                },
              ]}
            />
          </section>

          <section className="settings-section">
            <h3>Audio</h3>

            <div className="settings-row">
              <div className="settings-label">Mute</div>
              <div className="settings-options">
                <button
                  className={`settings-option ${settings.muted ? "is-active" : ""}`}
                  onClick={() => update({ muted: !settings.muted })}
                  aria-pressed={settings.muted}
                >
                  {settings.muted ? "🔇 Muted" : "🔊 On"}
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-label">Master</div>
              <div className="settings-slider-row">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.masterVolume}
                  onChange={(e) =>
                    update({ masterVolume: Number(e.target.value) })
                  }
                  className="settings-slider"
                  disabled={settings.muted}
                />
                <span className="settings-slider-value">
                  {settings.masterVolume}
                </span>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-label">Music</div>
              <div className="settings-slider-row">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.musicVolume}
                  onChange={(e) =>
                    update({ musicVolume: Number(e.target.value) })
                  }
                  className="settings-slider"
                  disabled={settings.muted}
                />
                <span className="settings-slider-value">
                  {settings.musicVolume}
                </span>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-label">Sound</div>
              <div className="settings-slider-row">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sfxVolume}
                  onChange={(e) =>
                    update({ sfxVolume: Number(e.target.value) })
                  }
                  className="settings-slider"
                  disabled={settings.muted}
                />
                <span className="settings-slider-value">
                  {settings.sfxVolume}
                </span>
              </div>
            </div>

            {unlockedTracks.length > 0 && (
              <>
                <div className="settings-row">
                  <div className="settings-label">Player</div>
                  <MusicPlayer state={state} settings={settings} variant="settings" />
                </div>
                <div className="settings-row">
                  <div className="settings-label">In header</div>
                  <div className="settings-options">
                    <button
                      type="button"
                      className={`settings-option ${!settings.showMusicPlayerInHeader ? "is-active" : ""}`}
                      onClick={() => update({ showMusicPlayerInHeader: false })}
                    >
                      Hidden
                    </button>
                    <button
                      type="button"
                      className={`settings-option ${settings.showMusicPlayerInHeader ? "is-active" : ""}`}
                      onClick={() => update({ showMusicPlayerInHeader: true })}
                    >
                      Show
                    </button>
                  </div>
                </div>
                <p className="muted settings-help">
                  When "Show" is on, the player also appears in the Lithos header so you don't have to open Settings to skip.
                </p>

                <div className="settings-row">
                  <div className="settings-label">Now playing</div>
                  <div className="settings-options music-tracks">
                    <button
                      className={`settings-option ${!settings.pinnedMusicId ? "is-active" : ""
                        }`}
                      onClick={() => update({ pinnedMusicId: null })}
                      title="Music auto-selects based on your current era"
                    >
                      Auto
                    </button>
                    {unlockedTracks.map((t) => (
                      <button
                        key={t.id}
                        className={`settings-option ${settings.pinnedMusicId === t.id ? "is-active" : ""
                          }`}
                        onClick={() => update({ pinnedMusicId: t.id })}
                        title={`${t.title}${t.artist ? ` — ${t.artist}` : ""}`}
                      >
                        {t.title}
                      </button>
                    ))}
                    <button
                      className="settings-option"
                      onClick={() => skipToNextEligibleTrack(state, settings)}
                      title="Skip to the next unlocked, un-muted track"
                    >
                      ⏭ Skip
                    </button>
                  </div>
                </div>
                <p className="muted settings-help">
                  {settings.pinnedMusicId && pinnedTrack
                    ? `Pinned: "${pinnedTrack.title}" — plays regardless of era.`
                    : "Auto: music changes as you progress through eras. New tracks unlock when you reach the era they belong to."}
                </p>

                {/* Per-track mute (#87) — checkbox list. Muted tracks are
                    skipped by auto-rotation; pin still overrides mute. */}
                <div className="settings-row">
                  <div className="settings-label">Mute tracks</div>
                  <div className="music-mute-list">
                    {unlockedTracks.map((t) => {
                      const muted = !!settings.mutedMusicIds?.[t.id];
                      return (
                        <label
                          key={t.id}
                          className={`music-mute-row ${muted ? "is-muted" : ""}`}
                          title={muted
                            ? `Muted — auto-rotation will skip "${t.title}"`
                            : `Mute "${t.title}" in auto-rotation`}
                        >
                          <input
                            type="checkbox"
                            checked={muted}
                            onChange={(e) => {
                              const next = { ...(settings.mutedMusicIds || {}) };
                              if (e.target.checked) next[t.id] = true;
                              else delete next[t.id];
                              update({ mutedMusicIds: next });
                            }}
                          />
                          <span className="music-mute-name">{t.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <p className="muted settings-help">
                  Muted tracks are skipped during auto-rotation. Pinning a track still plays it even when muted.
                </p>
              </>
            )}
          </section>

          <section className="settings-section">
            <h3>Save management</h3>
            <p className="muted settings-help">
              Saves are stored in your browser. Export a copy to back up or move
              between devices. Settings are saved separately and won't transfer
              with the save file.
            </p>
            <div className="settings-row">
              <div className="settings-label">Save file</div>
              <div className="settings-options">
                <button
                  className="settings-option"
                  onClick={() => downloadSaveFile(state)}
                >
                  Export
                </button>
                <label className="settings-option settings-import">
                  Import
                  <input
                    type="file"
                    accept="application/json,.json"
                    style={{ display: "none" }}
                    onChange={handleImport}
                  />
                </label>
              </div>
            </div>
          </section>

          {onReset && (
            <section className="settings-section">
              <h3>Run</h3>
              <div className="settings-row">
                <div>
                  <p style={{ margin: 0 }}>
                    {prestigeEligible ? "End run" : "Reset run"}
                  </p>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
                    {prestigeEligible
                      ? "Channel the Stone — convert this run's progress to Echoes and start over."
                      : "Wipe this run and start fresh. Persistent unlocks (Echoes, skills shop) remain."}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-reset-run"
                  onClick={onReset}
                >
                  {prestigeEligible ? "End run" : "Reset run"}
                </button>
              </div>
            </section>
          )}

          <CreditsSection />
        </div>
      </div>
    </div>
  );
}
