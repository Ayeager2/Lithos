// Audio playback system. Manages music + SFX with crossfading, era-driven
// auto-selection, and a per-user pin override.
//
// Browser autoplay policy: audio cannot start until the user has interacted
// with the page. Rather than try-and-fail, we explicitly track an
// `userHasInteracted` flag set on the very first click/keydown/touchstart
// anywhere. Until that flag is true, music play requests are stored as
// `pendingTrackId` and start the moment the user interacts.

import {
  getMusic,
  getSfx,
  getMusicForEra,
  getAllMusic,
} from "../content/audio.js";

let currentMusic = null;        // { id, audio: HTMLAudioElement }
let activeSfx = new Set();
let currentSettings = null;
let fadeTimers = new Map();
let userHasInteracted = false;
let pendingTrackId = null;

// ---- First-interaction tracking ----

function setupInteractionListener() {
  if (typeof document === "undefined") return;
  const onFirstInteract = () => {
    if (userHasInteracted) return;
    userHasInteracted = true;
    document.removeEventListener("click", onFirstInteract, true);
    document.removeEventListener("keydown", onFirstInteract, true);
    document.removeEventListener("touchstart", onFirstInteract, true);
    // If we had a track waiting, play it now.
    if (pendingTrackId) {
      const id = pendingTrackId;
      pendingTrackId = null;
      crossfadeToMusic(id, 2500);
    }
  };
  document.addEventListener("click", onFirstInteract, true);
  document.addEventListener("keydown", onFirstInteract, true);
  document.addEventListener("touchstart", onFirstInteract, true);
}

setupInteractionListener();

// ---- Volume math ----

function effectiveVolume(category, trackVolume = 1.0) {
  if (!currentSettings) return 0;
  if (currentSettings.muted) return 0;
  const master = (currentSettings.masterVolume ?? 70) / 100;
  const cat = (currentSettings[category + "Volume"] ?? 70) / 100;
  return Math.max(0, Math.min(1, master * cat * trackVolume));
}

export function applyAudioSettings(settings) {
  currentSettings = settings;
  if (currentMusic?.audio) {
    const def = getMusic(currentMusic.id);
    currentMusic.audio.volume = effectiveVolume("music", def?.volume ?? 1.0);
  }
}

// ---- Crossfade helpers ----

function clearFade(audio) {
  const id = fadeTimers.get(audio);
  if (id) {
    clearInterval(id);
    fadeTimers.delete(audio);
  }
}

function fadeAudio(audio, fromVol, toVol, durationMs, onDone) {
  clearFade(audio);
  const steps = 30;
  const stepMs = Math.max(20, Math.floor(durationMs / steps));
  let step = 0;
  audio.volume = fromVol;
  const id = setInterval(() => {
    step++;
    const t = step / steps;
    audio.volume = Math.max(0, Math.min(1, fromVol + (toVol - fromVol) * t));
    if (step >= steps) {
      clearInterval(id);
      fadeTimers.delete(audio);
      audio.volume = toVol;
      if (onDone) onDone();
    }
  }, stepMs);
  fadeTimers.set(audio, id);
}

// ---- Music control ----

export function playMusic(trackId) {
  crossfadeToMusic(trackId, 0);
}

export function crossfadeToMusic(trackId, fadeMs = 2500) {
  const def = getMusic(trackId);
  if (!def) {
    fadeOutMusic(fadeMs);
    return;
  }

  // Already playing this track? Skip.
  if (currentMusic?.id === trackId) return;

  // Pre-interaction: just remember what to play. The first-click handler
  // will start it once the browser allows audio.
  if (!userHasInteracted) {
    pendingTrackId = trackId;
    return;
  }

  const oldEntry = currentMusic;
  const target = effectiveVolume("music", def.volume ?? 1.0);

  const newAudio = new Audio(def.file);
  newAudio.loop = def.loop !== false;
  newAudio.volume = 0;
  newAudio.play().catch((err) => {
    // Should be rare now that we gate on userHasInteracted, but possible
    // if the browser is being conservative.
    console.warn("[audio] play blocked:", err.message);
  });

  currentMusic = { id: trackId, audio: newAudio };

  if (fadeMs <= 0) {
    newAudio.volume = target;
  } else {
    fadeAudio(newAudio, 0, target, fadeMs);
  }

  if (oldEntry?.audio) {
    const oldAudio = oldEntry.audio;
    fadeAudio(oldAudio, oldAudio.volume, 0, fadeMs, () => {
      try {
        oldAudio.pause();
        oldAudio.src = "";
      } catch {
        /* ignore */
      }
    });
  }
}

export function fadeOutMusic(fadeMs = 2000) {
  // Cancel any pending pre-interaction play.
  pendingTrackId = null;
  if (!currentMusic?.audio) return;
  const audio = currentMusic.audio;
  currentMusic = null;
  fadeAudio(audio, audio.volume, 0, fadeMs, () => {
    try {
      audio.pause();
      audio.src = "";
    } catch {
      /* ignore */
    }
  });
}

