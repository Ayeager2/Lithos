# AI Context

**Read this first if you're an AI assistant.** Dense pointer-and-rule reference. Designed for fast onboarding. Most current state lives in `HANDOFF.md` and `systems.md`; this file is the stable spine.

---

## Project (3 lines)

**Lithos** — React 19 + Vite browser-only incremental/idle game with cosmic horror flavor.
Long arc: 8 eras (Scavenger → Awakening → Settler → Awakened World → Arcane Industry → Eldritch Reckoning → Ascendant → Cosmic). Currently shipped: **Era 0–3 with full RPG combat, tiered water, Arcane Studies, World Score, death-debuff cascade, and equipped-weapon foundation**.
Solo passion project, Steam-bound eventually. Accessibility-first, moddability-ready, content-as-data.

## Stack

- React 19, Vite, plain JS (no TypeScript)
- State: `useReducer` (`src/state/store.js`)
- Save: `localStorage` key `namigatchi-save` (versioned schema — current `v4`, with migration chain `v1 → v2 → v3 → v4`)
- Settings: separate `localStorage` key `namigatchi-settings` (theme, fonts, keybinds, volumes, motion, inventory collapse state, eat preference, drink preference)
- No backend, no build steps beyond `npm install && npm run dev`

---

## Architectural rules (NEVER violate without explicit user permission)

1. **Content as data.** `src/content/*.js` are pure data objects. No functions inside content. Predicates are flag-based (`requires: { rockAwakened: true }`), not functions.
2. **Thin reducer.** `src/state/reducer.js` dispatches; gameplay logic lives in `src/systems/*.js`. Each system function is pure (state in → new state out + log events).
3. **Persistent vs run state split.** `state.persistent` survives prestige forever (echoes, run history, unlocked music, lifetime stats, altar etchings, **permanently-known resources**). `state.run` wipes on prestige/reset. Save format already supports this; respect it for every new piece of state.
4. **Pure scene composition.** UI doesn't decide what to show — `src/systems/scene.js` does. UI just renders the layer list.
5. **Modal pattern for content-heavy UI.** Trees (research, buildings, **studies**) and rich screens (settings) live in modals triggered from a compact card in the main UI.
6. **Accessibility first.** Reduced motion (`body.motion-reduced` or `prefers-reduced-motion` media query), accessibility fonts (Lexend, Atkinson Hyperlegible), photosensitivity considered for any flashing content.
7. **Hidden alignment + hidden World Score.** `run.alignment.good` / `run.alignment.evil` track silently. NEVER display the numbers. `run.worldScore` is also hidden until the apex (≥100) reveal. Surfaces through consequences, not numbers.
8. **Anti-spam from day one.** Gather has a cooldown (1500ms → 250ms with progression). `e.repeat` filtered in keybindings — holding a key doesn't auto-fire. Manual click → faster manual click → automation is the entire incremental progression curve.
9. **Virtual-water cost key.** Building/research/tool/survival cost entries use the literal string `"water"` to mean "any water tier." Resolved via `totalWater()` / `spendWater()` from `content/resources.js`. **Never** add direct `water_stagnant` etc. costs to recipes unless the recipe genuinely requires a *specific* tier (e.g. boil action consumes water_muddy).
10. **Equip/cast/drink/etc. don't pause studies; gather/build/eat/etc. do.** The Arcane Studies clock pauses on world-affecting player actions but not on housekeeping. The reducer is the source of truth — only player-action cases call `appendLogAndStamp` (which writes `lastActionAt`).

---

## File map

