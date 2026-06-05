# Handoff — Lithos

AI-optimized continuity doc. Bullets not prose. Drop content when shipped; never grow into paragraphs.

---

## Project
**Lithos** — React 19 + Vite long-arc incremental game with cosmic horror flavor. Browser-only (eventually Steam). 8 eras planned: Scavenger → Awakening → Settler → Awakened World → Arcane Industry → Eldritch Reckoning → Ascendant → Cosmic. Hidden alignment, prestige, ascension. **Currently Era 3 feature-complete.**

## Doc map
Read in order:

1. `docs/AI_CONTEXT.md` — file map · state shape · rules · where-to-add-what tables (start here, ~5 min)
2. `docs/HANDOFF.md` — this file: current state + next moves
3. `docs/systems.md` — per-system status (🟢/🟡/⬜/🔮). Open only when working on that system.
4. `docs/ERA_PLAN.md` — design rationale for cross-era arcs
5. `docs/BUGS.md` — known paper-cuts
6. `docs/roadmap.md`, `docs/architecture.md` — design history. Skip unless you need rationale.

## Architectural rules
- **Content-as-data.** `src/content/*.js` plain objects. No functions inside content.
- **Thin reducer + pure systems.** `src/state/reducer.js` dispatches → `src/systems/*` runs logic.
- **Persistent vs run split.** `state.persistent` survives prestige; `state.run` wipes. Revealed resources auto-persist via `persistent.permanentlyKnown` — any resource with a `hiddenUntil` rule, once revealed before a prestige, stays revealed forever.
- **Pure scene composition.** `systems/scene.js` decides what shows; UI just renders.
- **Hidden alignment + World Score never shown as a number.** Surface through consequences.
- **Anti-spam from day one.** Cooldowns; no key-repeat auto-fire.
- **Accessibility-first.** Reduced motion, dyslexia fonts, no flashing without opt-in.

## State (current commit)

### Playable end-to-end
- **Era 0** (once per save; skipped after first ascension) — gather → find rock → 10 fragments → awakening
- **Era 1** — hut → research tree (16+ nodes) → Fire Pit · Water Hole · Garden · Cairn → primitive tools + pure weapons (Wooden Club / Stone Spear / Stone Mace) → water tier system (Stagnant 🩸 / Muddy 💧 / Boiled 🫖 + dysentery + Drink dropdown + Boil action) → multi-round combat (Wild Dog) → hunting → six survival stats (HP/hunger/thirst/energy/Resolve/Sanity/Spirit)
- **Era 2** — Smithing + Forge + Era-2 dual-use tools (Stone Axe / Pickaxe / Bone Knife / Bow w/ `weaponStats`) → Fletching → Home + Stone Walls + Silo + Farmhouse settlement chain → Raider combat-class threat → Altar Work → Stone Altar → Scroll 📜 / Ink 🖋️ via `producesResource` craft pattern → prestige UI reveals
- **Era 3** — Arcane Awakening reveals fragments as Arcane Shards → 7 magic paths × 21 study nodes (timed, pause-on-action 5s idle, lossless switching, cross-path Wardweave/Ghostcall/Truesight, apex-gated Voidcall on `alignment.evil ≥ 5`) → 10 study-gated spells via `requires.studied` → Whisperer / Hollow Hound / Iconoclast / Corrupted Walker / Soulless Stalker (sanity-damage, ignores armor) → Fragment Knife / Spirit Censer / Warding Talisman arcane tier → Ritual action (fragments → Spirit) → altar etchings persist via `persistent.altarEtchings`

### Cross-cutting systems (shipped)
Per-system status in `docs/systems.md`. Grouped highlights:

