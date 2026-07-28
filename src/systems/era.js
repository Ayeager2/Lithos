// Era is a derived value, not a stored field. Computed from milestones.

export const ERAS = {
  0: { id: 0, name: "Scavenger" },
  1: { id: 1, name: "Awakening" },
  2: { id: 2, name: "Settler" },
  3: { id: 3, name: "Awakened World" },
  4: { id: 4, name: "Arcane Industry" },
  5: { id: 5, name: "Eldritch Reckoning" },
};

const ERA2_REQUIRED_RESEARCH = ["foraging", "fire", "knapping"];

// Era 3 entry: Era 2 mastery proven — Forge built, Smithing + Fletching
// learned, the Bow crafted (toolsCrafted, lifetime-of-run so it survives
// breakage), AND a Home built (the magical era is for those who have a
// place to be magical in).
const ERA3_REQUIRED_RESEARCH = ["smithing", "fletching"];

function era3Eligible(run) {
  if (!run.built?.forge) return false;
  if (!run.built?.home) return false;
  const r = run.researched || {};
  if (!ERA3_REQUIRED_RESEARCH.every((id) => r[id])) return false;
  if (!run.toolsCrafted?.bow) return false;
  return true;
}

function era4Eligible(state) {
  const { run } = state;
  if (!era3Eligible(run)) return false;
  const pop = run.population || 0;
  if (pop >= 25 && run.built?.temple && run.built?.stoneAltar) return true;
  if ((run._era4PathsCount || 0) >= 3) return true;
  if ((run.worldScore || 0) >= 60) return true;
  if ((run.alignment?.evil || 0) >= 10) return true;
  return false;
}

// Era 5 entry (#225) — Eldritch Reckoning. Any one of:
//   1. worldScore >= 90 (Mending path entry)
//   2. alignment.evil >= 25 (Communion path entry)
//   3. apex summon previously bound (Wraith or Aspect) — set on bind
// Plus: must satisfy Era 4 eligibility first.
function era5Eligible(state) {
  const { run } = state;
  if (!era4Eligible(state)) return false;
  if ((run.worldScore || 0) >= 90) return true;
  if ((run.alignment?.evil || 0) >= 25) return true;
  if (run.apexSummonBound) return true;
  return false;
}

export function computeEra(state) {
  const { run } = state;

  if (!run.rockAwakened || !run.built?.hut) return 0;

  if (era5Eligible(state)) return 5;
  if (era4Eligible(state)) return 4;
  if (era3Eligible(run)) return 3;

  if (run.built?.firepit) {
    const r = run.researched || {};
    const allTier1 = ERA2_REQUIRED_RESEARCH.every((id) => r[id]);
    if (allTier1) return 2;
  }

  return 1;
}

export function getEra(state) {
  const id = computeEra(state);
  return ERAS[id] || ERAS[0];
}

export function getNextEraRequirements(state) {
  const era = computeEra(state);
  const { run } = state;
  const reqs = [];
  if (era < 1) {
    if (!run.rockFound) reqs.push("Find the rock");
    if (run.rockFound && !run.rockAwakened) reqs.push("Awaken the rock (collect 10 fragments)");
    if (run.rockAwakened && !run.built?.hut) reqs.push("Build a hut");
    return reqs;
  }
  if (era < 2) {
    if (!run.built?.firepit) reqs.push("Build a fire pit");
    const learned = run.researched || {};
    for (const id of ERA2_REQUIRED_RESEARCH) {
      if (!learned[id]) reqs.push(`Learn ${id[0].toUpperCase() + id.slice(1)}`);
    }
    return reqs;
  }
  if (era < 3) {
    if (!run.built?.forge) reqs.push("Build a Forge");
    if (!run.built?.home) reqs.push("Build a Home");
    const learned = run.researched || {};
    for (const id of ERA3_REQUIRED_RESEARCH) {
      if (!learned[id]) reqs.push(`Learn ${id[0].toUpperCase() + id.slice(1)}`);
    }
    if (!run.toolsCrafted?.bow) reqs.push("Craft a Bow");
    return reqs;
  }
  if (era < 4) {
    const pop = run.population || 0;
    const popPath = pop >= 25 && run.built?.temple && run.built?.stoneAltar;
    const wsPath = (run.worldScore || 0) >= 60;
    const evilPath = (run.alignment?.evil || 0) >= 10;
    const pathsPath = (run._era4PathsCount || 0) >= 3;
    if (!popPath && !wsPath && !evilPath && !pathsPath) {
      reqs.push("Reach 25 villagers + Temple + Stone Altar  (OR)");
      reqs.push("Master 3+ Arcane Studies paths  (OR)");
      reqs.push("Raise World Score to 60+  (OR)");
      reqs.push("Drive Alignment Evil to 10+");
    }
    return reqs;
  }
  if (era < 5) {
    const ws = run.worldScore || 0;
    const evilA = run.alignment?.evil || 0;
    const apexBound = !!run.apexSummonBound;
    if (ws < 90 && evilA < 25 && !apexBound) {
      reqs.push("Raise World Score to 90+ (Mending entry)  (OR)");
      reqs.push("Drive Alignment Evil to 25+ (Communion entry)  (OR)");
      reqs.push("Bind an apex summon (Wraith / Aspect — Defiance entry)");
    }
    return reqs;
  }
  return [];
}