```
src/content/        game data (pure objects, no functions in content)
  resources.js        — items + categories + hidden-until display + tiered water + craftMaterials
  buildings.js        — tree position (tier/col/parents) + effects + Stone Altar
  research.js         — 16+ nodes including Altar Work + Boiling
  studies.js          — Arcane Studies content: 7 paths + 21 nodes + STUDY_PATHS deltas
  threats.js          — encounter chance + effects + combat-class threats (`threat.combat`)
  events.js           — interval/gather/any triggers + choices (some with worldScoreDelta)
  audio.js            — music + sfx registry, tags drive era unlocks
  survival.js         — config: stats, decay, gather cooldown, sanity-from-threat, drink/boil actions
  gatherTable.js      — gather weights by phase (preRock/postRockPreAwaken/postAwaken)
  spells.js           — gated via requires.researched OR requires.studied (10 new study-unlocked spells)
  tools.js            — tools + dual-use weapon stats + recipe materials (scrollCraft/inkCraft)
  weapons.js          — pure weapons: Wooden Club, Stone Spear, Stone Mace (and future tiers)
  echoes.js           — prestige upgrades catalog
  logKinds.js         — kind → category (recent/unlocks)
  eraStories.js       — era-transition story events

src/state/
  persistent.js       — defaults that survive prestige (+ altarEtchings, permanentlyKnown)
  run.js              — defaults wiped per run (+ studyProgress, equipped, worldScore, statuses)
  actions.js          — single ACTIONS map
  reducer.js          — thin switch; delegates to systems; ALSO seeds Era-1 on prestige
  store.js            — useGameStore hook (load, save, tick interval, action wrapper)
  save.js             — load/migrate/save (versioned v1→v2→v3→v4)
  saveIO.js           — export/import JSON for user
  settings.js         — separate persistence track for UI prefs

src/systems/         gameplay logic, one file per concern
  gathering.js          — gather + cooldown + threat/event triggers + study passives + world-score promotion
  building.js           — canBuild/performBuild + bonuses aggregator (virtual water cost)
  research.js           — canListen/performListen + bonuses (virtual water cost)
  survival.js           — body+mind stats, decay, action effects, drink+boil, deathDebuff hook
  threats.js            — rollThreatEncounter + routeThreat (one-shot vs combat-class)
  combat.js             — multi-round passive fight resolver (#33), reads run.equipped
  defense.js            — getDefense (settlement only) + getFoodStealReduction (shared helper)
  equipment.js          — slot constants + canEquip/performEquip/Unequip + ring helpers
  death.js              — applyDeathDebuff cascade + reduceDeathDebuff (food recovery)
  disease.js            — dysentery: rollDysentery + tickDiseases + clearDysentery
  studies.js            — Arcane Studies engine: timed-study + pause-on-action + completion effects
  world.js              — World Score: threshold table + tickWorldScore + promotion helpers
  spells.js             — canCastSpell + performCastSpell (gated on studied/researched)
  consumables.js        — performUseTool for potions (hp/sanity/spirit + dysentery cure + deathDebuff)
  crafting.js           — performCraft (handles dual-use + producesResource recipes) + applyToolWear
  events.js             — interval + gather rolls, respondToActiveEvent (worldScoreDelta on choices)
  audio.js              — playback, crossfade, era-driven sync, autoplay handling
  era.js                — computeEra(state) (derived, never stored)
  scene.js              — composeScene(state) → layer list
  prestige.js           — getPrestigeReward, milestone aggregator
  stats.js              — snapshot, aggregate, compare, formatDuration
  passive.js            — TICK-driven passive production (buildings) + study passives + world-score promotion
  storage.js            — caps + food spoilage processing
  echoes.js             — applyEchoUpgrades, performBuyEchoUpgrade
  dev.js                — dev panel helpers (jump-to-era, give-X, equip-X, apply-status, etc.)

src/ui/              React components
  App.jsx               — top-level effects (era watch, music sync, keybinds)
  Shell.jsx             — responsive grid layout + modal triggers (TeachingsTreeModal/BuildingsTreeModal/StudyTreeModal/etc.); center column view-routed to {world | character | crafting | arcane | studies}
  ActionPanel.jsx       — center column ("Wasteland" header + pest indicator)
  ActionStrip.jsx       — footer action bar: Gather / Hunt / Eat ▾ / Drink ▾ / Rest / Ritual + Reset button
  LeftColumn.jsx        — vertical rail (icons only); top: World/Character/Crafting view-switchers; bottom: Arcane/Buildings/Studies/Challenges tabs. Skills + Inventory retired into Character hub.
  CharacterView.jsx     — Character page hub (#44/#45/#54): jump-nav (Stats/Skills/Equipment/Items) + 2-col stat grid (Survival incl. STR | Combat) + inline Skills (Survival + Combat sub-cols, Other below) + equipment row + EquipmentInventoryGrid.
  EquipmentInventoryGrid.jsx — top-tabbed item browser (All/Weapons/Defense/Magic/Tools/Crafting/Herbs/Other) with equip/use buttons routed by weaponStats.type.
  SkillsView.jsx, InventoryView.jsx — orphan after #54/#45 (kept on disk, not imported)
  BodyMindTab.jsx       — SurvivalBars wrapper inside LeftColumn
  StudiesPanel.jsx      — left-rail content for Studies tab (active study + in-progress + Open Path Trees)
  StudyTreeModal.jsx    — 7 path-tabbed SVG trees for Arcane Studies
  InventoryPanel.jsx    — collapsible category groups (Materials/Drink/Food/CraftMaterials/Tools/Arcane/Unknown)
  SurvivalBars.jsx      — Body section + Mind section
  StonePanel.jsx        — bottom strip, clickable post-hut → teachings modal + active-study progress bar
  TeachingsTreeModal.jsx — bottom-up SVG tree
  BuildingsTreeModal.jsx — left-to-right SVG tree
  EventModal.jsx        — choice events
  SettingsModal.jsx     — theme/font/size/motion/audio/keybinds/saves/credits
  SettingsTrigger.jsx   — floating gear bottom-right
  SplashScreen.jsx      — McCarthy-toned opener, 5 lines, skippable
  RightColumn.jsx       — tabs: Recent / Unlocks / Stats
  EatButton.jsx         — Eat with food-preference dropdown
  DrinkButton.jsx       — Drink dropdown with water tiers + dysentery-risk chips + Boil utility
  PanZoomSvg.jsx        — shared zoom/pan wrapper for tree modals (content-aware bounds)
  ToolsModal.jsx        — current Tools/Crafts modal (will be replaced by Crafting page #48)
  SpellsModal.jsx       — castable spells list
  DevPanel.jsx          — 6-tab dev overlay (Quick/Content/State/Encounters/Arcane/System)
  PrestigeModal.jsx     — Channel-the-Rock confirmation
  PrestigeShop.jsx      — 🌀 Echo Shop
  useSettings.js        — settings hook + apply to DOM
  useKeybindings.js     — global keydown handler with ACTION_HANDLERS map

src/util/
  rng.js              — mulberry32, pickWeighted, randInt, clamp

public/audio/         music + sfx files
tools/                dev wizards (add-audio.js)
docs/                 documentation
```

