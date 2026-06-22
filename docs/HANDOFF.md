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

### Recent progress (#109–#137)

- **#109 Crafting page rebuild** — sub-tabbed CraftingView with 8 disciplines (Survival / Blacksmithing / Alchemy / Fletching / Woodworking / Tailoring / Farming / Runesmithing). Patrol-card visual language. Per-card cost row + Craft button always visible (no "Effects active" hide).
- **#110–#111 Durability rebalance** — Era 0/1 net 12→6, snare 20→10, etc. Cards show `cur/max hunts` cleanly.
- **#112–#113 Per-discipline skills + skill-based success** — blacksmithing/alchemy/fletching/woodworking/tailoring/survivalcraft/runesmithing/smithing. Each level adds 4% success above the tier base (T1 25% / T2 20% / T3 12% / T4 8%); ceiling per tier (95/90/80/70).
- **#114–#117 Era 2 + Era 3 weapon rosters** — 14 Era 2/iron-tier natural weapons + 24 Era 3 arcane weapons (Fragment Blade, Sigil Staff, Echo Bow, Voidcaller Wand, Stonespeak Hammer, Censer Dagger, …).
- **#119–#120 Mythical mob roster + drops → recipes** — replaced 5 mundane mobs with mythical (shardChimera, whisperingCairn, thirstWraith, ironwombBrood, mirrorGhast) plus 3 new Era 3 mobs (harvestingAngel, echoFiend, duneLeviathan). Era 3 weapon recipes now require mythical mob drops (shattered_glyph, spirit_essence, void_bone, cherub_feather, etc.). Hunt-craft loop closed.
- **#122–#127 Crafting QoL** — skill-based cost discount (1%/lvl, cap 30%), allow crafting non-stackables repeatedly, fletching arrow recipes (wood/iron/shard tiers), Survival tab + reclassification, ×1/×5/×10/Max quantity selector, lower 25% base success, `+` button to auto-craft missing materials.
- **#130 Timed crafting** — every craft is now a progress-bar with per-tier base durations (T1 5s / T2 15s / T3 60s / T4 180s) modulated by discipline-skill level. `activeCraft` lives on `run`; `tickActiveCraft` resolves on TICK_LOOP. Multi-craft queue auto-restarts the next one when materials remain. The idle-RPG loop the user asked for: queue a Voidstaff, walk away, come back to find it done.
- **#36 / #131 Iron tier + Smithing skill** — `iron` resource (hidden until smithing research), `smeltIron` recipe (`bog_iron×2 + wood×1 → iron×1`), iron-tier crafts grant Smithing XP. Existing iron-tier weapons (#117) now have a real resource chain.
- **#115 / #132 Runesmithing + imbue actions** — `weaponImbues: { [weaponId]: { [runeId]: { appliedAt } } }` field on run. Per-weapon-type imbues. `IMBUE_WEAPON` / `REMOVE_IMBUE` reducer actions. `canImbueWeapon` / `getWeaponImbues` / `performImbueWeapon` / `performRemoveImbue` in `systems/runesmithing.js`. Imbuing grants 8 Runesmithing XP.
- **#133 Combat math wired** — `getEffectiveImbueEffects(state)` aggregates `damageBonus / hpReturnOnHit / spiritReturnOnHit / echoChance / sanityCostOnHit / durabilitySaveChance / hpRegenPerMinute` plus #136's new `accBonus / critChanceBonus / spiritRegenPerMinute / damageReduction / evasionBonus`. Applied in both `resolveFight` (auto-patrol) and `rollPlayerAttack` (boss modal). BossFightModal applies on-hit returns + echo strike to the damage tracker live.
- **#134 Elemental rune passive regen** — `applyImbuePassives(run, tickSeconds)` honest fractional accumulator on `imbueRegenAccum` / `imbueSpiritAccum`. Hooked into `ACTIONS.TICK` (15s). Caps stats at 100 and zeros the accumulator at cap.
- **#135 Runesmithing UI on Magic page** — new 🪬 Runesmithing tab in MagicView (visible when player has runesmithing skill level OR owns any rune). One patrol-style card per owned weapon with weaponStats. Shows currently-bound imbues with × remove buttons + an Apply-rune list of every rune type with Bind buttons and disabled-with-reason tooltips.
- **#136 50 new runes across 7 rarity tiers** — `rarity: common | uncommon | rare | epic | legendary | mythic | god`. Common → small bonuses (e.g. Mending Chip +1 HP/hit). God → world-bending (Godrune of Oblivion: +50 dmg, −10 Sanity/hit, 60% echo, +20% crit, +20% acc). All sort by rarity in the UI; rarity-colored chips on each row (gray → green → blue → purple → gold → orange → rainbow GOD). Combined imbue caps: `damageReduction ≤ 0.90`, `echoChance ≤ 1.0`, `durabilitySaveChance ≤ 0.95`.
- **#137 50 rune craft recipes** — full coverage. Cost ladder scales by rarity: Common (1f/1ink) → Uncommon (2f/1ink + 1 themed) → Rare (3f/2ink/1obol + 1 themed) → Epic (5f/3ink/2obol + mythical) → Legendary (8f/5ink/3obol + 2 mythical + sometimes 1 starlit) → Mythic (15f/8ink/5obol + 3 mythical + starlit) → God (30f/15ink/10obol + multiple mythical + 2–5 starlit). God-tier Void runes additionally gate on `voidcall` research + `alignment.evil ≥ 6–12`.

