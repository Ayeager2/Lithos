# Era 5 — Eldritch Reckoning (design, v2)

*Status: design v2. Implementation pending. Iterate before locking.*

## Premise

The world has noticed. In Era 4 it started **thinking differently** about you — the forges hummed wrong, the Census walked through your settlement, the rebellions taught you that morale has teeth. Era 5 is when the world **acts**.

The horizon is now actively hostile. The stars come out in the wrong order. Things you killed in Era 3 show up at the gates, larger and changed. The Stone Altar's etchings begin to speak — to each other, in your absence, in a language the Stone is teaching itself.

Era 5 is **the reckoning**. The cosmic horror that has been ambient for 4 eras is now a directed force. Your alignment — built up across the run from every choice you made — finally has a mechanical floor: it determines **what is coming for you**.

This is the first era with a **doomsday clock**. From entry, a tunable real-time countdown ticks until the apex event fires. You can race the clock, slow it, or accept it.

## Tone notes

- The city humming with intent (Era 4) → the city is *being addressed*
- Villagers stop dreaming, then start dreaming the same dream
- Walls don't quite stop sound the way they used to
- The Stone Altar's etchings rearrange themselves overnight
- The light has a *direction* now. It comes from somewhere specific.
- New colors at the edges of vision. They have no names yet.

## Entry trigger

Two paths in. Either fires:
1. **Worldscore >= 90** — the world wants to mend, but something has decided it must be broken first.
2. **Alignment evil >= 25** — you've called enough, and the answer is coming up the road.

OR a forced trigger:
3. **Bound the apex summon (Wraith / Aspect)** — calling apex-tier shifted the cosmic balance.

The choice of trigger seeds the *flavor* of the reckoning (Mending arc vs. Communion arc vs. Defiance arc), but all three end up at the same apex event tree — only the **shape** of the apex changes by path.

One-time story event: **"The Sky Bends"**
- Bumps `state.run.era` to 5
- Stamps `settlement:era:5` etching
- **Starts the doomsday clock** (`run.reckoningClock = now + reckoningDurationMs`)
- Logs narration: *"The horizon tilts. The villagers feel it before they see it. By morning, half the etchings on the Stone Altar have moved. The Stone is awake. The Stone is listening. The Stone is being listened to."*
- Sanity -15 (settlement-wide)
- Surfaces a new TownView header: **Reckoning Clock** ticking down

## Reckoning clock (TUNABLE)

The defining mechanic of Era 5. A real-time countdown from entry. The duration is a **single config value** (`RECKONING_DURATION_MS` in `src/content/reckoning.js`) so we can tune it via playtest.

| Phase | Default fraction | What happens |
|---|---|---|
| **Phase 1: Shudders** | 0-33% | Random "world shudder" events fire every 5-10 min. Each is small but disorienting. |
| **Phase 2: Heralds** | 33-66% | Three Heralds arrive in sequence — settlement bosses at the 33%, 50%, 66% marks. |
| **Phase 3: The Reckoning** | 66%+ | The apex event fires. Path-flavored. |

Phase fractions are part of the same config so we can compress or stretch the structure as needed.

### Tuning UX (dev panel)

A dedicated **Era 5 Clock** dev panel section with:
- `[+30s]` `[+5m]` `[+30m]` `[+1h]` — advance the clock
- `[-30s]` `[-5m]` `[-30m]` `[-1h]` — rewind the clock
- `[Set duration: 30m / 1h / 2h / 3h / 4h]` — fast-swap the total duration mid-run
- `[Jump to Phase 2]` `[Jump to Phase 3]` — instant phase boundary
- `[Trigger Herald 1/2/3 now]` — spawn each Herald on demand
- `[Stop clock]` `[Resume clock]` — pause for tuning sessions
- Live readout: `Phase 2 · 1h 23m remaining · Herald 2 fires in 14m`

The clock pauses when the player is offline (browser tab closed). On resume, the clock ticks up by **online elapsed time only** — never punishes a player for sleeping.

## Path branches

| Path | Triggered by | Apex event | Bonus during reckoning |
|---|---|---|---|
| **Mending** | worldScore >= 90 entry | "The First Light Returns" — restore the broken layer | +25% sanity recovery, good summons cost 50% less |
| **Communion** | alignment.evil >= 25 entry | "The Embrace" — join the cosmos | Evil summons cost 50% less, +30% spirit regen, sanity loss x 0.5 |
| **Defiance** | apex summon bound first | "The Last Stand" — mortal hero defends | Combat damage x 1.25, sanity loss x 0.5, no summons unlock during Era 5 |

### Path switching — STACKED PENALTY

The player CAN attempt to switch paths during Phase 1-2 by hitting the other trigger conditions. But it costs ALL of:

