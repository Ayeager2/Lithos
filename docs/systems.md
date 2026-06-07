# Lithos — Systems Checklist

A living tracker of every gameplay system in the project. Each entry has:

- **State** — what's actually built right now
- **What it does** — the mechanic in one or two sentences
- **Where it lives** — which files own it
- **Next steps** — small additions to consider in upcoming iterations
- **Long arc** — where it eventually ends up across the whole game

Update this file whenever a system gets built or evolved. Re-read it before
starting an iteration so we don't lose context after time away.

> *Status legend:* 🟢 shipped · 🟡 partial · ⬜ planned · 🔮 future-vision

---

## Core architecture (foundational)

### 🟢 State management — persistent vs run split
**State.** Two top-level slices: `persistent` (survives prestige forever — Echoes, lifetime stats, run history, alignment history-someday) and `run` (wipes on reset/prestige — current resources, stats, buildings built, research learned, log). Save format is versioned with a migration hook in `save.js`.

**Where.** `src/state/persistent.js`, `src/state/run.js`, `src/state/save.js`, `src/state/reducer.js`, `src/state/store.js`.

**Long arc.** Multiple prestige layers later (Echoes → Vestiges → Eternities). Each is a new section of persistent state. The split is immutable architecture from day one.

---

### 🟢 Reducer + systems pattern
**State.** Reducer is intentionally thin. Each action delegates to a system function in `src/systems/` that does the actual work and returns new state slices + log events. Reducer is a dispatcher.

**Where.** `src/state/reducer.js`, all of `src/systems/*`.

**Why.** Keeps reducer scannable, makes systems unit-testable, enforces that all gameplay logic is in one identifiable place per system.

---

### 🟢 Content as data
**State.** Resources, gather tables, research nodes, buildings, threats, events, log kinds, survival rates, building categories — all live as plain data files in `src/content/`. Systems read these. Adding new content means new entries, no system code changes.

**Where.** `src/content/*.js`.

**Long arc.** Every era's content is more entries in these files. Eventually consider migrating to JSON for moddability, but not until needed.

---

### 🟢 Pure scene composition
**State.** `composeScene(state)` returns layers. UI renders. As the world transforms (hut, fire pit, awakened rock, future structures), new layers conditionally appear.

**Where.** `src/systems/scene.js`, `src/ui/Scene.jsx`.

**Long arc.** Layers swap from text placeholders → SVG art → final art without code changes. Each era adds visual layers (radiation receding, sprouts, demons in the distance, etc.).

---

## Era 0 — Scavenger

### 🟢 Gathering loop
**State.** Click Gather (or press G), roll a weighted table for a random resource (wood/stone/water; fragments after rock found; food after Foraging research). Water is rare (8% of rolls). Quantities scale with progress: pre-rock 1 per drop, post-rock-pre-awaken 1–2, post-awakening 1–3, plus +1 per gather-bonus source (hut, fire pit, knapping, tracking).

**Where.** `src/systems/gathering.js`, `src/content/gatherTable.js`, `src/content/resources.js`.

**Next steps.** Per-zone gather tables when zones exist (different drops at the cave vs. the forest). Not needed yet.

---

### 🟢 Gather cooldown — the manual→automation curve
**State.** Each gather has a cooldown. Base 1500ms, floored at 250ms. Reductions stack from buildings and research:
- Hut: –150ms
- Fire Pit: –100ms
- Knapping: –250ms
- Tracking: –100ms

With everything Era 1 has to offer: 900ms (about 40% faster than base). Holding the gather key does NOT bypass the cooldown — `e.repeat` is filtered, anti-spam from day one. Cooldown rejections are silent (no log spam from key-mashing).

**UI.** The Gather button shows a live fill bar that animates across the bottom edge during cooldown. Button disabled until the bar fills. CPU-cheap — the React re-render interval only runs while a cooldown is active.

**Where.** `src/content/survival.js` (gather config), `src/systems/gathering.js` (`getGatherCooldownMs`, `canGatherFull`), `src/ui/ActionPanel.jsx` (UI).

**Long arc.** The whole incremental progression curve hangs off this. Era 2 tools (Stone Axe, Bone Knife) will add more reductions. Era 3 research could grant `gatherSpeedup` of 500ms+ per node. Era 4+ unlocks "Auto-Gather" — a passive trickle that gathers without clicks while you focus on higher-tier decisions. By late game, most early-tier resources are passive.

---

### 🟢 Keyboard shortcuts
**State.** Global keyboard shortcuts for the four most-used actions. Defaults: G (gather), R (rest), E (eat), D (drink). Customizable in Settings → Keyboard shortcuts. Click a key, press a new one to rebind. Esc cancels rebind, Backspace clears the binding.

**Anti-spam.** Holding a key does NOT auto-fire — `e.repeat` is filtered in the global handler. Combined with the gather cooldown, players can't mash their way past the wasteland's harshness.

**Conflict detection.** Trying to bind a key that's already bound to another action shows a conflict warning and refuses the bind. Player must clear the existing binding first.

**Suppression.** Shortcuts won't fire when typing in inputs/textareas (so settings inputs aren't hijacked). Disabled entirely while the splash is showing.

**Where.** `src/ui/useKeybindings.js` (global handler), `src/state/settings.js` (`keybindings` field), `src/ui/SettingsModal.jsx` (rebind UI), `src/App.jsx` (hook usage).

**Long arc.** More actions to bind as the game grows: open buildings/teachings/settings modals, prestige action, etc. The hook's action-handler map is one place to extend — add a new entry, surface a row in the settings UI.

---

### 🟢 Rock awakening
**State.** Random chance to find the rock during gather. Once found, fragments drop. 10 fragments → rock awakens. Whisper to build a hut fires.

**Where.** `src/systems/gathering.js`, `src/systems/rock.js`, `src/content/gatherTable.js`.

**Long arc.** Rock will gain XP from every action (slow trickle), evolve form along alignment axis (light/dark/balanced), eventually become the prestige currency vessel.

---

### 🟢 Splash screen
**State.** Five McCarthy-style lines fade in/out on each fresh run. Skippable. Plays on every prestige (each new awakening).

**Where.** `src/ui/SplashScreen.jsx`.

**Next steps.** Pick a final font (user direction: rugged, jagged, hurts to read).

---

## Era 1 — Awakening

### 🟢 Storage / inventory caps / spoilage
**State.** Each resource declares an optional `baseCap` in content/resources.js (omit = uncapped, e.g. fragments). Buildings declare `storageCaps: { resourceId: capIncrease }`. Effective cap = baseCap + sum of storage from owned buildings. `getResourceCap(state, resourceId)` reads it. `clampToCap(inventory, state, prevInventory)` enforces caps on additions while preserving existing oversupply (old saves keep what they had). Caps clamp on every gather/hunt and pace passive production (Garden/Well stop adding past cap).

**Spoilage.** Food resources declare `spoilage: { perMinute, atCapMultiplier }`. `processSpoilage(state)` runs in TICK after passive production, decays food by elapsed real time. Past-cap stockpiles spoil at the multiplier rate (grubs: 0.2/min normally, 0.8/min at cap; bird meat: 0.4/min normally, 2.0/min at cap). Catch-up capped at 30 minutes for offline absences. Fractional spoilage carried in `run.spoilAccum`.

**UI.** Inventory panel shows `12/30` for capped resources (just `12` for uncapped). Color shifts to warn at ≥80% of cap and danger when at cap. Spoilage events log to Recent: "🦠 1 grub spoiled."

**Cairn (storage building).** Tier-4 building, parent: hut. Requires hiddenStores research (already exists). Cost wood:30, stone:50. Storage caps: +50 wood, +50 stone, +20 water, +15 grubs, +10 bird meat, +20 feathers. The first cap-raise path Era 1 offers.

**Where.** `src/content/resources.js` (baseCap + spoilage data), `src/content/buildings.js` (Cairn + storageCaps), `src/systems/storage.js` (getResourceCap, clampToCap, processSpoilage, getCapStatus), `src/state/run.js` (lastSpoilTickAt, spoilAccum), `src/state/reducer.js` (TICK calls processSpoilage), `src/systems/gathering.js` + `hunting.js` + `passive.js` (clamp on add), `src/ui/InventoryPanel.jsx` (cap display).

**Long arc.** Era 2 introduces a Granary (food-only cap raise) and Cellars (preservation = lower spoilage). Era 3 magic preservation. The cap+spoilage shape is the foundation for late-game economy decisions ("do I build more storage or more producers?").

---

