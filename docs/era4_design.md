# Era 4 — Arcane Industry (design, revised v4)

*Status: design. Implementation pending — phasing locked at the bottom.*

## Premise

The settlement crosses out of the late-medieval shape it took in Era 3 and into something stranger. The Stone Altar's etchings have started reading themselves at night. The forges burn cold. Apprentices speak in unison. The world isn't yet *broken*, but it has started to **think differently** about you.

Era 4 is **magitek industrial**: the player automates what used to be manual, but every system has a cost in worldScore, sanity, alignment, or morale. The choices are no longer "do I survive" or "do I get rich" — they're "what am I willing to become."

## Tone notes

- Less "small village in dust" → more "small city humming with intent"
- Buildings have moving parts that shouldn't be moving
- Villagers gain a faint quality of being *too coordinated*
- Light still falls strangely
- The wasteland is now in the *distance*; the settlement is the foreground

## Entry trigger

Any one of:
1. Settlement reaches **25 villagers** AND **Temple + Stone Altar** built
2. Player completes **3+ Arcane Studies paths**
3. **World score >= 60** (positive arc) OR **alignment evil >= 10** (negative arc)

Whichever fires first. Triggers a one-time story event ("The Hum"):
- Bumps `state.run.era` to 4
- Stamps `settlement:era:4` etching (permanent)
- Logs the entry narration ("The forges are too quiet. The water in the cistern won't ripple. Something has decided to pay attention.")

## Building roster (8 buildings, 4 thematic pairs + Summoning Circle)

**Power**
- **Aether Foundry** - converts `fragments + iron -> aether iron`. Has a `tradeRoute`: surplus aether iron -> coin.
- **Conduit Array** - passive **+3 spirit / min**, drains `worldScore` by 0.5 / min while running.

**Automation**
- **Automaton Bay** - `staffSlots: 4`, each slot when filled creates an artificed laborer that **does not consume food/water/wood**.
- **Echo Mill** - bakery analog: `1 fragment + 1 food -> 1 ration`. Drains **0.1 morale / min**.

**Knowledge**
- **Council Hall** - `+25% population growth`, `+5 housing`, unlocks Era 4 companions.
- **University Wing** - doubles `studySpeedMult` from 1.25x to 1.5x.

**Defense**
- **Iron Bastion** - Watchtower upgrade. `+10 defense`, `staffSlots: 5`, raid loss multiplier `0.20x`.
- **Sigil Wards** - passive: `-15% raid frequency`, `-20% additional sweep`.

**+ Summoning Circle** - see Summoning section.

## Resource additions

- **Aether Iron** - Era 4 material. Aether Foundry output.
- **Ration** - Era 4 food. Doesn't spoil. Echo Mill output. Nutrition 40.
- **Conduit Core** - drops from Era 4 raid victories + occasional Aether Foundry output.

## Companions (Era 4 set — gated on Council Hall)

| Companion | Bond | Bonuses | Cost |
| --- | --- | --- | --- |
| **Tin Automaton** | bound | +2 defense, x1.10 production, *no consumption* | 5 aether_iron + 3 conduit_core + 30 fragments |
| **Cult Initiate** | bound by ritual | +0.5 spirit/min, +0.5 sanity/min, -1 morale/min, +5% rune drop | 20 fragments + 2 scroll + 10 ink |
| **Tame Demon** | uneasy | +6 defense, +10% weapon drop, 15% chance of -2 sanity per patrol, +1 alignment evil | 30 fragments + 3 conduit_core + alignment evil >= 5 |

## Summoning — high-cost realm-pulled allies

A parallel track to companions. **Summons** are high-tier magical bindings: temporary, expensive, and tied to alignment arc.

### Summoning skill

New skill `summoning` (combat category):
- XP source: rituals + maintenance
- Requires `summoning > 0` AND Stone Altar + Summoning Circle
- Synergy-driven: primary skills are `magicCombat`, `runesmithing`; secondary are `alchemy`, `butchering`, `swordplay`
- Apex summons need 5 different skills at level 8+

### Summons vs companions

| | Companions | Summons |
| --- | --- | --- |
| Cost | Resources one-time | Resources + Spirit + ongoing drains |
| Lifetime | Permanent (until dismissed) | Temporary (30 min – 2 hours) |
| Slot | 1 active | Own slot (`run.companions.activeSummon`) — stacks with companion |
| Theme | Recruit + bond | Bind + maintain |