### Playable end-to-end
- **Era 0** (once per save; skipped after first ascension) — gather → find rock → 10 fragments → awakening
- **Era 1** — hut → research tree (16+ nodes) → Fire Pit · Water Hole · Garden · Cairn → primitive tools + pure weapons (Wooden Club / Stone Spear / Stone Mace) → water tier system (Stagnant 🩸 / Muddy 💧 / Boiled 🫖 + dysentery + Drink dropdown + Boil action) → multi-round combat (Wild Dog) → hunting → six survival stats (HP/hunger/thirst/energy/Resolve/Sanity/Spirit)
- **Era 2** — Smithing + Forge + Era-2 dual-use tools (Stone Axe / Pickaxe / Bone Knife / Bow w/ `weaponStats`) → Fletching → Home + Stone Walls + Silo + Farmhouse settlement chain → Raider combat-class threat → Altar Work → Stone Altar → Scroll 📜 / Ink 🖋️ via `producesResource` craft pattern → prestige UI reveals
- **Era 3** — Arcane Awakening reveals fragments as Arcane Shards → 7 magic paths × 21 study nodes (timed, pause-on-action 5s idle, lossless switching, cross-path Wardweave/Ghostcall/Truesight, apex-gated Voidcall on `alignment.evil ≥ 5`) → 10 study-gated spells via `requires.studied` → Whisperer / Hollow Hound / Iconoclast / Corrupted Walker / Soulless Stalker (sanity-damage, ignores armor) → Fragment Knife / Spirit Censer / Warding Talisman arcane tier → Ritual action (fragments → Spirit) → altar etchings persist via `persistent.altarEtchings`

### Cross-cutting systems (shipped)
Per-system status in `docs/systems.md`. Grouped highlights:

