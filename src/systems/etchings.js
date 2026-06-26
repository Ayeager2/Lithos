// Stone Altar etchings (#174 / #176) — shared stamping util.
//
// Etchings live on `persistent.altarEtchings` and survive prestige.
// Each entry is keyed by a stable id and stores { stampedAt, label }.
// The CharacterView "Altar" section reads this map and groups entries
// by source via id prefix (see etchingMeta() in CharacterView.jsx).
//
// IDs follow the pattern `<kind>:<key>` (or `<kind>:<key>:<extra>`).
// Stable kinds in use:
//   studies:first            — first ever study completion
//   studies:first-crossover  — first study in a second path
//   path:<pathId>:first      — first study in a path
//   voidcall:<nodeId>        — voidcall path milestones
//   boss:<bossId>            — first boss defeat (stamped in systems/boss.js)
//   mob:<mobId>:first        — first kill of a mob species
//   prey:<preyId>:first      — first successful hunt of a prey species
//   craft:weapon:<tier>      — first weapon crafted in a tier
//   craft:rune:first         — first rune inscribed
//   craft:enchant:first      — first weapon enchant etched
//   ascension:<N>            — Nth ascension (counter from lifetimeStats)

export function stampEtchingOnce(persistent, id, label) {
  if (!persistent || !id) return persistent;
  if (persistent.altarEtchings?.[id]) return persistent;
  return {
    ...persistent,
    altarEtchings: {
      ...(persistent.altarEtchings || {}),
      [id]: { stampedAt: Date.now(), label },
    },
  };
}

// Convenience for systems that want to know whether they should also
// push a log event ("an etching appears on the Altar"). Returns true
// only on the first stamp; false if already present.
export function isFirstStamp(persistent, id) {
  return !persistent?.altarEtchings?.[id];
}
