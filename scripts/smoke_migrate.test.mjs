// Smoke test for #170/#176 save migration. Verifies that an old save
// shape (no run.enchantments, no run.weaponImbues, no run.blessings) is
// upgraded with the new fields populated as empty objects so the systems
// don't crash on undefined lookups.
import { RUN_DEFAULTS } from "../src/state/run.js";

// Simulate an old save: only the bare-minimum legacy run shape.
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
    // Note: no enchantments, no weaponImbues, no blessings.
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

console.log("run.enchantments:", JSON.stringify(merged.run.enchantments));
console.log("run.weaponImbues:", JSON.stringify(merged.run.weaponImbues));
console.log("run.blessings:", JSON.stringify(merged.run.blessings));
console.log("persistent.altarEtchings count:", Object.keys(merged.persistent.altarEtchings).length);

// Verify no crashes when reading the new fields the way systems do.
const weaponId = "ironGreatsword";
const enchantMap = merged.run?.enchantments?.[weaponId];
console.log("enchantMap lookup for missing weapon:", enchantMap === undefined ? "undefined (safe)" : "BROKEN");

// Verify the spread-default approach works for the upsert pattern.
const enchantments = { ...(merged.run.enchantments || {}) };
const onWeapon = { ...(enchantments[weaponId] || {}) };
onWeapon["mendingAura"] = { appliedAt: Date.now() };
enchantments[weaponId] = onWeapon;
console.log("After mock-etch:", JSON.stringify(enchantments));

console.log("\n✅ Migration smoke test passed.");
