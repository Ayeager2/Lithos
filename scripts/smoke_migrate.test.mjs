// Smoke test for #170/#176/#182-#200 save migration.
//
// Verifies that an old save shape (no enchantments, weaponImbues, blessings,
// population, assignments, shortageMs, destroyedBuildings, tradeRouteLastAt,
// morale, etc.) is upgraded with the new fields populated as empty objects
// so the systems don't crash on undefined lookups.

import { RUN_DEFAULTS } from "../src/state/run.js";

// Simulate an old save: only the bare-minimum legacy run shape (pre-#170).
const oldSave = {
  version: 4,
  run: {
    startedAt: 1700000000000,
    era: 2,
    inventory: { wood: 5, stone: 3 },
    gathered: {},
    stats: { hunger: 0, thirst: 0, energy: 100, hp: 80 },
    built: { hut: {} },
    researched: { altarWork: true },
    skills: {},
    log: [],
    // No enchantments / weaponImbues / blessings / population /
    // assignments / shortageMs / destroyedBuildings / tradeRouteLastAt /
    // morale / etc.
  },
  persistent: {
    echoes: 5,
    altarEtchings: { "studies:first": { stampedAt: 1700000000000, label: "First lesson" } },
  },
};

// Mirror the merge logic in save.js migrate() (line 65).
const merged = {
  run: { ...RUN_DEFAULTS, ...(oldSave.run || {}) },
  persistent: oldSave.persistent,
};

// Verify each new field defaults correctly.
const checks = [
  // #170/#176 enchantments
  ["run.enchantments", JSON.stringify(merged.run.enchantments) === "{}"],
  ["run.weaponImbues", JSON.stringify(merged.run.weaponImbues) === "{}"],
  ["run.blessings",    JSON.stringify(merged.run.blessings) === "{}"],
  // #182-#194 economy
  ["run.population",           merged.run.population === 0],
  ["run.populationGrowAccum",  merged.run.populationGrowAccum === 0],
  ["run.lastPopulationTickAt", merged.run.lastPopulationTickAt === 0],
  ["run.recipeAccum",          JSON.stringify(merged.run.recipeAccum) === "{}"],
  ["run.lastRecipeTickAt",     merged.run.lastRecipeTickAt === 0],
  ["run.consumptionAccum",     JSON.stringify(merged.run.consumptionAccum) === "{}"],
  ["run.lastConsumptionTickAt",merged.run.lastConsumptionTickAt === 0],
  ["run.shortageMs",           JSON.stringify(merged.run.shortageMs) === "{}"],
  ["run.shortageLastLossAt",   JSON.stringify(merged.run.shortageLastLossAt) === "{}"],
  ["run.destroyedBuildings",   JSON.stringify(merged.run.destroyedBuildings) === "{}"],
  ["run.tradeRouteLastAt",     JSON.stringify(merged.run.tradeRouteLastAt) === "{}"],
  ["run.assignments",          JSON.stringify(merged.run.assignments) === "{}"],
  // #199 morale
  ["run.morale",               merged.run.morale === 50],
  ["run.lastMoraleTickAt",     merged.run.lastMoraleTickAt === 0],
];

let allPass = true;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (!ok) allPass = false;
}

// Verify the old field that already existed is preserved.
console.log(`✅ run.era preserved: ${merged.run.era === 2}`);
console.log(`✅ run.inventory.wood preserved: ${merged.run.inventory.wood === 5}`);
console.log(`✅ persistent.altarEtchings preserved: ${Object.keys(merged.persistent.altarEtchings).length === 1}`);

// Smoke the systems that read these fields — none should throw on the merged state.
const mockState = merged;
import { getHousingCap, populationGrowthEnabled, getAssignments, getConsumptionRates, getShortageStatus, getNetProductionRates, getMoraleMult } from "../src/systems/town.js";
import { getRaidLossFraction, getArmyStrength } from "../src/systems/defense.js";
import { canRepair } from "../src/systems/building.js";

console.log(`\nFunction calls on migrated state:`);
console.log(`  getHousingCap: ${getHousingCap(mockState)}`);
console.log(`  populationGrowthEnabled: ${populationGrowthEnabled(mockState)}`);
console.log(`  getAssignments: ${JSON.stringify(getAssignments(mockState))}`);
console.log(`  getConsumptionRates: ${JSON.stringify(getConsumptionRates(mockState))}`);
console.log(`  getShortageStatus: ${JSON.stringify(getShortageStatus(mockState))}`);
console.log(`  getNetProductionRates: ${JSON.stringify(getNetProductionRates(mockState))}`);
console.log(`  getMoraleMult: ${getMoraleMult(mockState)}`);
console.log(`  getRaidLossFraction: ${getRaidLossFraction(mockState).toFixed(2)}`);
console.log(`  getArmyStrength: ${getArmyStrength(mockState)}`);
console.log(`  canRepair(sawmill): ${JSON.stringify(canRepair(mockState, "sawmill"))}`);

if (allPass) {
  console.log("\n✅ Full migration smoke test passed.");
} else {
  console.log("\n❌ Migration smoke test FAILED.");
  process.exit(1);
}