1. **Time tax** — 15-30 min comes off the clock (tunable, default 20 min).
2. **Resource sacrifice** — burn 30 aether_iron + 5 conduit_core + 50 fragments. Steep but recoverable through Era 4 buildings.
3. **Stat damage** — -20 sanity (settlement-wide) + the OPPOSITE alignment counter you built up RESETS to 0 (so a Communion player switching to Mending loses ALL evil alignment; a Mending player switching to Communion zeroes worldScore).
4. **Herald reset** — all Heralds already survived re-spawn at the next phase boundary.

The cumulative cost makes the initial choice meaningful, but the door is never locked outright. After Phase 2 ends (66% of clock elapsed), path is locked — no switches.

## Heralds — three settlement-scale events, path-flavored

Each Herald arrives at the same clock-fraction across paths, but the SHAPE of the encounter is path-specific:

- **Mending path Heralds: DIALOG** — interaction prompts. The Herald asks something; the player picks an answer. The right answer for your alignment costs less; wrong = double drain.
- **Communion path Heralds: BATTLES** — possession contests, dominance rituals. Not standard combat — these are "submit correctly" or "assert correctly" rituals. The player WINS by binding the Herald to their will via a combat sequence themed as obsession + possession + dominance. New combat sub-type: **ritual combat** — the Herald has an "obsession meter" the player either FILLS (claim it) or DEPLETES (push it back). Either outcome counts as survival, but flavored differently.
- **Defiance path Heralds: BATTLES** — straight-up combat. The mortal hero stands against the cosmos. Hard fights. Tools/tinker items/companions/summons all matter.

| Herald | Phase mark | Mending shape | Communion shape | Defiance shape |
|---|---|---|---|---|
| **First Herald: The Mouth at the Gate** | 33% | A tall mouth-shape *asks* (dialog) | An obsession that wants in (ritual combat — fill its hunger to satisfy it) | A creature at the gate (straight combat) |
| **Second Herald: The Shape of What You Built** | 50% | A *whole* version of your settlement glowing (dialog) | A *consumed* settlement, beautiful — the Herald wants you to PROVE you can possess it (dominance battle) | An *empty* mirror-settlement that fights you with stolen tactics (combat) |
| **Third Herald: The Listener** | 66% | A figure that listens — answer the right question (dialog) | A presence that wants to possess YOU — fight its will (possession contest) | A silent figure that turns its head and attacks (combat) |

Surviving each Herald grants its reward: void_residue / conduit_core / fragments + a stat bonus. Failing (running out of HP in combat, picking wrong in dialog) doubles the drain but doesn't end the run.

### Cross-path bargain
Mending players CAN choose the Communion-flavor answer to a Herald (or vice versa), but it costs worldScore (Mending crossing) or alignment evil (Communion crossing) AND grants a small bonus. Mostly there to give the player options during the reckoning, not to be optimal.

## Building roster (5 buildings)

Smaller than Era 4 by design — the player should be racing the clock, not building leisurely.

- **Sky Anchor** — Mending-path building. Drains 1 worldScore/min, but slows the clock by 25%. Cost: 50 aether_iron + 20 conduit_core + 100 fragments + lightRune x 5.
- **Black Garden** — Communion-path building. +3 spirit/min, +0.5 evil alignment/min, slows clock by 25%. Cost: 50 aether_iron + 20 conduit_core + 100 fragments + voidRune x 5.
- **Bastion of Stone** — Defiance-path building. +20 defense, raid sweep x 0.05, slows clock by 25%. Cost: 200 stone + 80 iron + 30 aether_iron + 5 conduit_core.
- **Echo Sanctum** — Any-path. Houses 3, +1 sanity/min, gives the player a "safe room". Cost: 100 stone + 50 wood + 20 fragments.
- **Conduit Spire** — Any-path. Tall Conduit Array upgrade. +6 spirit/min, drains 1 worldScore/min, opens the apex event ritual. Cost: 60 aether_iron + 10 conduit_core + 50 fragments.

## Resource additions

- **Void Residue** — Drops from Heralds. Mystic. Required for apex rituals on Communion + Defiance paths.
- **First-Light Shard** — Drops from Mending-path Heralds. Mystic. Required for the Mending apex ritual.
- **Cosmic Memory** — Permanent-after-prestige. Each Era 5 apex completion grants 1. Permanent stat bonus per copy (carries to next runs).

### Resource persistence through prestige

Cosmic Memory is the only fully-persistent resource by default. **Void Residue and First-Light Shard wipe on prestige** UNLESS the player has bought an Echo Upgrade to preserve them. Tiered:

| Echo upgrade | Cost (echoes) | Effect |
|---|---|---|
| **Touched Memory I** | 8 echoes | Keep 1 Void Residue + 1 First-Light Shard across prestige |
| **Touched Memory II** | 25 echoes | Keep 3 of each across prestige |
| **Touched Memory III** | 75 echoes | Keep 10 of each across prestige |
| **Touched Memory IV** | 150 echoes | Keep entire Era 5 inventory across prestige |