export function stopMusic() {
  pendingTrackId = null;
  if (currentMusic?.audio) {
    clearFade(currentMusic.audio);
    try {
      currentMusic.audio.pause();
      currentMusic.audio.src = "";
    } catch {
      /* ignore */
    }
  }
  currentMusic = null;
}

// ---- SFX ----

export function playSfx(sfxId) {
  if (!userHasInteracted) return; // SFX without context isn't useful — drop it
  const def = getSfx(sfxId);
  if (!def) return;
  const audio = new Audio(def.file);
  audio.loop = false;
  audio.volume = effectiveVolume("sfx", def.volume ?? 1.0);
  audio.play().catch(() => { });
  activeSfx.add(audio);
  audio.addEventListener("ended", () => activeSfx.delete(audio));
}

// ---- Music selection logic ----

// Treats a track as eligible only if it's been unlocked AND the user
// hasn't muted it. Pinning bypasses mute (explicit pick beats mute).
function isTrackEligible(track, unlocked, muted) {
  if (!track) return false;
  if (!unlocked[track.id]) return false;
  if (muted && muted[track.id]) return false;
  return true;
}

function pickAutoTrack(state, era, settings) {
  const unlocked = state.persistent?.unlockedMusic || {};
  const muted = settings?.mutedMusicIds || currentSettings?.mutedMusicIds || {};
  // First walk down from current era to find the era-tagged track.
  for (let e = era; e >= 0; e--) {
    const track = getMusicForEra(e);
    if (isTrackEligible(track, unlocked, muted)) return track;
  }
  // Fall back to any unlocked, non-muted track.
  for (const t of getAllMusic()) {
    if (isTrackEligible(t, unlocked, muted)) return t;
  }
  return null;
}

// Skip to the next eligible track in the rotation (#87).
// Cycles through unlocked + non-muted tracks. If currently playing track
// is the only eligible one, picks itself (essentially a restart).
export function skipToNextEligibleTrack(state, settings) {
  const unlocked = state.persistent?.unlockedMusic || {};
  const muted = settings?.mutedMusicIds || {};
  const all = getAllMusic().filter((t) => isTrackEligible(t, unlocked, muted));
  if (all.length === 0) {
    fadeOutMusic(1500);
    return null;
  }
  const curIdx = all.findIndex((t) => t.id === currentMusic?.id);
  const next = all[(curIdx + 1) % all.length];
  if (next) crossfadeToMusic(next.id, 1500);
  return next?.id || null;
}

// Mirror of skipToNextEligibleTrack — steps backward through the same
// eligibility list. Used by the mini-player's ◀◀ button.
export function skipToPreviousEligibleTrack(state, settings) {
  const unlocked = state.persistent?.unlockedMusic || {};
  const muted = settings?.mutedMusicIds || {};
  const all = getAllMusic().filter((t) => isTrackEligible(t, unlocked, muted));
  if (all.length === 0) {
    fadeOutMusic(1500);
    return null;
  }
  const curIdx = all.findIndex((t) => t.id === currentMusic?.id);
  const prevIdx = (curIdx - 1 + all.length) % all.length;
  const prev = all[prevIdx];
  if (prev) crossfadeToMusic(prev.id, 1500);
  return prev?.id || null;
}

// Pause/resume — pauses the underlying <audio>, leaves currentMusic
// intact so resume picks up where it left off. The mini-player toggles
// these via its ⏸/▶ button.
let isPausedFlag = false;
export function pauseMusic() {
  if (!currentMusic?.audio) return;
  try { currentMusic.audio.pause(); } catch { /* ignore */ }
  isPausedFlag = true;
}
export function resumeMusic() {
  if (!currentMusic?.audio) {
    isPausedFlag = false;
    return;
  }
  try { currentMusic.audio.play().catch(() => {}); } catch { /* ignore */ }
  isPausedFlag = false;
}
export function getIsPaused() {
  return isPausedFlag;
}
export function togglePause() {
  if (isPausedFlag) resumeMusic();
  else pauseMusic();
}

export function syncMusicToState(state, settings, era) {
  let targetId = null;
  const unlocked = state.persistent?.unlockedMusic || {};
  // Pinning beats mute — if you explicitly pin a track, it plays even
  // if you'd also marked it muted in the past. Mute only governs the
  // auto-rotation.
  if (settings.pinnedMusicId && unlocked[settings.pinnedMusicId]) {
    targetId = settings.pinnedMusicId;
  } else {
    const track = pickAutoTrack(state, era, settings);
    targetId = track?.id ?? null;
  }

  if (!targetId) {
    fadeOutMusic(2000);
    return;
  }
  if (currentMusic?.id === targetId) return;
  crossfadeToMusic(targetId, 2500);
}

export function getCurrentMusicId() {
  return currentMusic?.id ?? null;
}

// Force-play the pending music, if any. Useful when we know the user just
// did something interactive (like dismissing the splash) so we can start
// audio without waiting for the next click.
export function notifyUserInteracted() {
  if (userHasInteracted) return;
  userHasInteracted = true;
  if (pendingTrackId) {
    const id = pendingTrackId;
    pendingTrackId = null;
    crossfadeToMusic(id, 2500);
  }
}