### 🟢 Buildings
**State.** Tree-based modal with left-to-right SVG layout. **12 buildings shipped** across Eras 0–3:
- **Era 1 (shelter/comfort):** Hut, Fire Pit, Water Hole (renamed Well), Garden, Cairn
- **Era 2 (industry/settlement):** Forge, Home, Stone Walls, Rudimentary Silo, Rudimentary Farmhouse
- **Era 2/3 (arcane):** Alembic, **Stone Altar** (#26 — gate to Arcane Studies, gated by `altarWork` research + `home` built)

Each gated by a combination of `requires.researched` / `requires.hasBuilding` / `requires.rockAwakened`. Categories drive tree color coding (shelter, comfort, tools, industry, arcane, sovereignty, cosmos). Effects are aggregator-driven: gather yield, gather cooldown reduction, rest bonus, passive production, storage caps, spoilage multiplier, defense, food-steal reduction.

**Where.** `src/systems/building.js`, `src/content/buildings.js`, `src/ui/BuildingsTreeModal.jsx`, `src/ui/BuildingsPanel.jsx` (trigger).

**Known issue.** See **BUGS.md #005** — tree modal hides nodes whose prerequisites aren't met, so most of the 11 buildings appear invisible to the player. Fix involves splitting `getVisibleBuildings` into "known" (everything for tree) vs "available" (only buildable now).

**Long arc.** Many tiers ahead. Era 4+ magitek workshops, companion-related structures, Era 3+ Stone Altar (see Pipeline). Tools-tier-3 buildings (Sanctum?) deferred.

---

### 🟢 Teachings (research)
**State.** Bottom-up SVG tree modal. The rock whispers; player offers resources to listen. **22 teachings shipped** across Eras 1–3:
- **Era 1 tier 1 (survival foundations):** Foraging, Fire, Knapping
- **Era 1 tier 2 (defense + craft):** Vigilance, Hidden Stores, Mending, Net Weaving, Hardened Wood (digging stick)
- **Era 1 tier 3 (refinements):** Cooking, Tracking, Water Carrying, Trapping
- **Era 2 (industry):** Smithing, Fletching, Home
- **Era 3 (arcane):** Arcane Awakening, Mending Word, Soothe, Inner Hearth, Alchemy
- **Era 3 alignment-gated:** Banish (good ≥ 3), Bend (evil ≥ 3)

Resets on prestige. Tree positions hand-coded (`tier` + `col` + `parents`).

**Where.** `src/systems/research.js`, `src/content/research.js`, `src/ui/TeachingsTreeModal.jsx`.

**Known issue.** Same root cause as buildings: see **BUGS.md #005** — `getVisibleResearch` hides nodes with unmet prereqs.

**Long arc.** Era 4 = Industry tier. Era 5 = Forbidden (eldritch). Era 6 = Sovereignty. Era 7 = Cosmos. Tree fills out across the whole game.

---

### 🟢 Survival (Body stats)
**State.** Activates when hut is built. Four physical stats: Hunger (0–100, high=bad), Thirst (high=bad), Energy (low=bad), HP (low=bad). Decay per action; eat/drink/rest restore. Yield penalties at thresholds. Cannot gather when energy=0.

**Where.** `src/systems/survival.js`, `src/content/survival.js`, `src/ui/SurvivalBars.jsx`, `src/ui/ActionPanel.jsx`.

**Hard-core opening.** Stats start in rough shape (HP 40, Hunger 60, Thirst 60, Energy 50). Player has to climb out, not maintain.

**Next steps.** Wells and gardens (passive water/food trickle — needs idle systems). Stamina-cost reduction items. More food types (berries, meat — see Resources / Food).

---

### 🟢 Mind stats (Resolve, Sanity)
**State.** Two mental stats. Resolve = daily wellbeing, drains from physical needs in red, rises from comfort + progression. Sanity = mental stability, ONLY affected by horror events (threats, damage, future eldritch). Both start LOW on a fresh run (Resolve 15, Sanity 25 — you woke up in hell).

**Where.** `src/systems/survival.js` (yes, same module — mental stats coexist with body stats), `src/ui/SurvivalBars.jsx` (Mind section).

**Naming note.** Data field is `happiness`. UI label is "Resolve." "Spirit" is reserved for a future magic-system stat in Era 3+.

**Long arc.** Sanity penalties scale up massively in Era 3+ (cosmic horror). Low-sanity events (hallucinations, weirder log entries) become atmospheric mechanics.

---

### 🟢 Threats
**State.** Random encounters during gather. **4 threats shipped:**
- **Scavenger** (Era 1, ~7% chance) — steals 1–3 food, 0–2 chip damage. Defense (Vigilance research + Stone Walls building) reduces both. Hidden Stores reduces theft further.
- **Whisperer** (Era ≥ 3, ~4%) — sanity-only drain (3–5). Defense doesn't apply. Banish/Wards clear it.
- **Hollow Hound** (Era ≥ 3, `kind: "demon"`) — HP + sanity mixed damage. `defenseHalf: true` — only half of physical defense applies. Sanity damage never blocked. Warding Talisman halves both.
- **Iconoclast** (Era ≥ 3, ~1%) — rarest. Resolve + Sanity drain via `happinessDrain`. No HP damage yet (building-destruction variant deferred — see ERA_PLAN).

The `warded` status (5 min after Banish spell) rejects all `kind: "demon"` threats while active.

**Where.** `src/systems/threats.js`, `src/content/threats.js`.

**Long arc.** Era 4+ bandits (organized, large food theft, defense-respecting). Era 5+ eldritch sanity-wipes. Threats become COMBAT later eras — fight back, not just absorb. Tame creatures help defend.

---

### 🟢 Random events
**State.** Two trigger paths: real-time interval (every ~60s, mostly nothing happens) and gather-triggered (4% chance per gather). Fire-and-react events apply effects directly. Choice events open a modal. Severity scales with era. Cooldowns prevent repeats. **~14 events shipped** across:
- **Era 1 fire-and-react:** Wind from East, Cracked Earth, Hidden Spring, Strange Lights, Blood Moon
- **Era 1 choice events:** Wandering Child, Hurt Elder
- **Era 1 pest:** Carrion Flock (sets `activePests`)
- **Era 2 NPC hints (notHasBuilding-gated):** wandererHintHome, soldierHintWalls, childHintSilo, farmerHintFarmhouse — each disappears once the suggested building lands
- **Era 3 alignment-gated:** Benevolent Pilgrim (good ≥ 3), Bitter Scholar (evil ≥ 3)

**Gates supported.** `requires.era`, `requires.hutBuilt`, `requires.hasBuilding`, `requires.notHasBuilding` (string or array), `requires.alignment.good`/`evil`.

**Pests.** `effects.setsPest: { pestId, durationMs, intensity }` writes to `run.activePests`. Modulates other systems (gather, passive production) until expiry. Carrion Flock halves Garden output and grub gather rate for 5 min; each successful Hunt has a chance to disperse it. TICK clears expired pests.

**Where.** `src/systems/events.js`, `src/content/events.js`, `src/ui/EventModal.jsx`, `src/ui/PestIndicator.jsx`, `src/systems/passive.js`.

**Long arc.** Era 4+ events with bigger stakes. NPC events that recruit companions. Building-damage events (need maintenance system). Era 5 reality-tearing. Era 7 cosmic-scale decisions.

---

### 🟢 Hidden alignment
**State.** Choice events accumulate `alignment.good` and `alignment.evil` in run state. **Never displayed numerically.** Surfaces actively in Era 3 via `requires.alignment: { good: N }` / `{ evil: N }` gates — supported by events, research (canListen + getVisibleResearch), and spells (canCastSpell). Player only sees consequences, not the counter.

**Currently surfacing:**
- Benevolent Pilgrim event (good ≥ 3)
- Bitter Scholar event (evil ≥ 3)
- Banish research/spell (good ≥ 3)
- Bend research/spell (evil ≥ 3, `alignmentDelta: { evil: 1 }` per cast cements drift)

**Where.** `src/state/run.js` (`alignment`), `src/systems/events.js`, `src/systems/research.js`, `src/systems/spells.js`.

**Long arc.** Endgame paths (Era 6/7) diverge by alignment. Companions react to alignment. Some buildings/research unavailable to wrong alignment. The rock's evolved form is determined by accumulated alignment over many runs (persistent layer, deferred).

---

### 🟢 Skills (learning by doing)
**State.** Per-skill XP and level, run-local. Wipes on prestige. Each meaningful action grants XP to the matching skill — no points to spend, no UI to navigate. Skills surface as a tab in the right column once any XP is earned.

**Active skills (Era 1):** Foraging (every gather), Hunting (every hunt), Toolcraft (every tool crafted), **Building (every building, #102)**. Combat skills (Swordplay, Archery, Magic Combat, Butchering) come online with the relevant equipment / kill. Gather disciplines (#97): Woodcutting, Fishing, Farming, Husbandry, Mining (was always stubbed, now active) all earn XP from their gather node. Tracking remains stubbed (`active: false`) — reserved for #35.

**Bonuses are declarative.** Each skill defines `bonuses: [{ stat, perLevel, max }]`. Systems aggregate via `getBonus(state, statName)`. Foraging adds a tiny per-level gather yield + speed reduction. Hunting reduces hunt cooldown (300ms/level), boosts hunt yield, and shifts drop weights toward birds. Crafting adds a per-level chance to refund a single material per tool. Building reduces the survival cost of building actions.

**XP curve.** Standard exponential — Level 1: 5 XP. Level 5: ~80. Level 10: ~580. Tunable in `content/skills.js` (`STANDARD_CURVE`).

**First-unlock messaging.** Crossing 0→1 in any skill emits a flavor log entry (`skill_unlock`, lands in Unlocks tab). Subsequent level-ups are quieter (`skill_levelup`, Recent tab).

**Where.** `src/content/skills.js`, `src/systems/skills.js`, `src/state/run.js` (`skills` slice), `src/ui/SkillsPanel.jsx`, `src/ui/RightColumn.jsx` (tab integration).

**Long arc.** Era 2 activates Pottery/Mining/Smithing by adding XP triggers. Echo upgrades (post-prestige) likely grant "start with +N levels in skill X" perks — that's the persistent layer's job. Higher max levels per skill as content arrives. Skill thresholds gate higher-tier tools/research (Snare already requires Hunting lvl 2).

---

### 🟢 Crafting (primitive tools)
**State.** Research → recipe known → resources spent → tool added to inventory under `category: "tool"`. Tools' declarative effects apply automatically while owned. The Forge (Era 2) is NOT required for primitives; these are hand-made.

**Era 1 tools:** Net (12 hunts, unlocks Hunt action), Snare (20 hunts, better hunt yield + cooldown reduction; gated behind Trapping research + Hunting lvl 2), Digging Stick (25 gathers, –100ms gather + extra water), Water Skin (30 water gathers, extra water on water gathers).

**Durability.** Each tool declares `durability: { max, wearsOn }` in content. `wearsOn` is one of `"hunt" | "gather" | "waterGather"` — that's the action that ticks durability down by 1. When durability hits 0, the tool is removed from inventory and a flavored breakage message logs ("The net comes apart in your hands…"). The system function `applyToolWear(run, actionTag)` runs at the end of `performGather` (twice when the drop was water — generic gather wear plus water-specific wear) and `performHunt`. Old saves without `toolDurability` gracefully default each tool to `max - 1` on first wear.

**Each craft action** consumes resources, grants Crafting XP (scales with tool tier), drains survival stats (perCraft decay sits between Build and Research in severity), and gives a small Resolve/Sanity boost (the "I made something" beat). Higher Crafting skill grants a per-resource refund chance — gentle but felt by ~level 5.

**UI.** Tool detail in the Crafts modal renders a durability bar with remaining-uses count. Bar shifts gold → orange (warn) → red (danger) as it depletes. Re-crafting is blocked while a tool is owned, so the natural rhythm is craft → use until broken → re-craft.

**Where.** `src/content/tools.js`, `src/systems/crafting.js` (`performCraft` + `applyToolWear`), `src/state/run.js` (`toolDurability` slice), `src/state/reducer.js` (CRAFT_TOOL action), `src/ui/ToolsModal.jsx` (DurabilityBar component), `src/ui/CraftsPanel.jsx` (left-column trigger card).

**Long arc.** Era 2 introduces Forge-required tools (Stone Axe, Bone Knife, Stone Pickaxe) with much higher durability. Repair-at-Forge mechanic arrives the same era — visit Forge, spend a fraction of the recipe cost to restore N durability. Era 3+ arcane tools have unconventional durability rules (a Fragment Knife's wear might tie to sanity instead of uses). Wear rates may eventually scale with skill — high Crafting/Hunting making your tools last longer.

---

### 🟢 Gather (unified discipline page — #97 → #104)
**State.** `state.run.activeLoop` (single active loop, shared with Patrol). The Gather page in the center column hosts seven tabs — Forage, Mining, Wood, Fishing, Farming, Husbandry, Hunting. Each tab pulls from `content/gatherNodes.js` (20 nodes spread across 6 disciplines) or `content/prey.js` (Hunting tab). Click a node card → `actions.setActiveLoop("gather", { nodeId })` (or `"hunt"` for prey) → `systems/loop.js` fires the matching `performGatherNode` / `performHunt` every `cycleMs`. Drops accrue into a shared **Pile of Goods** above the tab body (`state.run.activePile`). Click another card to swap targets (auto-resets pile); click the same card again or Stop to halt.

**Loop banner (#104).** Sits above the Pile. Looks up `getGatherNode(activeNodeId)` / `getPrey(activePreyId)` so the banner reads the proper display name + icon + tier instead of the raw camelCase id. Includes a built-in progress bar (`scaleX(loopPct)`) and Stop button.

**Skills per discipline.** Each node declares `skill: "<skillId>"`; XP routes through `gainXp(run, skillId, xp)` on every cycle. Foraging / Woodcutting / Fishing / Mining / Farming / Husbandry all have active skills as of #97.

**Where.** `src/content/gatherNodes.js`, `src/content/prey.js`, `src/systems/gather.js` (`performGatherNode`), `src/systems/hunting.js` (`performHunt` — separate because butchering bonuses), `src/systems/loop.js` (auto-loop runner), `src/ui/GatherView.jsx`.

**Long arc.** Era-locked nodes (each carries `era: N`) hide behind the era gate, so each era opens new tiers within the same tabs. Tool-gated nodes (need a Stone Axe to harvest a Hardwood node, etc.) wire in via `tool: "stoneAxe"` once #35 ships.

---

### 🟢 Magic page (tabbed by Study path — #101 → #106)
**State.** Single center-column page. Tabs mirror the Path Trees modal order exactly so Studies and Magic read across to each other: Foundation / ✨ Light / 🌑 Bend / 🌿 Elemental / ✒️ Sigilcraft / 🔔 Memory / 👂 Stoneword / ⚫ Voidcall / 🪔 Conversions. Buckets derived from `SPELL_PATH` (a static map in `MagicView.jsx`) which itself was built from `STUDIES[].effect.unlocksSpell`. Spells not in the map (Era 3 awakening spells: mendingWord, soothe, innerHearth, banish, plus the awakening's `bend`) bucket into Foundation. Ritual is synthetic — `_ritual: true`, lives in Conversions.

**Cards.** `patrol-card` shape for visual parity with Patrol/Hunting/Gather: icon, path-colored tier chip (`.patrol-card-tier--path-light/bend/elemental/...`), description, cost chips (fragments / spirit / water), full-width Cast CTA. Locked spells dim with 🔒. Cooling spells outline-dash and show remaining seconds.

**Empty tabs hide.** As content fills out the Elemental / Sigilcraft / Stoneword paths, their tabs unhide automatically.

**Where.** `src/ui/MagicView.jsx`, `src/content/spells.js`, `src/content/studies.js` (STUDY_PATHS), `src/systems/spells.js` (canCastSpell, getKnownSpells), `src/index.css` (`.patrol-card-tier--path-*`).

---

### 🟢 Hunting (Era 1 — original action; now folded into Gather)
**State.** Separate action with its own long cooldown (8000ms base, floored at 2500ms). Gated behind owning a Net or Snare in inventory. Drains energy (-10) and thirst (+3) per attempt; successful bird drops add another +2 thirst spike. Yield table is weighted heavily toward "nothing" and grubs at level 0; bird meat and feathers climb in frequency as Hunting skill levels up.

**As of #97 the legacy Hunting page is gone.** The Hunting tab inside GatherView holds the prey roster (`content/prey.js`) and fires `performHunt` through the same auto-loop runner as the other Gather tabs.

**The first hunts are mostly failures.** This is intentional — narrative framing as "you don't know what you're doing yet, the birds are quick, the wasteland isn't kind." Log messages call out that you ARE hunting birds even when you scared up grubs instead.

**Drop tags drive skill scaling.** Each row in `content/huntTable.js` has a `tag` (`bird | grub | graze | nothing`). Skills modify weights by tag. New drop types slot in by adding rows + tags; no system code changes.

**Where.** `src/content/huntTable.js` (drop table + cooldown config), `src/systems/hunting.js` (logic), `src/state/reducer.js` (HUNT action), `src/state/run.js` (`lastHuntAt`), `src/ui/ActionPanel.jsx` (Hunt button).

**Long arc.** Era 2 introduces ranged hunting via Fletching research → arrows (consume feathers). Era 2 also adds bigger game (deer-ish, boar-ish) with combat mechanics rather than weighted rolls. Era 3+ hunts include strange creatures whose meat carries side effects (sanity drain, magical buffs). The "bird flock" pest event is on the future-events list — currently birds are exclusively a hunt target.

---

### 🟢 Resources & categories (with progressive disclosure)
**State.** Resources have a `category` field (`materials | food | fragment | tool | mystic | unknown`). Food resources additionally have `nutrition` and `tier`. Resources can be HIDDEN behind unlock conditions via `hiddenUntil` — fragments currently appear under "Unknown" with name `???` and icon `❓` until the future `arcaneAwakening` research is learned. Inventory groups by category in collapsible sections; collapse state persists in user settings. The eat action consumes any food-category resource (lowest-nutrition first). Cooking adds +5 nutrition per food.

**Where.** `src/content/resources.js` (data + display helpers), `src/ui/InventoryPanel.jsx` (rendering).

**Hidden-until pattern.** When a resource has `hiddenUntil: { researched: "X" }` and that research isn't learned, the inventory shows it under "Unknown" with placeholder name/icon. Once X is learned, the reveal is automatic — no code changes needed. Same pattern can gate behind buildings, era, etc.

**Early-game balance.** Pre-rock gather quantities are 1 (one) per drop, with high "nothing" weight (28%). The wasteland is barren. Once the rock is found, quantities climb to 1–2 and grubs appear at low weight (4) so the player can scratch up the occasional meal even before Foraging research. Post-awakening, 1–3 and grub weight rises to 5. Foraging research stacks on top with weight 15 — researching it is still the moment grubs become a reliable food source. This base presence prevents the prior dead-end where tier-2 research (which costs grubs) was unreachable when water for Foraging research was scarce.

**Currently shipped foods:** Grubs (gather, nutrition 3, deathDebuffRecovery 0.05), Bird Meat (hunt drop, nutrition 22, tier 2 — first warm meal, deathDebuffRecovery 0.12). Feathers (material from hunts, used in fletching research).

**Currently shipped craft materials:** Scroll (📜), Ink (🖋️) — both Era 2, gated by `altarWork` research, consumed by Arcane Studies at the Stone Altar.

**Long arc.** Era 2 farming and water collection (water tiers shipped). Era 3 magical foods. Spoilage/storage when abundance is real.

---

### 🟢 Water tier system + dysentery (Era 1)
**State.** Water is no longer one resource — it's a three-tier ladder:
- 🩸 `water_stagnant` (gather from puddles, 25% dysentery chance, +20 thirst relief, spoils)
- 💧 `water_muddy` (Water Hole production, 10% dysentery, +35 thirst, spoils slowly)
- 🫖 `water_boiled` (Boil action with wood + muddy at firepit, 2% dysentery, +50 thirst, stable)

**Virtual-water cost key.** Existing `cost: { water: N }` entries on buildings/research/tools/survival actions resolve via `totalWater()` / `spendWater()` in resources.js — spends from lowest tier first. Lets existing recipes work without splitting every cost across tiers.

**Drink dropdown.** Replaces the simple Drink button with a ▾ menu showing each owned tier (icon · count · +thirst · ⚠ dysentery %) plus a Boil utility option when researched. Preference persists in settings.drinkPreference.

**Dysentery (`run.statuses.dysentery`).** Active sickness: 2× hunger/thirst decay + slow HP/sanity/spirit drain. 5–10 min duration. Cleared by Mending Word spell, Mending Potion, Cleansing Word (study-unlocked), or naturally. Boiled water drunk while sick shortens recovery 60s/dose. **Foundation for future illnesses** — disease.js is generic.

**Save migration v1→v2.** Existing `water` inventory remaps to `water_muddy` if Water Hole/Well built, else `water_stagnant`. Lifetime stats remap too.

**Where.** `src/content/resources.js` (tier defs + virtual-water helpers), `src/content/survival.js` (drink + boilWater action), `src/systems/survival.js` (performDrink + performBoilWater), `src/systems/disease.js` (rollDysentery + tickDiseases + clearDysentery), `src/ui/DrinkButton.jsx`, `src/state/save.js` (migrate1to2).

**Long arc.** Era 2+ adds Filtered (charcoal+sand research) + Purified (Era 3 arcane). Era 3+ adds Beer/Brewing. Each tier reduces dysentery further; cleaner water becomes the late-game expectation.

---

### 🟢 Arcane Studies — Stone Altar + 7 magic paths + timed-study engine
**State.** Era 2+ deep-magic layer, layered ON TOP of Stone's Teachings (which keeps the listen-once model for Era 0–2 fundamentals). Built end-to-end:

**Stone Altar (`stoneAltar`).** Era 2 building gated by `altarWork` research + `home` built. Cost 80 stone + 40 wood + 5 fragments. Passive +0.2 sanity/min + +0.1 spirit/min trickle. Unlocks the Studies left-rail tab.

**Scroll + Ink resources.** Both `category: "craftMaterial"`, both gated by `altarWork`. Crafted via `scrollCraft` (2 wood + 1 fragment → 1 scroll) and `inkCraft` (1 wood + 1 grub → 1 ink) recipes — new `producesResource` field on tool entries makes a recipe yield a resource instead of a tool instance. Every study consumes 1 scroll + 1 ink at start.

**Timed-study engine (`systems/studies.js`).** Multiple studies in-progress allowed; one active at a time. Clock only advances when `now - lastActionAt > 5000ms` (player idle). Switching active study is free. Cancel discards time but no material refund. Each player-action reducer case writes `lastActionAt = now` via `appendLogAndStamp`.

**Seven path subtrees + 21 nodes.** Light / Bend / Elemental / Sigilcraft / Memory / Stoneword / Voidcall (apex-gated by `alignment.evil ≥ 5`). Per-completion deltas in `STUDY_PATHS`:
- Light: +3 sanity, +1 good
- Bend: −3 sanity, +1 evil
- Elemental: +1 sanity, +1 worldScore
- Sigilcraft / Memory / Stoneword: +1–2 sanity, +0.5 worldScore each (varies)
- Voidcall: −5 sanity, +2 evil, **−1 worldScore** (apex erosion)

**Cross-path nodes** (Wardweave needs Sanctuary+First Sigil → +2 armor; Ghostcall needs First Echo+Curse; Truesight needs Weakness-Sight+Cleansing Word).

**10 new spells unlocked via `requires.studied: <studyId>`** in content/spells.js: greaterMending, cleansingWord, blessing, greaterBend, curse, soulflame, dominate, echo, ghostcall, voidcall. `getKnownSpells` checks both researched AND studied gates.

**Altar etchings (`persistent.altarEtchings`).** First study completed, first per-path completion, first cross-path completion, every Voidcall completion — each stamps a permanent etching that survives prestige.

**Stone strip indicator.** When a study is active, the stone strip renders a thin progress bar at the bottom of stone-info section. Pause indicator (⏸ icon + muted color) when player has acted within the last 5 seconds.

**UI.** `ui/StudiesPanel.jsx` (left-rail content with active study + paused list + Open Path Trees button). `ui/StudyTreeModal.jsx` (7 path-tabbed SVG trees with green-`+` affordance + locked nodes per BUGS.md #005, cross-path "off-tree" dashed edges).

**Where.** `src/content/studies.js` (paths + nodes), `src/systems/studies.js` (engine + completion effects + getStudyPassives + getStudyStatBonuses), `src/state/run.js` (studyProgress / activeStudyId / studiesCompleted / lastStudyTickAt / lastActionAt), `src/state/reducer.js` (START_STUDY / SET_ACTIVE_STUDY / CANCEL_STUDY + tickStudies in TICK), `src/state/save.js` (migrate2to3), `src/ui/StudiesPanel.jsx` + `src/ui/StudyTreeModal.jsx` + `src/ui/StonePanel.jsx` (active study indicator), `src/ui/LeftColumn.jsx` (Studies tab gating).

**Long arc.** Authoring more nodes per path. Era 3+ may add an 8th path (Bloodwork? — open design). Combat Phase 6 (#37) reads Sigilcraft completions to populate weapon enchant slots.

---

### 🟢 World Score — hidden world-restoration meter
**State.** Silent counter at `run.worldScore`. Contributed by:
- Elemental study completion: +1
- Sigilcraft / Memory / Stoneword study completions: +0.5
- Helpful event choices (Tend their wounds, Wave them in, Welcome the Pilgrim): +0.5 to +1
- Ash Cleanse passive: +0.01/min (Elemental tier-2 study, ticked in `tickWorldScore`)
- Voidcall study completion: −1
- Voidcall spell cast: −1

**Graduated effects** (hidden until apex):
| Threshold | Effect |
|---|---|
| ≥ 5 | Gather yield ×1.05 |
| ≥ 15 | Garden output ×1.20 (stacks with farmhouse + Quicken Growth) |
| ≥ 30 | Gathered water_stagnant promotes to water_muddy ~10% |
| ≥ 50 | Water Hole produces water_boiled directly |
| ≥ 80 | Garden produces bird_meat instead of grubs |
| ≥ 100 | One-shot apex reveal log event — the player learns the meter exists |

**Where.** `src/systems/world.js` (thresholds, helpers, tickWorldScore, apex reveal), `src/systems/gathering.js` (gather multiplier + stagnant promotion roll), `src/systems/passive.js` (water hole + garden promotions), `src/state/run.js` (worldScore + worldScoreAccum + worldScoreRevealed), `src/systems/events.js` (worldScoreDelta per choice), `src/content/studies.js` (path completion deltas), `src/systems/spells.js` (voidcall castMechanics).

**Long arc.** Future apex rewards (≥100): per-run unlock, lifetime aggregate in `persistent` for echo upgrades, additional thresholds (≥150 garden tier 3, ≥200 ambient sanity regen). Open: lifetime persistent aggregate vs run-local only.

---

## Cross-cutting

### 🟢 Save/load with migration hook + JSON export/import
**State.** `localStorage` under `namigatchi-save`, versioned schema, `migrate()` in `save.js` ready for future schema bumps. New fields default-fill on load. Export downloads `namigatchi-save-YYYY-MM-DD.json`. Import reads a file, validates basic shape, writes to localStorage, reloads page (so migration runs cleanly). Save management now lives inside the Settings modal (gear icon, bottom-right).

**Where.** `src/state/save.js`, `src/systems/saveIO.js`, surfaced in `src/ui/SettingsModal.jsx`.

**Next steps.** Multi-slot saves (named save slots, save slot picker). Cloud save when there's a backend. Export-as-shareable-seed for replays/challenges.

---

### 🟢 User settings (theme, font, accessibility)
**State.** Separate persistence track from game state. Stored in `localStorage` under `namigatchi-settings` so settings survive across save resets, prestige wipes, and game data clears. Three theme options (Dark, Sepia), three font options (System, Lexend for dyslexia-friendly reading, Atkinson Hyperlegible for low vision), three text sizes (Small, Normal, Large), three motion options (Auto / Reduced / Full — Auto follows OS `prefers-reduced-motion`). Settings apply live via body class names and CSS variables. Inventory category collapse state also persists here. Accessed via floating gear icon at bottom-right.

**Motion / photosensitivity.** The awakening flash and other dramatic animations have calm variants (gentle fade-ins, no scale, no brightness peak) that activate under either OS preference OR explicit user choice. Important for photosensitive epilepsy and vestibular disorders. Default is "Auto" — respects OS — so users with their system already configured get safe behavior with no extra action.

**Where.** `src/state/settings.js`, `src/ui/useSettings.js`, `src/ui/SettingsModal.jsx`, `src/ui/SettingsTrigger.jsx`. Theme/font/motion CSS in `src/index.css` (body.theme-X, body.font-X, body.size-X, body.motion-X, plus `@media (prefers-reduced-motion: reduce)`).

**Long arc.** Color-blind palettes, sound volume controls when audio arrives, language selection if we localize, optional one-time photosensitivity warning on first ever launch. The pattern is established: any new preference goes in `SETTINGS_DEFAULTS`, gets a UI control, applies via CSS class or component state.

---

### 🟢 Prestige (Channel the Rock) — with Era-1 ascension start + Echo Shop
**State.** Available once `era >= 2`. Channel-the-Rock button lives inline in the stone strip (purple, awakening-themed) when eligible. PRESTIGE reducer case runs end-run snapshot, grants Echoes, **snapshots known resources into `persistent.permanentlyKnown`** (so fragments etc. stop reading "???" forever), then **seeds the new run at Era 1**: `rockFound: true`, `rockAwakened: true`, `rockAwakenedAt: now − 5000`, `built.hut`, `stats: SURVIVAL.startValues`, `splashSeen: true`. Echo upgrades apply on top via `applyEchoUpgrades`. RESET_RUN (death/give-up) is unchanged — still starts at Era 0 with the full cosmic-horror opening.

**Echo Shop.** 14 upgrades across 5 categories (Cache / Body / Mind / Skills / Arcane). Tiered cost `ceil(base × 1.5^level)`; one-time upgrades buy once. Examples: Old Wood (+10 wood per level × 5), Tougher Body (+20 starting HP, one-time), Foraging Memory (start with foraging at +1 level/tier × 5), Sliver of Stone (+5 fragments per level × 3), Banked Spirit (+10 starting Spirit per level × 4).

**Where.** `src/systems/prestige.js`, `src/state/reducer.js` (PRESTIGE case + `seedAscensionRun` + `snapshotKnownResources` helpers), `src/content/echoes.js`, `src/systems/echoes.js`, `src/ui/PrestigeModal.jsx`, `src/ui/PrestigeShop.jsx`.

**Long arc.** Layers 2, 3, 4 of prestige (Vestiges, Eternities, ?). Each one wipes the layer below for a deeper currency. Echo upgrades grow with new content (combat skills will get echo perks; world score will get a lifetime aggregate).

---

### 🟢 Equipment system — equipped slot foundation
**State.** Combat Phase 1 (#32). `run.equipped` maps every slot:
- **Main visible (8):** handLeft / handRight (dual-wield), ranged, head, chest, leggings, boots, gloves
- **Accessories tray (13, collapsible):** 10 rings + back + overArmor + talisman

Equippable items are looked up via `getEquippable(id)` (checks weapons.js first, then tools.js for dual-use). `canEquip(state, id, slot)` validates ownership + slot routing. `performEquip` auto-picks the first empty valid slot if none specified. Two-handed weapons consume both hands — the off-hand stores `{ twoHandedHeldIn: "handLeft" }` so UI shows it busy.

**Reducer actions.** EQUIP / UNEQUIP / EQUIP_RING / UNEQUIP_RING — all housekeeping (don't pause Arcane Studies).

**Dual-use weapons.** Stone Axe / Stone Pickaxe / Bone Knife / Bow / Fragment Knife carry BOTH tool `effect` AND `weaponStats`. Hatchet pattern: tool-leaning bonus + modest combat stats. Player can equip a pickaxe and the numbers tell them why it's a bad sword.

**Pure weapons (`content/weapons.js`).** Wooden Club (2–4 dmg), Stone Spear (3–7 dmg), Stone Mace (4–8 dmg) — Tier 1 primitives. Bronze/iron tiers come in Combat Phase 5 (#36).

**Durability tracking.** Same `run.toolDurability` map for tools AND weapons. `applyToolWear` in crafting.js iterates `[...getAllTools(), ...getAllWeapons()]` so combat wear ticks pure weapons too.

**Where.** `src/content/weapons.js`, `src/systems/equipment.js`, `src/state/run.js` (equipped default via freshEquipped()), `src/state/save.js` (migrate3to4 no-op), `src/state/actions.js` (EQUIP/UNEQUIP/EQUIP_RING/UNEQUIP_RING), `src/state/reducer.js`, `src/state/store.js` (action methods).

**Long arc.** Combat Phase 3 (#34) adds weapon level/XP per instance + combat skills. Phase 5 (#36) adds bronze/iron tiers + smithing. Phase 6 (#37) populates enchant slots from Arcane Studies completions. Character hub (#44/#45/#54) is the visible UI — equip via `EquipmentInventoryGrid`, unequip by clicking a filled slot.

---

### 🟢 Combat resolution — passive multi-round fight loop
**State.** Combat Phase 2 (#33). `systems/combat.js` `resolveFight(state, threatDef, rng)` runs a multi-round fight:
1. Opener narration from threat's `combatFlavor.opener` pool
2. Each round (max 12 — safety cap): player attacks (`acc - eva` roll, on hit roll [min, max] damage ×2 on crit), then threat attacks
3. Hit narration from per-pool templates with `{weapon}`, `{threat}`, `{dmg}` substitutions
4. Per-fight durability wear via `applyToolWear(run, "combat")`

**Threat routing.** `systems/threats.js` `routeThreat()` sniffs `threat.combat` and dispatches to either `resolveFight` (combat-class) or legacy `resolveThreat` (one-shot — Scavenger food theft, Whisperer pressure). Both coexist; both fire from the gather roll.

**Combat-class threats shipped:**
- **🐺 Wild Dog** (Era 1, hut+10 gathers) — 12 HP, dmg 2–4 (hp)
- **🗡️ Raider** (Era 2) — 22 HP, dmg 3–7 (hp)
- **🦴 Corrupted Walker** (Era 3, demon) — 35 HP, dmg 4–8 (hp)
- **🪦 Soulless Stalker** (Era 3, demon) — 18 HP, dmg 3–6 (**sanity** — armor doesn't help)

**Combat log kind.** Each line uses `kind: "combat"` with the `.log-entry--combat` CSS class. Consecutive lines visually fuse into a single fight block via tinted left border. 3–8 lines per encounter — fight reads as one event in the log.

**No weapon fallback.** Player without equipped weapon fights with `FISTS` (1–2 dmg, 60% acc, 2% crit). Numbers say "go craft something."

**Where.** `src/systems/combat.js` (fight loop), `src/systems/threats.js` (router + one-shot path), `src/content/threats.js` (combat-class threats with `combat` + `combatFlavor` fields), `src/systems/equipment.js` (getEquippedMeleeDef + getEquippedRangedDef), `src/index.css` (`.log-entry--combat`).

**Long arc.** Combat Phase 3 (#34) adds weapon XP per kill + combat skill XP per fight. Phase 6 (#37) reads enchant slots for damage modifiers. Bosses (#40, #41) get a turn-based modal — the same math, just exposed turn-by-turn.

---

### 🟢 Armor vs Defense split (locked)
**State.** Two separate stats:
- `armor` — **personal** damage reduction in combat. Sources: study completions (Wardweave +2 via `addsStat`), future armor crafts, future Light-path enchants. Reduces hp-damage threats only; sanity/spirit damage ignores armor (the mind has no armor).
- `defense` — **settlement** defense. Used by raid-style one-shot threats (Scavenger food theft) and future city raids in `resolveThreat`. NOT applied to personal combat.

**Why split.** Walls don't help when a wild dog jumps you in the wilderness. Walls protect your camp; armor protects your body.

**Helpers.** `getDefense(state)` and `getFoodStealReduction(state)` extracted from threats.js into `systems/defense.js` to break the combat→threats cycle. Re-exported from threats.js for backward compat.

**Where.** `src/systems/defense.js` (shared helpers), `src/systems/combat.js` (reads armor only, never defense), `src/systems/threats.js` (reads defense in resolveThreat for raids).

**Long arc.** When armor crafts arrive (Phase 5 #36): Iron Plate (chest), Iron Greaves (leggings), etc. — each adds to `armor`. Light-path enchants (Phase 6 #37) add more. Settlement defense grows with new wall/watchtower content.

---

### 🟢 Stat damage + targeted recovery (foundation)
**State.** Task #42. Threat combat blocks carry `damageType: "hp" | "sanity" | "spirit"` — damage routes to the right stat. Armor reduces hp damage only. Soulless Stalker (Era 3) is the first sanity-damage combat threat shipped.

**Recovery items.** Tools/foods carry `recoversStat` (via existing `useEffect` for tools) + `deathDebuffRecovery` (a separate field) for the death-cascade hook. Mending Potion clears HP damage AND death-debuff (0.30 magnitude). Stillness Potion clears sanity damage. Spirit Draught clears spirit damage.

**Where.** `src/systems/combat.js` (damageType routing in fight loop), `src/content/threats.js` (damageType on combat block), `src/content/resources.js` + `src/content/tools.js` (recovery fields).

**Long arc.** "Damaged-state vs low-state" visual on Character page stat bars (#49 polish). More damage types as content lands (poison? curse? exhaustion?). Authoring more horror/arcane combat threats to use the routing.

---

### 🟢 Death-debuff cascade (no run reset)
**State.** Task #50. Combat HP=0 no longer resets the run. Instead, `applyDeathDebuff` in `systems/death.js`:
1. Magnitude jumps by 0.5 per death (cap 0.95). Cascades to every survival stat:
   - HP / Energy / Happiness / Sanity / Spirit → `raw × (1 − magnitude)`
   - Hunger / Thirst → `raw + (100 − raw) × magnitude` (climb toward starving/parched)
2. HP floored at 1 — player wakes alive, badly hurt
3. Wake narration adapts: Home → "🏡 You wake in your home..." / Hut → "🛖 You wake at the hut..." / Bare → "🌑 You wake on the ground..."
4. Status persists at `run.statuses.deathDebuff = { active, magnitude, deaths, startedAt, lastDeathAt }`

**Recovery.** Every food consumed via `performSurvivalAction("eat")` reduces magnitude by the food's `deathDebuffRecovery`:
- Grubs: 0.05 (trace — every food gives back *something*)
- Bird meat: 0.12 (protein — bridge to STR when #47 lands)
- Mending Potion: 0.30 (panic button — 4 doses clear a fresh 0.5)

When magnitude hits 0, status clears with a quiet event: "🪶 The shake in your hands settles. The body is yours again."

**Where.** `src/systems/death.js`, `src/systems/combat.js` (calls applyDeathDebuff on defeat), `src/systems/survival.js` (eat → reduceDeathDebuff), `src/systems/consumables.js` (potion-use → reduceDeathDebuff), `src/content/resources.js` + `src/content/tools.js` (recovery rates).

**Long arc.** STR stat (#47) becomes the cascade keystone (currently magnitude IS the STR-loss proxy). Mending Word spell + future spells could add `clearDeathDebuff` calls. Higher-recovery foods at later eras. Tunable per-death magnitude curve as combat density grows.

---

### 🟢 Ascension QoL — Era-1 start + permanent reveal
**State.** Two locked decisions wired into the PRESTIGE reducer case:

1. **Era 1 start.** New run begins with rock awakened + hut raised + survival mechanics live + splash skipped. Player still rebuilds Fire Pit / Water Hole / Garden / all of Era 2+ — only the cosmic-horror *opening* (find rock → 10 fragments → awakening) is once-per-save.

2. **Permanent resource reveal.** `persistent.permanentlyKnown` snapshots every resource whose `hiddenUntil` was satisfied at the moment of channeling. Fragments stop reading "???" once you've ascended carrying knowledge of them. `isResourceHidden` short-circuits when the resource id is in the persistent set.

**RESET_RUN unchanged.** Death/give-up still starts at Era 0 in the dust — the cosmic-horror opening still hurts when you've earned it.

**Where.** `src/state/reducer.js` (`snapshotKnownResources` + `seedAscensionRun` helpers; PRESTIGE case uses both), `src/state/persistent.js` (permanentlyKnown default), `src/content/resources.js` (isResourceHidden checks the persistent set first).

**Long arc.** Generic by design — any future hidden resource inherits the persistence automatically. Could later extend to "permanent research knowledge" or "permanent skill XP bonus" for deeper prestige-layer flavor.

---

### 🟢 Stats observability
**State.** Every action increments lifetime counters. Each run-end snapshot pushed to `runHistory` (capped 50). `compareRuns()` produces deltas for "better/worse" UI. Stats UI gated behind first prestige (`runsCompleted >= 1`).

**Where.** `src/systems/stats.js`, `src/ui/StatsPanel.jsx`.

**Next steps.** When Era 2 ships and prestige unlocks, this finally becomes visible. Add charts later (run length over time, resource trends).

---

### 🟢 Logging — Recent / Unlocks / Stats tabs
**State.** Right column has tabs. Recent = transient gameplay feedback (gather drops, build failures, threats, events). Unlocks = narrative progression beats (rock find, awakenings, whispers, builds, teachings, choice events). Stats (locked).

**Where.** `src/ui/RightColumn.jsx`, `src/ui/LogPanel.jsx`, `src/ui/UnlocksPanel.jsx`, `src/ui/StatsPanel.jsx`, `src/content/logKinds.js`.

**Long arc.** Possibly a fourth tab when companions arrive (Companion log? Faction log?).

---

### 🟢 Audio (era-driven music with progressive unlocks)
**State.** Music plays automatically based on era — tracks tagged `era0`, `era1`, etc. crossfade as the player progresses. When the player first reaches an era, every track tagged for that era is added to `persistent.unlockedMusic` and stays unlocked forever (across prestige). Players can pin any unlocked track to override era-based selection. Crossfades are smooth (~2.5s). Browser autoplay policy is handled — if initial play is blocked, music retries on first user interaction. Volume sliders (Master / Music / Sound) and Mute toggle in Settings. Credits section auto-renders attribution from the audio data.

**Currently in the game.** One music track: "Dark Ambient Soundscape" by LemonMusicLab (Pixabay), tagged `era0, ambient, calm`. Plays from the moment the player begins a fresh run. Will fade out when era 1 is reached and no era1 track is yet defined.

**Where.** `src/content/audio.js` (registry + era helpers), `src/systems/audio.js` (playback, crossfade, autoplay retry, sync logic), `src/state/persistent.js` (unlockedMusic), `src/state/reducer.js` (SYNC_MUSIC_UNLOCKS action), `src/App.jsx` (era-watch effect that triggers unlock + play sync), `src/ui/SettingsModal.jsx` (volume sliders, mute, music picker), `src/ui/CreditsSection.jsx` (attribution).

**To add a music track or SFX:** use `npm run add-audio` (the dev tool). It walks through download → metadata → license → registers in audio.js. The Credits section picks it up automatically.

**For tracks specifically:** tag with `era0` / `era1` / etc. for auto-play in that era. Tagging multiple eras (e.g. `era1`, `era2`) means it remains an option across multiple eras (auto-pick prefers the highest era track that's tagged for the player's current era).

**Free music sources.** Pixabay Music (royalty-free, no attribution required), Free Music Archive (CC-BY mostly), Incompetech (CC-BY, Kevin MacLeod), Tabletop Audio (great for ambient/horror, personal use free), Uppbeat, Bensound. For SFX: Freesound.org, Sonniss GDC packs.

**Long arc.** Per-era music progression (sparse Era 1 ambient → eldritch Era 5 horror). SFX for gather, awaken, build, threat, event, choice. Optional dynamic music — track changes based on world state (low sanity layers an eldritch drone, etc.). Player music history (which tracks they've heard, on what runs).

---

### 🟢 Stone strip + Teachings trigger
**State.** Persistent strip at bottom. Once hut built, clickable — opens teachings modal. Lore-fitting (you're literally listening to the stone).

**Where.** `src/ui/StonePanel.jsx`.

**Long arc.** As the stone evolves through forms, this strip changes. Eventually the stone may be replaced by an evolved companion sprite.

---

## Development tools

Scripts that help work on the project but aren't shipped as part of the game.
Live in `tools/`. See `tools/README.md` for the full list.

### 🟢 Dev panel (in-game debug overlay)
**State.** A full-screen modal with one-click buttons to skip the grind: unlock everything, give 999 of every resource, build all buildings, learn all research, craft all tools, level all skills, max stats, skip time, trigger pests, etc. Toggled via Ctrl+Shift+D or a floating 🛠️ button bottom-left.

**Gated by `import.meta.env.DEV`.** The panel and its keyboard shortcut do not ship in production builds. Escape hatch: `settings.devUnlocked = true` re-enables it in a built game (no UI for that yet — flip in the save JSON).

**Architecture.** All dev actions are pure functions in `src/systems/dev.js` that return a `{ run, persistent, msg }` patch. The DEV_PATCH reducer action applies it. This keeps mutations predictable and replayable, and means new dev helpers slot in alongside without touching the reducer.

**Adding a new dev button.** Write a `devXxx(state, ...args)` helper in `systems/dev.js` returning `{ run, msg }`. Add a `<Btn>` in DevPanel.jsx that calls `apply(dev.devXxx(state))`.

**Where.** `src/systems/dev.js` (helpers), `src/state/actions.js` (DEV_PATCH), `src/state/reducer.js` (DEV_PATCH case), `src/ui/DevPanel.jsx` (UI + Ctrl+Shift+D hook), `src/ui/Shell.jsx` (mount + floating button).

---

### 🟢 `tools/add-audio.js` — audio import wizard
**State.** Walks through adding a music track or SFX. Asks for a source URL, fetches the page to suggest a title, attempts to find and download a direct MP3 link (works on hosts that expose URLs in HTML; falls back to manual file path otherwise). Prompts for id/title/artist/tags/volume/loop/license, auto-detects license from common source domains (Pixabay, FMA, Incompetech, Freesound, Tabletop Audio, Uppbeat, Bensound), copies the file into `public/audio/`, and appends a properly-formatted entry to `src/content/audio.js`. The Credits section auto-renders the new entry.

**Run.** `npm run add-audio` (or `node tools/add-audio.js`).

**Long arc.** As the asset pipeline grows, similar wizards may help with adding research nodes, threats, events, buildings, etc. Pattern: each tool is a self-contained Node script under `tools/` that prompts for missing data and either generates a snippet or appends directly to the relevant content file. Same content-as-data philosophy applied to the *authoring* layer.

---

## Pipeline (planned, not built)

### 🟡 Stone Altar etchings (foundation laid, content authoring pending)
**State.** `persistent.altarEtchings` is live and populates from Arcane Studies completions (`studies:first`, `path:<id>:first`, `studies:first-crossover`, `voidcall:<nodeId>`). Visual rendering on the altar surface is pending — currently only the data exists.

**Next steps.** Add a "Home" tab/page that surfaces the Stone Altar with its etchings rendered as runes/marks. Folded into Character page (#44) phasing.

**Long arc.** Pairs with ERA_PLAN.md "Era 2 → 3 transition — Home tab + Stone Altar" entry. The Altar becomes the trophy wall across many lifetimes.

---

### ⬜ Combat Phase 3 — weapon progression + combat skills (#34)
**Vision.** Each equipped weapon instance levels via kills (XP per defeated threat). Level adds to damage/crit/acc rolls per the weapon's `levelBonus`. New skills extending `content/skills.js`:
- `swordplay` — XP from melee kills
- `archery` — XP from ranged kills
- `magicCombat` — XP from spell kills

**Where it'll live.** Extend `run.equipped` instance shape to track xp + level. Combat resolution reads weapon level + skill level into rolls. Skill XP via existing `gainXp` infrastructure.

---

### ⬜ Combat Phase 4 — specialized gather actions (#35)
**Vision.** Era 2+ unlocks specialized gather buttons when the right tool is owned:
- **Chop** (Stone Axe / Bronze Axe / Iron Axe) — wood-focused, builds `woodcutting`
- **Mine** (Stone Pickaxe / etc.) — stone + iron_ore + coal, builds `mining`
- **Forage** (Digging Stick / better) — food + herbs + mushrooms, builds existing `foraging`
- Generic **Gather** stays as the catch-all fallback

New resources: `iron_ore`, `coal`, `herbs`, `mushrooms`, `arrow`. Each action has its own cooldown.

---

### ⬜ Combat Phase 5 — iron tier + smithing (#36)
**Vision.** Iron ingot recipe at Forge (1 iron_ore + 1 coal → 1 iron_ingot). Iron-tier weapons follow the DUAL-USE subfamily pattern: Iron Hatchet vs Iron Battle Axe, Iron Cooking Knife vs Iron Dagger, etc. New skill `smithing` from metal crafts. Decide: extend Forge or add Anvil/Smelter buildings.

---

### ⬜ Combat Phase 6 — weapon enchants (#37)
**Vision.** Enchant slots on weapons by level (1 at lvl 3, 2 at lvl 6, 3 at lvl 9). Enchants unlocked by Arcane Studies completions across Light/Bend/Elemental paths — Fire-bite, Drain, Truesight, Wardstrike, Earthcall, Verdant. Ring slots (from equipment.js) can also carry enchants. New Altar UI for applying enchants.

---

### ⬜ Boss-fight system (#40, #41)
**Vision.** Turn-based modal combat for bosses. Each era ships ≥1 mini-boss + ≥1 main boss. Era 3+ adds elemental bosses (one per type introduced via Arcane Studies). Modal UI: Attack / Spell / Item / Defend / Flee. Reuses combat.js math but exposes turn-by-turn. Boss death is retry-friendly (death-debuff applies, no run reset). New `content/bosses.js`.

---

### 🟡 Character page hub (#43–#47, #54)
**State.** Phases A/B/C + hub restructure (#54) shipped — Character is now a single-page hub.

- **Phase A (#43) 🟢** — view-architecture plumbing (Shell.jsx `view` state, full-page rail tabs)
- **Phase B (#44) 🟢** — read-only stat sheet (Survival | Bridge STR | Combat). Body & Mind tab retired.
- **Phase C (#45) 🟢** — `EquipmentInventoryGrid.jsx` top-tabbed item browser (All/Weapons/Defense/Magic/Tools/Crafting/Herbs/Other). EquipButtons route by `weaponStats.type` (melee → L/R, ranged → Ranged, two-handed → Both hands). Consumables get Use. Hidden resources render as "???" with no actions. Spare-aware (own 2 → equip one, equip the spare to other hand). Click-to-unequip on filled slots. Inventory rail tab retired.
- **Hub restructure (#54) 🟢** — folded Bridge column into Survival via in-column divider (STR sits below Sanity/Spirit). Skills section moved inline below stats with Survival + Combat sub-columns; Craft/Arcane/Industry roll into a full-width "Other" row. Sticky left-edge jump-nav (📊 Stats / 🎯 Skills / 🛡️ Equipment / 🎒 Items) flips to a horizontal sticky bar with `backdrop-filter: blur(4px)` below 1100px. Skills rail tab retired.
- **Phase D (#46) ⬜** — tooltip comparison engine (multi-slot handling for rings).
- **Phase E (#47) ⬜** — combat stats actually modulate combat. STR scales melee + protein-recovery bridge. DEX scales ranged + acc + eva. MAG scales spell damage. SPD reduces cooldowns.

**Where.** `src/ui/CharacterView.jsx`, `src/ui/EquipmentInventoryGrid.jsx`, `src/ui/Shell.jsx` (route), `src/ui/LeftColumn.jsx` (retired tabs), `src/index.css` (`.char-section`, `.char-grid--two`, `.char-col-divider`, `.char-skills-grid`, `.char-jump-nav`, `.ei-*`).

---

### ⬜ Crafting page UI (#48)
**Vision.** Full-body takeover sub-tabbed by craft family: Blacksmithing / Alchemy / Fletching / Farming / Woodworking / Tailoring. Items get `recipeFamily` field for routing. ToolsModal retires.

---

### ⬜ Tiered bird hunting (Era 1 expansion)
**Vision.** Net catches only **Grub Birds** (flightless mutants that eat grubs) → drops `grub_bird_meat` (nutrition 10 — low, survival food). Bow unlocks higher-tier birds (Carrion Hawks etc.) with proper nutrition. Tool tier defines hunt reach.

**Migration concern.** Existing saves with generic `bird_meat` need to migrate to `grub_bird_meat` on load.

**Trigger to build.** Pairs with Era 1 polish pass.

---

### ⬜ Shelter-tier rest (Era 1 expansion)
**Vision.** Bare-ground sleep BEFORE the hut is built should *punish* the player (drain extra hunger/thirst, minimal energy). Each shelter upgrade improves the rest action's payoff. Currently rest gives positive returns even without a hut. The "harshness of waking in the ash" should extend to sleeping in the ash.

**Trigger to build.** Pairs with Era 1 polish pass.

---

## Pipeline (planned, not built) — earlier entries

### ⬜ Companions / NPCs / Villagers
**Vision.** Some choice events lead to NPCs joining. They become **villagers** that need to be kept happy, or they rebel and the player loses progression. Each villager has loyalty/happiness/skill. Can be assigned to tasks (auto-gather, auto-build, auto-craft, auto-research). Their alignment drifts based on the player's choices and how they're treated. The player rules them — well or badly — and the villagers either thrive or revolt. Revolt = setback (resources lost, structures damaged, possibly forced run reset?). The "evil ruler" path keeps villagers in line by force; "good ruler" path keeps them through care. Both work — but the cost is different.

**Hidden alignment ties in.** A high-good player attracts compassionate villagers; high-evil attracts ruthless ones. Mixed-alignment players get more conflict.

**A fourth log tab arrives with this system.** Likely "Villagers" or "Settlement" — shows individuals, their happiness, recent actions, drift in loyalty.

**Trigger to build.** Era 2, once we have enough world state and event richness for them to feel alive. Probably the second-biggest system after combat.

---

### 🟢 Era 3 — Awakened World (three slices shipped — substantially complete)
**State.** Era 3 entry condition: Forge built + Home built + Smithing + Fletching learned + Bow crafted (toolsCrafted, lifetime-of-run). `computeEra` returns 3 when all hold. First time crossing into Era 3, a 🌌 transition story fires (sanity -5, no resolve change — the air goes wrong). Tracked via `run.eraMilestonesSeen`.

**Spirit stat.** Seventh stat field on `run.stats.spirit`, present in run-defaults (default 50) for save compatibility but UI hides it until era ≥ 3 — SurvivalBars adds a third Mind row at that point. Drains from spell casting (per-spell cost). Refills slowly from Rest (+8 per rest). Future: faster Ritual action with fragment cost.

**arcaneAwakening reveal.** First Era 3 research node (tier 6, parent: home). Cost: fragments: 10 — first time fragments are spent intentionally. Effect: `revealsFragments: true`. Resource `RESOURCES.fragments` has always had `hiddenUntil: { researched: "arcaneAwakening" }` — before learning, fragments display as "???" / ❓; after learning, they reveal as "Arcane Shards" / ✨. The reveal is instant and dramatic, exactly matching the original `hiddenUntil` plumbing.

**Spells (research-as-spell pattern).** A research node with `effect.unlocksSpell: "id"` learns a spell. Spells live in `src/content/spells.js` as plain data, read by `src/systems/spells.js`. Each spell declares cost (fragments + spirit), effect (stat deltas), cooldownMs, and castMessage. The reducer's `CAST_SPELL` action dispatches to `performCastSpell`. Per-spell cooldowns live in `run.spellCooldowns`. First three shipped: **Mending Word** (1 frag + 15 spirit → +20 HP, 60s cd), **Soothe** (1 frag + 10 spirit → +15 sanity, 60s cd), **Inner Hearth** (1 frag + 5 spirit → +20 resolve, 45s cd). UI: `SpellsPanel` trigger card in left column (only renders when ≥ 1 spell learned), opens `SpellsModal` with inline cast buttons + countdowns.

**Whisperer threat.** New entry in `src/content/threats.js` — sanity-only threat, gated to era ≥ 3 via `requires.era`. Encounter chance 0.04. Damage shape: `effects.sanityDrain: { min: 3, max: 5 }`. The threats system was extended to handle the new shape: defense is bypassed for sanity drain (the eldritch ignores armor), and for "pure sanity-drain" threats (no damage, no food theft) the per-encounter atmospheric drain is skipped so flavorMessages directly surfaces the {sanity} substitution. Verified: never fires before era 3 (500 trials), fires reliably after.

**Where.** `src/systems/era.js` (entry condition + getNextEraRequirements), `src/content/eraStories.js` (era 3 transition), `src/state/run.js` (spirit + spellCooldowns), `src/content/survival.js` (Rest refills spirit, applyEffect handles spirit), `src/content/research.js` (arcaneAwakening + 3 spell-research nodes), `src/content/spells.js` (NEW), `src/systems/spells.js` (NEW), `src/state/actions.js` + `reducer.js` + `store.js` (CAST_SPELL plumbing), `src/content/threats.js` (whisperer), `src/systems/threats.js` (era gate + sanityDrain handling), `src/ui/SurvivalBars.jsx` (Spirit bar), `src/ui/SpellsPanel.jsx` + `SpellsModal.jsx` (NEW), `src/index.css` (spirit bar styling + spell row styling).

**Second slice shipped — alchemy + alignment surfacing + Banish/Bend + Hollow Hound.**

- **Alembic building** (parent: Forge, requires `alchemy` research). Brews potions. Located in the Arcane category, tier 7.
- **Alchemy research** (Era 3, parent: arcaneAwakening). Cost fragments:8 + water + stone. Unlocks the Alembic.
- **Three stackable consumables** in `tools.js` with `consumable: true, isStackable: true, useEffect: {...}`:
  - Potion of Mending (2 frag + 5 food + 3 water → +40 HP)
  - Potion of Stillness (2 frag + 5 feathers + 3 water → +30 sanity)
  - Spirit Draught (3 frag + 10 water → +100 spirit)
- **Crafting system extended.** `canCraft` skips the "already have one" gate for `isStackable: true` items. `getToolEffects` skips consumables (they apply on use, not passively). New `USE_TOOL` action → `src/systems/consumables.js` → consumes 1 from inventory and applies `useEffect`. Tools modal shows `×N` quantity tag for stackables and surfaces a "Use" button when owned.
- **Hollow Hound** demon (era ≥ 3, `kind: "demon"`). HP + sanity mixed damage. New `effects.defenseHalf: true` — Hollow Hound only respects half of physical defense. Sanity damage is never blocked.
- **Threats system extended.** Aware of `requires.era`, `defenseHalf`, and the `warded` status. Pure sanity-drain threats AND mixed-damage demons use flavor messages that substitute both `{damage}` and `{sanity}`; per-encounter compounding is skipped so the number in the log matches the truth.
- **Alignment surfacing.** `requires.alignment: { good: N }` / `{ evil: N }` is now an aggregator gate in events.js, research.js (canListen + getVisibleResearch), and spells.js (canCastSpell). Hidden alignment never shows as a number — the gated content simply appears when the silent counter tips. Banish research (good ≥ 3) and Bend research (evil ≥ 3) surface this way.
- **Two alignment-gated choice events.** Benevolent Pilgrim (good ≥ 3) — share food or send them on. Bitter Scholar (evil ≥ 3) — read his book (gain fragments + spirit, lose sanity, drift further dark) or refuse (small good nudge).
- **Banish spell** (researched: banishSpell, good ≥ 3). Cost 2 frag + 25 spirit. Applies `appliesStatus: { warded, 5min }` — `isThreatActive` checks `state.run.statuses.warded` and rejects demonic threats during the window. Verified: demons cannot fire while warded.
- **Bend spell** (researched: bendSpell, evil ≥ 3). Cost 1 frag + 0 spirit. Effect drains 15 Resolve, gives 30 Spirit. `alignmentDelta: { evil: 1 }` cements the drift. `statuses` field added to `RUN_DEFAULTS`.

**Third slice shipped — arcane tools + Ritual + Iconoclast.**

- **Arcane tool tier** (3 new tools in the Arcane category):
  - **Fragment Knife** (req: arcaneAwakening + Forge). +2 hunt yield + 2 food on food gathers + `sanityPerFoodGather: -1` (the blade hums against the mind). 80 durability.
  - **Spirit Censer** (req: arcaneAwakening + Alembic). `spiritPerMinute: 1` — passive Spirit trickle, accumulated in `passiveAccum._stat_spirit` and applied to `stats.spirit` when whole units cross. No durability.
  - **Warding Talisman** (req: banishSpell + Alembic). `demonDamageMult: 0.5` AND `demonSanityMult: 0.5` — halves BOTH HP damage and sanity drain from `kind: "demon"` threats. No durability. Stacks multiplicatively with future wards.
- **Tool effects extended.** `getToolEffects` now aggregates `spiritPerMinute`, `sanityPerFoodGather`, `demonDamageMult`, `demonSanityMult`. Consumables still skip.
- **Passive system extended.** `applyPassiveProduction` reads tool spirit and accumulates it under a `_stat_spirit` key. Cleanly runs on TICK alongside resource production. Verified: 5 minutes of catch-up yields +5 Spirit.
- **Gathering extended.** Food gathers check `toolEff.sanityPerFoodGather` and drain sanity + log a "🗡️ The blade hums" event.
- **Threats extended.** `dmgMult`/`sanMult` from owned tools multiply demonic damage AFTER defense. Verified: Hollow Hound with Talisman drops from 3-6 HP to 1-3 HP, sanity 2-4 to 1-2.
- **Ritual action** (`SURVIVAL.actions.ritual`, gated by `requires.researched: "arcaneAwakening"`). Cost 1 fragment + 2 water → +30 Spirit + 3 sanity. Wired through RITUAL action and `actions.ritual` dispatcher. UI: 🕯️ Ritual button renders in survival action row once arcaneAwakening is learned. `canPerformSurvivalAction` now honors `requires.researched`.
- **Iconoclast demon** (era ≥ 3, `kind: "demon"`, 1% encounter). New `effects.happinessDrain: { min, max }` — Resolve drain alongside sanity drain, no HP damage. Threats system aggregates resolveDrained, routes a flavor message that substitutes both `{sanity}` and `{happiness}`. Wards reduce it the same way they reduce sanity drain. Verified 4-7 sanity / 5-8 resolve per encounter.

**Still deferred.** Iconoclast's chance to actually destroy a building (needs save migration + UI notification — separate iteration). Ritual cooldown (currently spammable if you can afford the cost — possibly intentional, possibly tune later).

---

### 🟢 Era 2 — Settler (expanded — settlement chain shipped)
**State.** Era 2 entry condition is met when: hut + fire pit built AND foraging + fire + knapping researched. `computeEra(state)` returns 2 from this state. The first time the player crosses into Era 2, a story-event modal fires (🌅 narrative log + sanity/resolve boost), tracked via `run.eraMilestonesSeen` so it only fires once per run.

**Shipped Era-2 content.** Smithing research (parent: knapping + fire, requires era≥2). Forge building (requires Smithing). Fletching research (parent: netWeaving + tracking, requires era≥2). Era-2 tools (Forge-required): Stone Axe (-150ms gather + 2 wood/wood-gather, 50 durability), Stone Pickaxe (-100ms gather + 2 stone/stone-gather, 50 durability), Bone Knife (+1 hunt yield + 1 food/food-gather, 60 durability), Bow (+2 hunt yield, -2500ms hunt cooldown, way more birds, 60 durability).

**Settlement chain (NEW).** Home research (parent: Smithing, requires era≥2) gates the Home building — a proper dwelling that grants +1 gather yield, a restBonus that flows into the Rest action, and a resolve/sanity boost on build. Once Home is up, three additional buildings unlock and become visible:
- **Stone Walls** (parent: home) — +3 defense, -2 food stolen per raid. Cost stone:100, wood:30.
- **Rudimentary Silo** (parent: home + garden) — +30 grubs and +20 bird meat caps; food spoils ~30% slower via `effect.spoilageMultiplier`. Cost stone:50, wood:40.
- **Rudimentary Farmhouse** (parent: home + garden) — +50% Garden food output via the passive-production modulator + +0.5 wood/minute scrub-clearing trickle. Cost stone:30, wood:60, food:5.

**Tool effect plumbing extended.** `getToolEffects` now aggregates resource-specific bonuses: `woodBonus`, `stoneBonus`, `foodBonus`, `waterBonus`. Gathering applies the right bonus based on what dropped. Crafting now supports `requires.builtBuilding: "forge"` for tier-2 tools.

**Building effect aggregators extended.** Threats now read `effect.defense` and `effect.foodStealReduction` from buildings (Walls). Storage now reads `effect.spoilageMultiplier` from buildings (Silo). Passive production reads a Farmhouse + Garden combination to multiply garden food by 1.5. The Rest survival action picks up `effect.restBonus` from any building (Home).

**NPC-hint events (NEW).** Four narrative events introduce each settlement-chain building through a wandering NPC. Each is gated by `notHasBuilding` so it disappears once the suggestion lands:
- **wandererHintHome** — fires when hut is built but home is not.
- **soldierHintWalls** — fires when home is built but walls are not.
- **childHintSilo** — fires when home is built but silo is not.
- **farmerHintFarmhouse** — fires when garden is built but farmhouse is not (drops +3 grubs as a quiet gift).

Same NPCs are intended to return in later eras as proto-companion encounters once the building they hinted at is up.

**Prestige UI auto-reveals at era ≥ 2** — reaching Era 2 makes the "Channel the Rock" button appear.

**Building count after this iteration.** 11 buildings total: hut, firepit, well, garden, cairn, forge, home, walls, silo, farmhouse (plus future arcane structures).

**Vision (next, not built yet).** First organized threats (bandits) that the Walls actually defend against. More research nodes (Trapping refinements, ranged combat upgrades). Companions/villagers system — likely returning NPCs from the hint events.

---

### 🟡 Tools system (primitive tier shipped)
**Status.** Primitive tier is live as part of Era 1 (Net, Snare, Digging Stick, Water Skin) — see the **Crafting** entry above. Era 2 forge-required tools are still planned.

**Era 1 (shipped).** Hand-made tools that don't require a Forge. Stored in inventory under `category: "tool"`. Crafting consumes resources and grants Crafting XP. Effects apply passively while owned. No durability yet.

**Era 2 (planned).** Stone Axe, Stone Pickaxe, Bone Knife. Each unlocked by Smithing research, each crafted at the Forge. Likely first tier with durability (degrades with use, repair at Forge).

**Long arc.** Tool tiers across eras (Stone → Bronze → Iron → Steel → Magitek → Eldritch). Higher tiers boost more. Magic tiers do strange things (a Fragment Knife also drops sanity when used? — fits the lore).

**Trigger to expand.** Era 2 brings the Forge.

---

### 🟢 Idle / passive generation (infrastructure live)
**State.** Buildings can declare `passiveProduce: { resourceId: { perMinute: N } }`. On every TICK (every 15 seconds), `applyPassiveProduction(state)` walks owned buildings, sums per-minute rates, applies pest modulators, multiplies by the elapsed real time since `lastPassiveTickAt` (capped at 30 minutes for offline catch-up), and spills whole units into inventory. Fractional carry-over lives in `run.passiveAccum` so a 0.7-unit/tick rate doesn't lose its tail.

**Era 1 producers (shipped).** Well — water +2/min. Garden — grubs (food) +3/min, halved while a bird flock is active.

**Pest modulation.** `passive.js` exposes `getProductionModulators(run)` — declarative read on `run.activePests`. Currently: bird-flock active → all food production × 0.5. Adding new pests = new entry in the modulator map.

**Catch-up.** When the player closes the tab and returns, `lastPassiveTickAt` is hours behind. The system credits up to 30 minutes of passive output on first re-tick, so overnight returns feel meaningful but not exploitable.

**Where.** `src/systems/passive.js`, `src/state/run.js` (`lastPassiveTickAt`, `passiveAccum`, `activePests`), `src/state/reducer.js` (TICK handler), `src/content/buildings.js` (`passiveProduce` field).

**Long arc.** Era 2 adds Forge passive production (slag, ingots). Era 3+ arcane buildings produce mystic resources at low rates. Era 4+ industrial automation drastically raises rates and adds compound chains (Garden → Granary → Bakery). Same `passiveProduce` data shape carries forward.

---

### ⬜ Era 4 — Arcane Industry
**Vision.** Magitek. Larger settlements with multiple companions. Automated gathering. NPC factions emerge.

---

### ⬜ Era 5 — Eldritch Reckoning
**Vision.** Cosmic horror peak. Sanity becomes a primary management concern. Tame elder beasts. Alignment crystallizes — paths fork.

---

### ⬜ Era 6 — Ascendant
**Vision.** Post-mortal. Small empire mechanics. Two divergent paths (Saint-Ruler / Tyrant-King) based on alignment.

---

### ⬜ Era 7 — Cosmic
**Vision.** Sci-fi space tier. Endgame. Beyond-planet content.

---

### 🔮 Nested scale ladders (long-term prestige)
**Vision.** Multiple prestige layers that wipe progressively more (planet → galaxy → universe → multiverse). Each layer is "the same loop at a higher scale of being." Same gather → research → bond → reset, but the *units* upgrade. Antimatter Dimensions / NGU Idle / Cell to Singularity model.

**Trigger to build.** Years out. Layer 1 (Echoes, planet-scale) is shippable first.

---

### 🟡 Moddability strategy
**State.** *Designed for* moddability from day one, even though the loader doesn't exist yet. All content files in `src/content/` are pure data (no functions inside content objects, no logic embedded in records). Migrating to JSON is a one-day refactor whenever it's needed.

**What that means today.** Don't introduce predicate functions or runtime-evaluated code into content data files. Keep predicates as named flags (`requires.rockAwakened: true`, not `requires: (state) => state.run.rockAwakened`). The eat action's `consumesCategory` pattern is the right shape — declarative data, the system code interprets it.

**Long arc.** When ready, build a JSON loader that:
1. Reads JSON content files at runtime
2. Validates against a schema (we'll write schema docs alongside content)
3. Allows external mod packs to override or extend base content
4. Provides a clear "plugin contract" doc for modders

**Trigger to build.** When player demand exists, OR when the user wants to start authoring their own content packs as a creative outlet. The underlying *content shape* is already mod-ready — only the *loader* is missing.

**Schema docs to write before launch.** A page per content type (resources, buildings, research, threats, events) documenting the fields, types, and example records. This becomes the modder's reference.

---

## Living updates

When a system changes meaningfully:
1. Update the relevant entry above (status, state, next steps).
2. If it's a new system, add a new entry.
3. If it's deprecated, mark it ⬜ → 🔮 → eventually delete.
4. Commit `docs/systems.md` along with the code change so the doc and the code stay in sync.

**Doc hierarchy.**
- `docs/HANDOFF.md` — current state + next-moves briefing (read first when resuming)
- `docs/AI_CONTEXT.md` — dense AI-first onboarding spine (rules + file map + state shape)
- `docs/systems.md` (this file) — *current state of play* per system
- `docs/ERA_PLAN.md` — planned content for next eras (design rationale)
- `docs/BUGS.md` — open + fixed bug log
- `docs/architecture.md` — *static structure* doc (audit + v2 addendum)
- `docs/roadmap.md` — *long-arc vision* doc (8-era ladder, design decisions)

Reading order for humans: HANDOFF → roadmap → architecture → systems → BUGS / ERA_PLAN.
Reading order for AI: AI_CONTEXT → HANDOFF → systems (only the system you're touching).