- **Foundation** — persistent/run split · thin reducer + pure systems · content-as-data · scene composition · versioned save migration · settings/audio/keyboard shortcuts (G/R/E/D/H, customizable) · splash screen · save export/import
- **Combat** — equipped slots (8 main + 13 accessory) · pure + dual-use weapons (`weaponStats` alongside tool `effect`) · multi-round fight loop with 3–8 narrative lines per encounter · armor/defense split · `damageType` routing (hp/sanity/spirit) · death-debuff cascade · per-fight `applyToolWear(run, "combat")` · combat skills (`swordplay` / `archery` / `magicCombat`) — subfamily-routed XP, scales damage/acc/crit · boss-fight turn-based modal (#40) — Attack/Spell/Item/Defend/Flee; commits via `BOSS_FIGHT_END`; first-defeat stamps `persistent.bossesDefeated` + altar etching · **Patrol loop (#66) — third action button alongside Gather/Hunt. Click → roll mob from era-pool weighted by `encounterChance` → resolveFight passive → drops via `mob.drops[]` (chance-rolled qty); combat XP via `mob.xp`; lifetime kill count tallied to `run.mobsDefeated`. 44 mobs across Era 1/2/3 in `content/mobs.js`. Gated on equipped weapon + Era 1+. Cooldown 12s, drops to 4s with combat skills. Knowledge-gated bosses (`getBossesAvailable`) enter the patrol pool at low weight when their study/research/building/kill-count requirements are met; rolling a boss stamps `run.patrolBossEncounter` which Shell auto-opens via BossFightModal. Locked bosses occasionally emit a hint line ("you hear something larger moving past") to surface the gate. 25+ new resources for drops including currency tiers (`tarnished_coin` / `coin` / `obol`) for future trade routes.**
- **Meta** — Echo Shop (14 upgrades, 5 categories: Cache/Body/Mind/Skills/Arcane) · ascension QoL (prestige starts Era 1; `persistent.permanentlyKnown` auto-persists revealed resources; RESET_RUN still starts Era 0) · 50 random events across Era 1/2/3 with hidden alignment · World Score hidden meter (6 thresholds + apex reveal at 100) · dysentery + disease module · prestige system with reward breakdown
- **UI Layout** — left rail (icons only, no lc-content panel) · center column (view-routed) · right column (off-canvas) · footer ActionStrip · Stone strip · dev panel (6 tabs)
- **Left rail (rail-as-nav)** — top group: 3 view-switcher icons (🌍 World / 👤 Character / 🛠️ Crafting) above a divider. Bottom group: content tabs (✨ Arcane / 🏛️ Buildings / 🕯️ Studies). Skills + Inventory retired (#45 + #54) → Character page. Body & Mind + 🔨 Tools retired earlier. **Challenges retired (#66)** — bosses now spawn from Patrol when knowledge-gated. Each icon `title` carries the lead-text blurb as a tooltip.
- **Center routing** — `view` state in Shell drives `ActionPanel` / `CharacterView` / `CraftingView` / `ArcaneView` / `StudiesView`. SkillsView + InventoryView routes removed (their components now orphan files). Buildings + Challenges rail icons still pop their existing modals (inlining deferred).
- **Right column (Recent / Unlocks / Stats)** — 3-mode off-canvas (`grid | closed | overlay`). ‹ close inside; ‹ edge tab when closed. Persists via `lithos.rightPanelMode`. Overlay degrades to closed on reload.
- **Character page hub (#44 → #45 → #54)** — single-page hub with 4 anchored sections + sticky jump-nav (📊 Stats / 🎯 Skills / 🛡️ Equipment / 🎒 Items). Sticky strip sits left-edge on wide viewports (≥1101px); flips to a horizontal sticky bar with `backdrop-filter: blur(4px)` below 1100px.
  - **Stats** — two columns (Survival incl. Bridge STR via in-column divider | Combat). STR proxied by death-debuff inverse `10 − floor(mag×10)` until #47. DEX/SPD/MAG placeholder dashes until #47. Armor reads `getPersonalArmor(state)`.
  - **Skills** — Survival-skills + Combat-skills columns mirror the stat grid above; Craft/Arcane/Industry fall into a full-width "Other" row when active. Reuses `.skill-row` CSS.
  - **Equipment** — 8 main slots + collapsible accessory tray (back/overArmor/talisman/10 rings). Filled slots are clickable buttons (`actions.unequip(slot)` / `actions.unequipRing(i)`); two-handed off-hand pointer unequips both hands.
  - **Items** — `EquipmentInventoryGrid` (#45): top tabs All/Weapons/Defense/Magic/Tools/Crafting/Herbs/Other; cards show icon/qty/cap/weapon stats inline/description/durability bar. EquipButtons routes by `weaponStats.type`: melee → L/R, ranged → Ranged, two-handed → Both hands. Consumables get Use; hidden resources render as "???" with no actions. Spare-aware (own 2 → equip one to one hand, the spare to the other).
- **Modals** — Spells / Tools / BossFight / Echo Shop / Prestige / Reset / Settings / Event / BuildingsTree / StudyTree / TeachingsTree. SpellsModal exports `SpellsBody` for inline reuse (ArcaneView).
- **Tooltips** — native `title` attribute on stat rows, study rows, and all rail icons.
- **Active-study indicator** — 1s live-extrapolated progress bar in Stone strip; bar moves smoothly between 15s TICK commits.
- **Crafting view** — still a stub; #48 fills it with sub-tabbed disciplines.

### Locked design decisions
- **Spirit = magic-energy stat** (was reserved as Mana; locked active in Era 3+)
- **STR = bridge stat** between survival and combat (lands at #34; death-debuff magnitude is the proxy until then)
- **Armor vs Defense** — armor reduces personal combat hp damage; defense is settlement-only (raids, food theft). Walls don't help when a dog jumps you in the wilderness.
- **Boss fights = turn-based modal** (shipped #40). Routine combat = passive log (shipped). Mid-fight spells/items dispatch real `CAST_SPELL`/`USE_TOOL` so spirit/fragment/cooldown bookkeeping stays single-source-of-truth; modal commits damage taken + outcome in one `BOSS_FIGHT_END` dispatch at fight end.
- **Voidcall apex-gated** by `alignment.evil ≥ 5`. Each Voidcall costs `worldScore −1`.
- **Ascension starts Era 1** (rock awakened + hut raised). RESET_RUN (death/give-up) still starts Era 0. The cosmic-horror opening hurts when you've earned it.
- **Resources stay known across runs.** Anything revealed before ascending stays revealed forever via `persistent.permanentlyKnown` (generic; works for any future hidden resource).
- **Skills are run-only.** Echo Shop's "Memory" upgrades seed start-of-run levels; XP never carries.
- **Seven magic paths, not three** (locked via AskUserQuestion). Cross-path nodes encourage build identity.
- **Combat-class vs one-shot threats coexist** — `threat.combat` field flips to fight-loop; threats without it stay narrative-rich one-shots. `routeThreat()` in `systems/threats.js` dispatches.
- **Arcane Studies layered on Stone's Teachings**, not replacing. Teachings = instant-listen for fundamentals. Altar = deep magic with timers.
- **Multiple in-progress studies allowed**, lossless pause-on-action, free switching. Materials are the cost; time is yours to hold.
- **Rail-as-nav** — left rail is icon-only. No lc-content panel. Each icon swaps the center view (preferred) or pops the corresponding modal (Buildings tree + Challenges boss, deferred inlining). Blurbs live as `title` tooltips. Header stays minimal: title + era + Echoes only.
- **Off-canvas right only** — right column can close/overlay; left rail is always visible. Choice persists via `lithos.rightPanelMode` (no Bootstrap dependency).

## Next moves (suggested order: #44 → #35 onward)

**Combat arc (7/7 done — full combat phase complete):**
- **#35** — specialized gather actions (Chop / Mine / Forage) + resources (iron_ore, coal, herbs, mushrooms, arrows) + skills (mining, woodcutting, fletching).
- **#36** — iron tier + smithing skill (dual-use Iron Hatchet vs Iron Battle Axe; Iron ingot recipe at Forge).
- **#37** — weapon enchants tied to Arcane Studies. Enchant slots per weapon level (1/2/3). Unlocks via Light/Bend/Elemental completions. Altar UI.

**Character / Crafting page arc (#46–#49; #43 + #44 + #45 + #54 shipped):**
- **#46** tooltip-compare on hover (multi-slot ring handling).
- **#47** combat stats actually modulate combat (STR melee+protein; DEX ranged+acc+eva; MAG spell dmg; SPD cooldowns; Spirit regen).
- **#48** Crafting page — full takeover sub-tabbed (Blacksmithing/Alchemy/Fletching/Farming/Woodworking/Tailoring). ToolsModal retires.
- **#49** polish — tab transitions, hover states, equip flourishes, damaged-stat red overlay on stat bars.

**Polish / paper-cuts:**
- BUGS.md #008 — per-era body class for ambient color
- Bird tiering / grub birds (Era 1 hunting depth)
- Shelter-tier rest scaling (half-shipped — needs the no-shelter penalty half)
- SFX expansion (gather/build/awaken/combat/death-cascade)

**Deferred until combat + character pages ship:**
- **#38** City management (Era 4+) — villagers, role assignment, village-level threats

## Dev panel
Ctrl+Shift+D or floating 🛠️ (bottom-left). Gated by `import.meta.env.DEV` or `settings.devUnlocked`. All actions go through DEV_PATCH; force-fired threats pump flavor via `patch.events`.

Header status line: era · built · researched · alignment · echoes · WS · studies completed/in-progress · next-era requirements.

Six tabs:
- **🚀 Quick** — Era jumps (1/2/3) · full unlocks per era · rock + fragments · bulk resources
- **🌍 Content** — Per-item toggles for buildings/research/tools. ✓/×N status. Scroll/Ink recipes route to their resource ids.
- **🧠 State** — Per-stat sliders (0/50/max) for all seven stats · skill levels · alignment setters · spell-cooldown clear · status toggles (warded, dysentery 5min) · death-debuff controls (apply cascade, set magnitude, clear; live readout)
- **⚔️ Encounters** — Force-fire each threat by id (bypasses chance + warded gates) · equipment slots readout · pure weapons section (give + equip into either hand) · quick-equip dual-use tools (Axe/Knife/Pickaxe/Bow/FragKnife → right slot) · pest controls · event cooldown wipe · clear active event
- **🕯️ Arcane** — Stone Altar one-tap build (with prereqs) · scroll/ink grants · water-tier shortcuts · complete active study · complete all studies · study reset · World Score quick-set (0/5/15/30/50/80/100) + nudge ±5 · altar etchings inspector + wipe
- **⏱️ System** — Time skip · inventory dump · wipe run · nuke save

Test recipes:
- **Combat end-to-end**: Encounters → give every weapon → equip into handRight → Force Wild Dog → watch fight log
- **Combat-skill progression**: State → set swordplay to lvl 10 → equip melee weapon → Force Wild Dog → fight resolves with boosted acc/crit/damage. Lvl 20 swordplay = +10 flat damage per hit before crit double, +0.20 acc, +0.30 crit.
- **Boss fight (full flow)**: Quick → 🚀 Unlock all Era 1 → Encounters → give every weapon → equip into handRight → left rail **⚔️ Challenges** tab → "Open Challenges" → pick boss → Attack/Spell/Item/Defend/Flee → on victory, check inventory for `defeatReward`, log for `firstDefeatLog`, Arcane → altar etchings inspector for new stamp.
- **Rail-as-nav**: click left-rail icon → center view swaps (top group: 🌍/👤/🛠️; bottom group: Arcane/Studies) OR opens the Buildings tree modal. Hover any icon for the explainer tooltip.
- **Patrol (#66)**: equip a weapon → ActionStrip 🗡️ Patrol → click → era-mob fight resolves in log → spoils land in inventory + `run.mobsDefeated[mobId]` increments. Knowledge-gated bosses can spawn rarely from the same roll → `run.patrolBossEncounter` is set and Shell auto-opens BossFightModal. Locked bosses sometimes log a hint about something larger nearby.
- **Character hub (#44 + #45 + #54)**: 👤 → jump-nav strip (📊/🎯/🛡️/🎒) on left edge. Stats: Survival (incl. STR at bottom) + Combat columns. Dev → State → Apply Death Debuff → STR drops in Survival. Skills section below stats — fight a foe → combat skill XP shows up in Combat-skills column. Encounters → give weapon → click → swap to Character page → Items tab (or scroll) → card shows weapon stats inline → "→ L" / "→ R" equips → slot fills above → click filled slot → returns to pack.
- **Right off-canvas**: click › inside right column → collapses to ‹ edge tab. Click tab → slides back as overlay over center (center stays wide). Persists via `lithos.rightPanelMode`.
- **Boss defeat cascade**: lose a boss → death-debuff applies + wake with reduced HP — no run reset (verify in State tab).
- **Death cascade**: State → Apply Death Debuff → eat repeatedly to tick magnitude to 0
- **Arcane Studies**: Arcane → Build Stone Altar → +5 Scrolls/Inks → Studies tab → start study → Arcane → Complete active study → check Spells modal
- **World Score thresholds**: Arcane → WS → 30 → gather → watch water-promotion log. WS → 100 fires apex reveal once.
- **Dysentery**: State → Apply Dysentery → watch doubled hunger/thirst drain + per-tick HP/sanity bleed
- **Ascension QoL**: Quick → 🚀 Unlock all Era 3 → State → max stats → Channel the Rock → new run starts hut-raised, fragments still readable as "Arcane Shards"
- **Echo Shop**: Channel the Rock → click header Echoes badge OR Echo Shop button on prestige modal → buy upgrades → new run seeds with their effects (verify via Inventory + stat bars)
- **Sanity-damage threat**: equip any weapon → Encounters → Force Soulless Stalker → sanity drains per round, armor doesn't help

## Onboarding prompt for a fresh agent

Paste this when starting a new conversation:

> Working on **Lithos** — React 19 + Vite incremental game, cosmic horror, browser-only.
>
> **State:** Era 3 feature-complete. Era 0→3 gameplay loop runs end-to-end with real RPG combat, Arcane Studies, World Score, ascension QoL, Echo Shop.
>
> **Active arcs** (cross-era, not era content):
> - Combat Phase 3+ (tasks #35–#37, #34 + #40 + #41 shipped): specialized gather actions, iron tier, weapon enchants
> - Character / Crafting page (#46–#49, #43 + #44 + #45 + #54 shipped): Character is now a single-page hub (stats / skills / equipment / items with sticky jump-nav). Remaining: tooltip-compare (#46), stat modulation (#47), fill in CraftingView stub (#48), polish (#49).
>
> **Read first:** `docs/AI_CONTEXT.md` (file map + state shape + rules), then `docs/HANDOFF.md`. Open `docs/systems.md` only when working on a specific system.
>
> **Code conventions:** content-as-data in `src/content/*.js` (no functions). Thin reducer in `src/state/reducer.js` → pure systems in `src/systems/*`. Persistent vs run state split (`persistent.permanentlyKnown` auto-handles revealed resources). Hidden alignment never shown as a number. Accessibility-first.
>
> Ask what to work on rather than assuming.

## Update protocol

When ending a session with meaningful changes, update this doc:

1. **Move shipped items** from "Next moves" → "State (current commit)" in the right group (Foundation / Combat / Meta / UI) or under the relevant era in "Playable end-to-end".
2. **Add new tasks** to "Next moves" with **one line each** — task number, system area, what it adds. No prose paragraphs.
3. **Update locked decisions** if a new design call was made.
4. **Add a dev-panel test recipe** if a new system shipped — one line, format: "Name: tab → action → action → expected result".
5. **Adjust the onboarding prompt** if the active arcs changed (the bullet list, not the prose around it).
6. **Keep prose-free.** Bullets, not paragraphs. If you find yourself writing a paragraph, split it into bullets or move it to systems.md / ERA_PLAN.md.
7. **Target ≤200 lines.** This doc's job is 30-second reorientation, not exhaustive listing.