### Evil arc — enforcers (suppress rebellion ticks, often drain morale further)

| Summon | Tier | Duration | Bonuses | Cost |
| --- | --- | --- | --- | --- |
| **Skitter-Form** | minor | 30 min | +0.20 evasion, +15% rune drop, -0.2 sanity/min | 8 fragments + 12 Spirit + Summoning 3 + Alchemy 3 |
| **Shade-Walker** | major | 1 hour | +8 defense, +15% gather, **suppresses rebellion ticks** | 1 voidRune + 15 fragments + 20 Spirit + Summoning 5 + Sigilcraft 4 |
| **Cinder Hound** | major | 45 min | +10 melee damage, +25% weapon drop, -0.5 sanity/min, **suppresses rebellion** | 2 emberRune + 20 fragments + 25 Spirit + Summoning 6 + Butchering 5 + Alchemy 4 |
| **Wraith of the Hollow** | apex (evil) | 2 hours | +15 all combat, +30% rune drop, +1 spirit/min, **suppresses rebellion + drains 1 morale/min, +1 evil alignment per call** | 3 conduit_core + 30 fragments + 50 Spirit + Summoning 8 + Voidcall path mastered + 4 other skills >= 8 |

### Good arc — supporters (raise morale, boost production, fix the cause)

| Summon | Tier | Duration | Bonuses | Cost |
| --- | --- | --- | --- | --- |
| **Whisper-Bound** | minor | 30 min | +0.5 sanity recovery, **+0.5 morale/min**, +5 defense | 5 fragments + 10 Spirit + Summoning 1 |
| **Garden-Spirit** | major | 1 hour | **+20% production rate**, **+1 morale/min**, +0.3 sanity/min | 2 lightRune + 15 fragments + 20 Spirit + Summoning 5 + Alchemy 5 |
| **Forgehand** | major | 1 hour | x1.5 to one selected production building, **+0.5 morale/min**, +5 worldScore on bind | 3 elementalRune + 20 fragments + 25 Spirit + Summoning 6 + Blacksmithing 6 |
| **Aspect of the First Light** | apex (good) | 2 hours | +15 all combat, +50% sanity recovery, **+3 morale/min**, +1 worldScore/min, **breaks active rebellion on bind** | 5 lightRune + 30 fragments + 50 Spirit + Summoning 8 + Light path mastered + worldScore >= 70 |

### Summon <-> rebellion interaction

- **Evil summons suppress the SYMPTOM** — rebellion ticks skip while active. Morale stays low; production stays slow via `getMoraleMult`. Player still bleeds output, just not material. The **tyranny path**.
- **Good summons FIX the cause** — `+morale/min` raises the stat. Aspect clears `rebellionActiveSince` on bind, ending the rebellion immediately.
- **Wraith and Aspect are mutually exclusive in practice** — opposite-path requirements (Voidcall + high evil vs Light + worldScore >= 70).

### Summoning Circle building

| Building | Era | Cost | Effect |
| --- | --- | --- | --- |
| **Summoning Circle** | 4 | 100 stone + 30 aether_iron + 5 conduit_core + 30 fragments | Required for all summons. Drains 0.2 worldScore/min while a summon is active. |

## Rebellion — what happens when morale collapses

Up to now, low morale just slowed production via `getMoraleMult`. **Rebellions take that further**: when villagers stay despondent for too long, they start destroying the settlement.

### Trigger

When `state.run.morale < 20` for **5 sustained minutes**:
- `run.rebellionActiveSince = timestamp`
- TownView shows a red banner: **Rebellion — your villagers are destroying the settlement**
- Every 60s of continued rebellion fires one ROUND of damage

### Per-round rebellion damage

A new `tickRebellion` runs while active:
- 70% chance: sweep **30% of one random resource** (food/wood/stone primarily; weapons + tools protected)
- 40% chance: **damage a random non-shelter building** (added to `run.destroyedBuildings`)
- 25% chance: **villager loss** (1-2 walk off)
- 10% chance: **clear all production assignments** (forces re-staffing)

### Resolution paths

