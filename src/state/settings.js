// User preferences (settings) — separate from game state.

const STORAGE_KEY = "namigatchi-settings";

export const SETTINGS_DEFAULTS = {
  theme: "dark",
  font: "system",
  fontSize: "normal",
  motion: "auto",
  masterVolume: 70,
  musicVolume: 50,
  sfxVolume: 80,
  muted: false,
  pinnedMusicId: null,
  // Per-track mute (#87). Map of trackId → true. Muted tracks are skipped
  // by pickAutoTrack and never play unless explicitly pinned by the user.
  mutedMusicIds: {},
  // Mini-player home (#88). When false, only the Settings modal shows
  // the player controls. When true, an extra copy lives in the shell
  // header so the user doesn't have to open Settings every time.
  showMusicPlayerInHeader: false,
  keybindings: {
    gather: "g",
    rest: "r",
    eat: "e",
    drink: "d",
    hunt: "h",
  },
  inventoryCollapsed: {},
  // Preferred food to eat first when the player clicks Eat.
  // null = auto (default lowest-tier-first behavior).
  eatPreference: null,
  // Preferred water tier to drink on main-button click. null = auto
  // (best-available, picks the highest tier present). See DrinkButton.jsx
  // and systems/survival.js performDrink.
  drinkPreference: null,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...SETTINGS_DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      ...SETTINGS_DEFAULTS,
      ...parsed,
      inventoryCollapsed: {
        ...SETTINGS_DEFAULTS.inventoryCollapsed,
        ...(parsed.inventoryCollapsed || {}),
      },
    };
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function applySettingsToDOM(settings) {
  const body = document.body;
  if (!body) return;
  const classesToRemove = [];
  for (const cls of body.classList) {
    if (
      cls.startsWith("theme-") ||
      cls.startsWith("font-") ||
      cls.startsWith("size-") ||
      cls.startsWith("motion-")
    ) {
      classesToRemove.push(cls);
    }
  }
  for (const cls of classesToRemove) body.classList.remove(cls);
  body.classList.add(`theme-${settings.theme}`);
  body.classList.add(`font-${settings.font}`);
  body.classList.add(`size-${settings.fontSize}`);
  if (settings.motion === "reduced") body.classList.add("motion-reduced");
  if (settings.motion === "full") body.classList.add("motion-full");
}