---

## How to add common things

| Goal | Primary file | Also touch | Notes |
|---|---|---|---|
| New resource | `content/resources.js` | — | `category` controls inventory section; `hiddenUntil` for mystery; `deathDebuffRecovery` if food/drink helps recover from death-cascade |
| New building | `content/buildings.js` | — | `tier`+`col`+`parents` for tree; `effect.gatherSpeedup` for cooldown; `effect.sanityPerMinute` for passive stat trickle |
| New research node | `content/research.js` | — | same tree fields; whisper text required; cost `water: N` is the virtual-water key |
| New arcane study node | `content/studies.js` | — | `path` (one of 7), `tier`, `col`, `parents`, `durationMs`, `cost`, `effect.{unlocksSpell|passive|addsStat}` |
| New threat (one-shot) | `content/threats.js` | — | `encounterChance` per gather; `effects.{stealFood|damage|sanityDrain}` |
| New threat (combat-class) | `content/threats.js` | — | add `combat: { hp, acc, eva, damage, damageType }` and `combatFlavor: { opener, attack, miss, victory, defeat }` |
| New weapon (pure combat) | `content/weapons.js` | — | `type`, `subfamily`, `weaponStats: { damage, acc, crit }`, `durability: { wearsOn: "combat" }` |
| New tool with combat use | `content/tools.js` | — | add `weaponStats` field alongside existing `effect` — that's the dual-use pattern |
| New event | `content/events.js` | — | `trigger: interval/gather/any`; `choices` array; optional `worldScoreDelta` per choice |
| New music/SFX | run `npm run add-audio` | — | tool handles file copy + entry; tag `eraN` for auto-unlock |
| New setting | `state/settings.js` SETTINGS_DEFAULTS | `ui/SettingsModal.jsx` | applies via body class or component prop |
| New keybind | `state/settings.js` keybindings | `ui/useKeybindings.js` ACTION_HANDLERS | rebind UI auto-supports new entries |
| New action | `state/actions.js` ACTIONS | reducer case + system fn + `store.js` actions wrapper | follow existing pattern; player actions use `appendLogAndStamp`, housekeeping uses `appendLog` |
| New era | `systems/era.js` computeEra() | content tagged with eraN | era is derived, not stored |
| New log kind | `content/logKinds.js` | `index.css` `.log-entry--X` | `category: "recent"` or `"unlocks"`; CSS picks color |
| New spell unlocked by study | `content/spells.js` | — | use `requires: { studied: <studyId> }` instead of `requires.researched` |
| New death-cure consumable | `content/tools.js` | — | add `deathDebuffRecovery: 0.NN` field; reduceDeathDebuff fires automatically in performUseTool |
| New combat-resolution rule | `systems/combat.js` | — | resolveFight is the entry point; respect damageType routing |

---

## State shape (top level)