Rebellion ends when ANY of these is true:
1. **Morale climbs back >= 30** — natural recovery. Logs "The villagers calm. The settlement breathes."
2. **Active evil summon** at major+ tier (Shade-Walker, Cinder Hound, Wraith) — SUPPRESSES ticks; morale stays low.
3. **High alignment evil** (>= 20) — fear keeps order. Ticks skip; morale stays low.
4. **Active good summon** with `+morale/min` — raises morale back over threshold within minutes (Garden-Spirit, Whisper-Bound, Forgehand, Aspect).
5. **Aspect of the First Light** on bind — clears `rebellionActiveSince` immediately.

### Suppression cost (why it isn't free)

Evil-path resolutions (2, 3) SUPPRESS the symptom without fixing the cause. Morale stays in 0-19 band; production stays slow via `getMoraleMult` (x0.5). The player keeps stockpile but bleeds 50% of production speed. The **tyranny path** — survive forever, never grow.

Good-path resolutions (1, 4, 5) FIX the cause. Morale climbs, `getMoraleMult` rises, production restores.

### State

```js
run.rebellionActiveSince: null | timestamp
run.lastRebellionTickAt: 0
```

### Why this matters

First system where **alignment choice has a mechanical floor**. Low-morale settlements held together by:
- Genuine care (Temple, Moot Hall, Cottage, Ale, Good summons) — fixes everything
- Active suppression (Evil summons, high evil) — survival but no growth

Good-arc summons aren't just stat boosts. They're the **only path to scaling** out of late-game morale crises.

## Class armor (Mage / Ranger / Warrior) — Era 2 -> 4 ladder

Three armor classes, full 5-slot sets (head/chest/leggings/boots/gloves) at three tiers (bronze/iron/aether). **3 classes x 3 tiers x 5 slots = 45 armor pieces** across Era 2-4.

### Class affinities

| Class | Style | Stats | Materials |
| --- | --- | --- | --- |
| Warrior | melee | +damage, +HP, +defense | aether iron + leather + tusks |
| Ranger | ranged | +accuracy, +ranged crit, +evasion | hide + sinew + feathers |
| Mage | magic | +max spirit, +rune drop, +magic damage | rags + ink + scrolls |

### Tier scaling

| Tier | Era | Set bonus |
| --- | --- | --- |
| Bronze | 2 | +1 primary stat |
| Iron | 3 | +3 primary + 1 secondary |
| Aether | 4 | +6 primary, +2 secondary, +1 enchant slot per piece |

### Aether-tier specifics

| Class | Pieces | Set bonus |
| --- | --- | --- |
| Warrior | Helm, Cuirass, Greaves, Sabatons, Gauntlets | +6 melee dmg, +20 max HP, +5 defense |
| Ranger | Hood, Vest, Trousers, Boots, Bracers | +6 accuracy, +10% ranged crit, +0.15 evasion |
| Mage | Hood (robed), Robe, Skirt, Slippers, Cuffs | +20 max spirit, +10% rune chance, +6 magic dmg |

Aether armor adds **+1 enchant slot per piece** — full mage set = 5 extra enchant slots across the wardrobe.

## Tinker skill + tinker items — new combat-adjacent specialization

A new skill (`tinker`) that gates deployable combat consumables. **Synergy-driven** — outputs scale with multiple lower skills.

### Skill behavior

- Crafting + USING tinker items both require `tinker > 0`. Hard gate.
- Synergy: each recipe has `synergySkills: [{ id, weight }]`. Effective craft skill = `tinker x 1.0 + Sum(synergySkill x weight)`.

### Tinker items (9 across Era 2-4)

**Era 2 (Tinker 1-5)**
- **Smoke Bomb** — combat: enemy -20% acc for fight. Tinker 1 + Alchemy 2 (0.8) + Survival 1 (0.3).
- **Trip Wire** — patrol: 25% auto-win. Tinker 2 + Hunting 3 (1.0) + Survival 2 (0.5).
- **Caltrop Bag** — combat: 1d3 counter-damage on hit. Tinker 2 + Blacksmithing 2 (1.0) + Hunting 1 (0.4).