- **Foundation** — persistent/run split · thin reducer + pure systems · content-as-data · scene composition · versioned save migration · settings/audio/keyboard shortcuts (G/R/E/D/H, customizable) · splash screen · save export/import
- **Combat** — equipped slots (8 main + 13 accessory) · weapons (`weaponStats`) · multi-round fight loop · armor/defense split · `damageType` routing · death-debuff cascade · per-fight `applyToolWear` · combat skills (swordplay/archery/magicCombat) · boss-fight turn-based modal (#40) · Patrol loop (#66) with 44 mobs in `content/mobs.js`, idle auto-loop runner (#68), mob-card view with reveal milestones (#70), per-target Pile-of-Goods with hover tooltips (#69), butchering skill (#70) scales drop chance + qty, knowledge-gated boss spawns in patrol pool · **Unarmored penalty (#72): `getArmoredCount(run)` reads 5 main armor slots (head/chest/leggings/boots/gloves); `getUnarmoredPenalty(state)` returns `{accPenalty, dmgMult}` applied in `rollPlayerAttack` / `rollFoeAttack` / `resolveFight`. Curve: 0 pieces = −25% acc, +50% dmg taken / 1–2 = −10/+25 / 3–4 = −5/+10 / 5 = none. PatrolView shows a red warning banner "🩸 Underdressed: −X% accuracy, +Y% damage taken" when active.** · Town workers (#71): `townWorkers` echo upgrade (5 lvls, 8 echoes base, 1.5× scaling); each level hires a townsperson, 60s cycle, 75% win rate, drops at 0.5× qty, Era 1 mobs only. `🛠 × N` badge in PatrolView pile header.
- **Meta** — Echo Shop (15 upgrades, 6 categories: Cache/Body/Mind/Skills/Arcane/**Town**) · ascension QoL · 50 random events across Era 1/2/3 · World Score hidden meter · dysentery + disease module · prestige system with reward breakdown · **Town workers (#71)** — `townWorkers` echo upgrade (5 levels, baseCost 8 echoes, 1.5× scaling). Each level hires one townsperson who passively patrols Era 1 mobs every 60s (per worker) at 75% win rate. Drops at 0.5× quantity flow into inventory. Fires from TICK_LOOP via `systems/workers.js`; cheap when count=0; catches up to 30 min offline. Worker badge (`🛠 × N`) renders in PatrolView pile header.
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
- **Gather view (#97 → #104)** — unified center page replacing the old standalone HuntingView. Top tabs: Forage / Mining / Wood / Fishing / Farming / Husbandry / Hunting. Each tab is a `patrol-card` grid of `gatherNodes.js` entries (20 nodes across 6 disciplines, each w/ id/name/icon/discipline/skill/era/tier/drops/xp/cycleMs/flavor). Click a card → auto-loop runs `performGatherNode()` (or `performHunt()` for Hunting tab) every `cycleMs`. Drops accrue into a **shared Pile of Goods** (#69 pattern). Loop banner sits above the Pile (#104) — shows the node icon + proper display name + tier chip + progress bar + Stop button, instead of the raw camelCase id.
- **Magic view (#101 → #106)** — single tabbed page. Cast + Spellbook + Conversions merged. **Tab order mirrors the Path Trees modal exactly** (Foundation / ✨Light / 🌑Bend / 🌿Elemental / ✒️Sigilcraft / 🔔Memory / 👂Stoneword / ⚫Voidcall / 🪔Conversions). Bucket map (`SPELL_PATH` in `MagicView.jsx`) derived from `STUDIES[].effect.unlocksSpell`. Empty paths hide their tab. Spells render as **patrol-card tiles** for visual parity with Patrol / Hunting / Gather: icon, path-colored tier chip, description, cost chips, full-width Cast CTA. Ritual lives in Conversions as a synthetic spell.
- **Path Trees modal styling (#105)** — `.study-tab` pill buttons now match the project's dark theme (transparent + accent border on active) instead of browser-default white.
- **Era labels (#105)** — `eraLabel()` helper in PatrolView/GatherView renders "Era One / Two / Three" instead of "era 1" on all card sublines.
- **Building skill (#102)** — new `craft`-category skill in `content/skills.js`. Reduces survival cost of building actions (`buildEffortReduction` bonus, 0.03/lvl, cap 0.5). XP granted on `BUILD` actions. Some research nodes (fire, hiddenStores) now carry a `skillReq: { building: N }` precondition checked by `canListen()`.
- **Skills under Character (#107)** — Survival/Combat columns at sm+ breakpoint; Craft/Industry/Arcane each get their own column via `--cols` (no more "Other" pile). Mobile-first cascade. Rows get horizontal padding so bars/text don't kiss the column edge (#103 carry-over). Duplicate `.skill-row` CSS block (~100 lines) removed.
- **Breathing room pass (#103)** — `.action-panel`, `.patrol-card`, `.ei-card`, `.magic-row`, and skill rows all get explicit horizontal padding so text never touches container borders.

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
- **#36** — iron tier + smithing skill (dual-use Iron Hatchet vs Iron Battle Axe; Iron ingot recipe at Forge).
- **#37** — weapon enchants tied to Arcane Studies. Enchant slots per weapon level (1/2/3). Unlocks via Light/Bend/Elemental completions. Altar UI.

**Character / Crafting page arc (#46, #48, #49; #43 + #44 + #45 + #47 + #54 shipped):**
- **#46** tooltip-compare on hover (multi-slot ring handling).
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
- **Patrol view (#66/#67/#68/#69/#70)**: Left rail 🗡️ Patrol → mob cards grouped by era. **Click a card = auto-engage loop:** fight fires every `cycleMs`, card lights up with accent border + filling progress bar at the bottom, drops accrue into the per-target **Pile of Goods** above the era grid (chips with hover-tooltip resource cards). Click a different card → swaps target + resets pile. Click Stop → halts. **Hidden info reveal (#70):** mob HP/damage/accuracy/type AND drop names/qty/% are masked as ??? until `state.run.mobsDefeated[mobId]` hits per-field thresholds (HP: 1 kill, dropNames: 1, damage: 3, dropQty: 5, accuracy: 5, damageType: 10, dropChance: 10). Card shows next-reveal hint ("Beat 2 more to reveal damage"). **Butchering skill (#70):** new survival skill, earns XP per mob kill via `gainXp(run, "butchering", ⌊hp/6⌋)`; level scales drop chance (+1%/lvl, cap +0.20) and drop quantity (+5%/lvl additive multiplier, cap 2.0x at lvl 20) — read by `getButcheringBonuses(run)` inside `systems/patrol.js rollDrops`.
- **Auto-loop core (#68)**: `state.run.activeLoop = { kind, target, startedAt, cycleMs }` (single active loop). `systems/loop.js` exposes `setActiveLoop` / `clearActiveLoop` / `tickActiveLoop` / `getActiveLoop` / `getLoopProgress` / `computeCycleMs`. Reducer wires `SET_ACTIVE_LOOP` / `CLEAR_ACTIVE_LOOP` / `TICK_LOOP`. Store runs a 250ms `TICK_LOOP` interval (cheap when no loop active — reducer short-circuits). Phase 1 wires Patrol only; Phase 2 extends to Gather + Hunt + Ritual + crafting.
- **Character hub (#44 + #45 + #54)**: 👤 → jump-nav strip (📊/🎯/🛡️/🎒) on left edge. Stats: Survival (incl. STR at bottom) + Combat columns. Dev → State → Apply Death Debuff → STR drops in Survival. Skills section below stats — fight a foe → combat skill XP shows up in Combat-skills column. Encounters → give weapon → click → swap to Character page → Items tab (or scroll) → card shows weapon stats inline → "→ L" / "→ R" equips → slot fills above → click filled slot → returns to pack.
- **Right off-canvas**: click › inside right column → collapses to ‹ edge tab. Click tab → slides back as overlay over center (center stays wide). Persists via `lithos.rightPanelM