```js
{
  persistent: {
    schemaVersion: <int>,
    echoes: 0,
    echoUpgrades: { [upgradeId]: level },
    automationUnlocks: {},
    storyMilestones: {},
    lifetimeStats: { ... },
    runHistory: [ ... ],                  // capped 50
    unlockedMusic: { [trackId]: { unlockedAt } },
    altarEtchings: { [etchingId]: { stampedAt, label } },  // persistent milestones from studies
    permanentlyKnown: { [resourceId]: true },              // resources unhidden once revealed-then-ascended
  },
  run: {
    startedAt: <ms>,
    era: <int>,                            // unused; derived via computeEra()
    inventory: { [resourceId]: qty },       // includes water_stagnant/muddy/boiled, scroll, ink
    gathered: { [resourceId]: qty },        // never decreases — for stats
    gatherCount: <int>,
    lastGatheredAt: <ms>,                   // cooldown driver
    lastActionAt: <ms>,                     // study pause-on-action driver
    rockFound: bool,
    rockAwakened: bool,
    rockAwakenedAt: <ms>,                   // animation gate; prestige sets to now-5000
    built: { [buildingId]: { at } },
    researched: { [researchId]: { at } },
    stats: { hunger, thirst, energy, hp, happiness, sanity, spirit },
    statuses: {
      warded?: { until },                   // banish spell ward
      dysentery?: { active, startedAt, expiresAt },
      deathDebuff?: { active, magnitude, startedAt, lastDeathAt, deaths },
    },
    events: { cooldowns, lastIntervalMs },
    activeEvent: null | { id, firedAt },
    alignment: { good, evil },              // hidden — never display
    skills: { [skillId]: { xp, level } },
    toolsCrafted: { [toolId]: { craftedAt, count } },
    toolDurability: { [toolId]: <int> },    // applies to tools AND weapons (same map)
    lastHuntAt: <ms>,
    lastPassiveTickAt: <ms>,
    passiveAccum: { [resourceId]: <float> },
    activePests: { [pestId]: { until, intensity } },
    lastSpoilTickAt: <ms>,
    spoilAccum: { [resourceId]: <float> },
    eraMilestonesSeen: { [era]: true },
    spellCooldowns: { [spellId]: <ms> },
    splashSeen: bool,

    // Arcane Studies (#27, #31)
    studyProgress: { [nodeId]: { startedAt, accumulatedMs } },
    activeStudyId: <string|null>,
    studiesCompleted: { [nodeId]: { completedAt } },
    studyStatBonuses: { armor: <int> },    // cached from study.effect.addsStat
    lastStudyTickAt: <ms>,

    // World Score (#29)
    worldScore: <float>,
    worldScoreAccum: <float>,
    lastWorldScoreTickAt: <ms>,
    worldScoreRevealed: bool,

    // Combat / Equipment (#32+)
    equipped: {
      handLeft, handRight, ranged, head, chest, leggings, boots, gloves: null | { id, level, xp, enchants } | { twoHandedHeldIn: "handLeft" },
      rings: [ 10 null-or-instance entries ],
      back, overArmor, talisman: null | { id, level, xp, enchants },
    },

    log: [ { t, kind, message } ],
  }
}
```

---

## Common reducer patterns

**Player-initiated action (pauses studies):**
```js
case ACTIONS.GATHER: {
  const { run, persistent, events } = performGather(state);
  return { persistent, run: appendLogAndStamp(run, events) };
}
```

**Housekeeping action (does NOT pause studies):**
```js
case ACTIONS.EQUIP: {
  const { run, events } = performEquip(state, action.id, action.slot);
  return { persistent: state.persistent, run: appendLog(run, events) };
}
```

**TICK** runs in order: passiveProduction → spoilage → diseases → studies → worldScore → pests → events. Each tick fn returns `{ run, events }` (or `{ run, persistent, events }` if it writes to persistent — see tickStudies for altar etchings).

---

## Workflow on session start

1. Read this file (you're done).
2. Read `docs/HANDOFF.md` for current state + immediate next moves.
3. If working on a specific system, skim its entry in `docs/systems.md` (find by header).
4. Glance at the relevant `src/` files.
5. **Ask the user what they want before assuming.** Don't enumerate features — pick a direction together.

## When in doubt

- "How does X work mechanically?" → `docs/systems.md` (find entry, see "Where" pointer)
- "Where is X in the code?" → systems.md "Where" pointer
- "What was decided about Y?" → `docs/roadmap.md` for vision, `docs/ERA_PLAN.md` for active design + locked decisions
- "What patterns does code use?" → here (top of file) + `docs/architecture.md` v2 addendum
- "What bugs are known?" → `docs/BUGS.md`
- "What's planned for upcoming eras?" → `docs/ERA_PLAN.md`
- "How do I add audio?" → `tools/README.md`, `npm run add-audio`

## Sandbox caveat for AI agents

The local Linux mount frequently lags behind file-tool edits. Bash `wc -l` / `cat` / `node -e parse` may see truncated stale versions of recently-edited files. **The Read tool is authoritative.** When acorn-jsx parses fail with errors near the truncation point but Read shows complete files, trust Read and proceed.

## Quick smoke test

```bash
npm install
npm run dev
```
Open `http://localhost:5173`. To test fresh: open dev tools → Application → Local Storage → delete `namigatchi-save` → reload. Or use the dev panel's **💥 Nuke save (reload)** in the System tab.

---

*This file is the stable spine. Don't bloat it with current-state details — those go in HANDOFF.md or systems.md.*