**Era 3 (Tinker 5-10)**
- **Acid Vial** — combat: ignores 50% defense. Tinker 5 + Alchemy 4 (1.0) + Runesmithing 2 (0.5).
- **Flash Charge** — combat: 60% stun. Tinker 6 + Sigilcraft 3 (1.0) + Alchemy 3 (0.7).
- **Spring Snare** — hunting: guaranteed catch. Tinker 7 + Hunting 6 (1.2) + Blacksmithing 3 (0.5).

**Era 4 (Tinker 10-20)**
- **Aether Grenade** — combat: AoE +30 damage, -3 sanity per use. Tinker 10 + Alchemy 5 + Blacksmithing 5 + Runesmithing 3.
- **Web Spinner** — patrol: 50% chance to block raid sweep. Tinker 12 + Hunting 8 + Sigilcraft 6.
- **Recall Beacon** — emergency exit current fight. Tinker 15 + Memory studies path completed.

### Why this matters

Tinker is **the first skill that demands every other craft skill**. Late-game loadout needs: Tinker + Blacksmithing + Alchemy + Hunting + Runesmithing + Sigilcraft. The generalist's mastery.

## Threat evolution

Era 4 raids escalate:
- **Tainted Outriders** — Bandits return at 0.95x sweepFraction, +1 building damaged per raid.
- **The Quiet Census** — villagers may go missing without combat. Recoverable via Council Hall.
- **Building corruption** — raid may *taint* a building: still produces but bleeds 0.5 sanity + 0.3 morale per tick. Cleanable at Stone Altar for 5 fragments. Tracked in `run.taintedBuildings`.

## What's NOT in Era 4

- Not yet apocalypse — that's Era 5 (Eldritch Reckoning)
- No worldScore endgame yet — Era 4 deepens choices but doesn't resolve
- No new study paths — the 7 paths from Era 3 carry through
- No multiclass — armor class affinity is a soft bonus, not a hard gate

## System integrations (existing systems Era 4 plugs into)

- **Morale (#199)** — Echo Mill drains, tainted buildings drain, Tame Demon drains, summoning bleeds. Era 4 piles sustained morale pressure.
- **Trade routes (#197)** — Aether Foundry runs an Era 4 trade route.
- **Storage (#194)** — Aether Repository (+30 aether_iron, +15 conduit_core cap).
- **Settlement etchings (#198)** — Era 4 entry stamps `settlement:era:4`. First summon stamps `summon:first`. First apex summon stamps `summon:apex:first`. First rebellion stamps `settlement:rebellion:first` (a darker entry on the altar).
- **Raid sweep math (#190/#191)** — Iron Bastion 0.20x replaces Watchtower 0.35x. Sigil Wards -20% sweep additive.
- **Combat (#33/#34)** — Class armor + tinker pre-fight throw + active summon stats fold through existing combat resolver.
- **Skills (#3/#112)** — Two new skills (Tinker + Summoning).
- **Companions (#202)** — Summons share the companion infrastructure but use a separate `activeSummon` slot.

## Phasing

| Chunk | What |
| --- | --- |
| #205 | Era 4 entry + "The Hum" story event + settlement:era:4 etching |
| #206 | First 4 Era 4 buildings + 3 new resources |
| #207 | Other 4 buildings |
| #208 | Era 4 companions (3) |
| #209 | Aether-tier weapons (5) |
| #210 | Class armor — bronze + iron + aether tiers, 3 classes |
| #211 | Tinker skill + 9 items |
| #212 | Summoning skill + Summoning Circle + 8 summons (4 evil + 4 good) |
| #213 | Rebellion mechanic — tickRebellion + suppression by evil summons + clearance by good summons |
| #214 | Era 4 threat tier-up: Tainted Outriders, Quiet Census, building corruption |
| #215 | Polish + docs catchup + dev panel helpers |

Each chunk is ~1 session.

## Open questions

- Summon slot vs companion slot — recommended: own slot, stacks with companion. Re-confirm before #212.
- Council Hall UI — own section or just a recruitment gate?
- Aether-Quenched modifier — ship in #209 or as #216 follow-up?
- Era 4 mug targets / prey — probably skip; mugging is Wasteland-era, hunting fades into city life.
- Tinker + Summoning combined builds — not mutually exclusive; can level both but realistic max is one apex per run.
- Should rebellion damage scale with population size? (e.g., 30 villagers = bigger losses per round?) Defer until playtest.