(Costs are starting points — tune in playtest.)

This pattern lets a deep-prestige player jump-start subsequent Era 5 runs with a small head start, but never trivializes the first reckoning. Locked behind a meaningful echo investment.

## Apex events (path-specific)

### Mending apex: The First Light Returns
- Trigger: Phase 3 + worldScore >= 100 (player needs to lift ws further during Era 5)
- Ritual: 10 First-Light Shards + Aspect of the First Light bound + 4 hours of sustained worldScore >= 95
- Resolution: settlement etching `apex:mending` stamps. Worldscore preserved, run continues into Era 6 with `arc: "mending"` flag.

### Communion apex: The Embrace
- Trigger: Phase 3 + alignment.evil >= 40
- Ritual: 5 Void Residue + Wraith of the Hollow bound + N villagers consumed (N = TBD via playtest, current draft says 30 but that may be too high)
- Resolution: settlement etching `apex:communion` stamps. Worldscore -> 0, alignment.evil locked at max, Era 6 with `arc: "communion"`.

### Defiance apex: The Last Stand
- Trigger: Phase 3 + 50 villagers + Bastion of Stone built + 20 weapons in inventory
- Ritual: Long settlement-defense fight (boss battle) against The Encore
- Resolution: ~30% of the settlement loses. Survivors carry `survived: true` flag into Era 6 with `arc: "defiance"`.

## Threat evolution

- **World shudder events** — phase 1, every 5-10 min. Each is small: -1 sanity, +1 worldScore drift, a building's effect inverts for 1 min, etc.
- **Tainted villagers** — Era 4's tainted-building mechanic extends to people. A villager can become Touched: still works, but spreads taint to adjacent buildings.
- **Returning bosses** — Era 1-3 patrol bosses come BACK at the settlement gates, scaled up. They appear during phase 1 as low-frequency raid events.

## New skills

- **Reckoning Lore** — passive read of the clock + Heralds. Levels with every choice made about the Heralds. High level: see the path-correct answer telegraphed.
- **Cosmic Bargaining** — interact-with-Herald skill. Levels with each successful interaction. High level: unlock cross-path bargain options.

## What's NOT in Era 5

- No new weapons. The player already has aether-tier. Apex resolution is about choice + accumulated power.
- No new armor. Aether armor's enchant slots provide the headroom.
- No prestige here — that's Era 7 Cosmic.
- No new gather discipline. Era 5 is short and intense; no time for new farming loops.

## System integrations

- **Doomsday clock** — new tick (`tickReckoning`) every 1 min. Fires Herald events. Plugs into existing event system. State: `run.reckoningClock`, `run.reckoningPhase`, `run.heraldsSurvived[]`.
- **Alignment arc** — Era 5 is the first era where alignment **locks** to a path. After Phase 2 ends, the player can't swap paths.
- **Worldscore** — gates Mending entry; locked to 0 after Communion apex.
- **Companions/Summons** — Era 4 companions persist; Era 5 introduces no new permanent companions. Summoning Circle is still the apex ritual venue.
- **Rebellion** — still possible in Era 5 but the morale floor shifts. Communion path: no rebellion ever (the villagers stop caring). Defiance path: rebellion damage halved (mortal hero rallies them). Mending: standard.

## Phasing (~7 chunks)

| Chunk | What |
|---|---|
| #225 | Era 5 entry + The Sky Bends event + clock state + clock UI (with tunable duration config) |
| #226 | Dev panel scrub buttons (+/- clock time, phase jump, Herald spawn, duration swap) |
| #227 | Path branches + 5 buildings + 3 resources |
| #228 | Heralds (3) with path-flavored shapes — dialog (Mending) + ritual combat (Communion) + straight combat (Defiance) |
| #229 | Apex events (3) + apex resolution + Era 6 arc flag |
| #230 | Touched Memory echo upgrades (4 tiers) + path-switch penalty stacking |
| #231 | New skills (Reckoning Lore, Cosmic Bargaining) + polish + docs |

## Open questions

- **Clock duration**: TBD via playtest. Default starting value: 3 hours. Sweet spot finding is part of #225's job.
- **Communion 30-villager cost**: TBD. Tune in playtest. Likely lower (10-15) — needs to feel like a *real* sacrifice without making it impossible.
- **Phase fractions**: 33/33/33 is a starting point. Some paths may want shorter Phase 1 + longer Phase 3.
- **Ritual combat mechanics (Communion Heralds)**: design more deeply during #228. Current sketch: an "obsession meter" that either fills (claim) or empties (push back) via combat actions. Either resolution counts as survival.
- **Defiance Herald difficulty**: the mortal-hero combats should be HARD. How hard, exactly, is a playtest call.
- **Cross-path bargain rewards**: needs balancing in playtest.
