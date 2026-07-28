import { useEffect, useReducer, useRef } from "react";
import { reducer } from "./reducer.js";
import { ACTIONS } from "./actions.js";
import { freshGame, loadGame, saveGame } from "./save.js";

function init() {
  return loadGame() ?? freshGame();
}

export function useGameStore() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    saveGame(state);
  }, [state]);

  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: ACTIONS.TICK });
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  // Auto-loop ticker (#68) — runs at 250ms so loops feel responsive
  // and the per-card progress bar updates smoothly. The reducer
  // short-circuits TICK_LOOP when nothing is active, so it's cheap idle.
  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: ACTIONS.TICK_LOOP });
    }, 250);
    return () => clearInterval(id);
  }, []);

  const actions = {
    gather: () => dispatch({ type: ACTIONS.GATHER }),
    build: (buildingId) => dispatch({ type: ACTIONS.BUILD, buildingId }),
    research: (researchId) => dispatch({ type: ACTIONS.RESEARCH, researchId }),
    craft: (toolId, qty = 1) => dispatch({ type: ACTIONS.CRAFT_TOOL, toolId, qty }),
    cancelCraft: () => dispatch({ type: "CANCEL_CRAFT" }),
    imbueWeapon: (weaponId, runeId) => dispatch({ type: "IMBUE_WEAPON", weaponId, runeId }),
    removeImbue: (weaponId, runeId) => dispatch({ type: "REMOVE_IMBUE", weaponId, runeId }),
    blessRune: (runeId) => dispatch({ type: "BLESS_RUNE", runeId }),
    enchantWeapon: (weaponId, enchantId) => dispatch({ type: "ENCHANT_WEAPON", weaponId, enchantId }),
    hunt: () => dispatch({ type: ACTIONS.HUNT }),
    mug: (targetId) => dispatch({ type: ACTIONS.THIEVERY_MUG, targetId }),
    assignBuilding: (buildingId, count) => dispatch({ type: ACTIONS.SET_BUILDING_ASSIGNMENT, buildingId, count }),
    repairBuilding: (buildingId) => dispatch({ type: ACTIONS.REPAIR_BUILDING, buildingId }),
    recruitCompanion: (id) => dispatch({ type: ACTIONS.RECRUIT_COMPANION, id }),
    setActiveCompanion: (id) => dispatch({ type: ACTIONS.SET_ACTIVE_COMPANION, id }),
    bindSummon: (id, productionTarget) => dispatch({ type: ACTIONS.BIND_SUMMON, id, productionTarget }),
    dismissSummon: () => dispatch({ type: ACTIONS.DISMISS_SUMMON }),
    cleanseTaint: (buildingId) => dispatch({ type: ACTIONS.CLEANSE_TAINT, buildingId }),
    useTinker: (itemId) => dispatch({ type: ACTIONS.USE_TINKER, itemId }),
    resolveHerald: (choiceId, outcome) => dispatch({ type: ACTIONS.RESOLVE_HERALD, choiceId, outcome }),
    pathSwitch: (newArc) => dispatch({ type: ACTIONS.PATH_SWITCH, newArc }),
    devReckoningAdjust: (deltaMs) => dispatch({ type: ACTIONS.DEV_RECKONING_ADJUST, deltaMs }),
    devReckoningSetDuration: (durationMs) => dispatch({ type: ACTIONS.DEV_RECKONING_SET_DURATION, durationMs }),
    devReckoningPause: () => dispatch({ type: ACTIONS.DEV_RECKONING_PAUSE }),
    devReckoningSpawnHerald: (heraldId) => dispatch({ type: ACTIONS.DEV_RECKONING_SPAWN_HERALD, heraldId }),
    fireApex: () => dispatch({ type: ACTIONS.FIRE_APEX }),
    engageHerald: () => dispatch({ type: ACTIONS.ENGAGE_HERALD }),
    ritualAttack: (mode) => dispatch({ type: ACTIONS.RITUAL_ATTACK, mode }),
    heraldAttack: () => dispatch({ type: ACTIONS.HERALD_ATTACK }),
    patrol: (target) => dispatch({ type: ACTIONS.PATROL, target }),
    eat: (preferredFoodId) => dispatch({ type: ACTIONS.EAT, preferredFoodId }),
    drink: (waterType) => dispatch({ type: ACTIONS.DRINK, waterType }),
    boilWater: () => dispatch({ type: ACTIONS.BOIL_WATER }),
    rest: () => dispatch({ type: ACTIONS.REST }),
    ritual: () => dispatch({ type: ACTIONS.RITUAL }),
    castSpell: (spellId) => dispatch({ type: ACTIONS.CAST_SPELL, spellId }),
    useTool: (toolId) => dispatch({ type: ACTIONS.USE_TOOL, toolId }),
    startStudy: (nodeId) => dispatch({ type: ACTIONS.START_STUDY, nodeId }),
    setActiveStudy: (nodeId) => dispatch({ type: ACTIONS.SET_ACTIVE_STUDY, nodeId }),
    cancelStudy: (nodeId) => dispatch({ type: ACTIONS.CANCEL_STUDY, nodeId }),
    equip: (id, slot) => dispatch({ type: ACTIONS.EQUIP, id, slot }),
    unequip: (slot) => dispatch({ type: ACTIONS.UNEQUIP, slot }),
    equipRing: (id, ringIndex) => dispatch({ type: ACTIONS.EQUIP_RING, id, ringIndex }),
    unequipRing: (ringIndex) => dispatch({ type: ACTIONS.UNEQUIP_RING, ringIndex }),
    respondToEvent: (choiceId) => dispatch({ type: ACTIONS.RESPOND_TO_EVENT, choiceId }),
    syncMusicUnlocks: () => dispatch({ type: ACTIONS.SYNC_MUSIC_UNLOCKS }),
    syncEra: () => dispatch({ type: ACTIONS.SYNC_ERA }),
    resetRun: () => dispatch({ type: ACTIONS.RESET_RUN }),
    prestige: () => dispatch({ type: ACTIONS.PRESTIGE }),
    markSplashSeen: () => dispatch({ type: ACTIONS.MARK_SPLASH_SEEN }),
    clearLog: () => dispatch({ type: ACTIONS.CLEAR_LOG }),
    buyEchoUpgrade: (upgradeId) => dispatch({ type: ACTIONS.BUY_ECHO_UPGRADE, upgradeId }),
    endBossFight: (payload) => dispatch({ type: ACTIONS.BOSS_FIGHT_END, payload }),
    setActiveLoop: (kind, target) => dispatch({ type: ACTIONS.SET_ACTIVE_LOOP, kind, target }),
    clearActiveLoop: () => dispatch({ type: ACTIONS.CLEAR_ACTIVE_LOOP }),
    tickLoop: () => dispatch({ type: ACTIONS.TICK_LOOP }),
    setCombatStyle: (style) => dispatch({ type: ACTIONS.SET_COMBAT_STYLE, style }),
    devPatch: (patch) => dispatch({ type: ACTIONS.DEV_PATCH, patch }),
  };

  return { state, actions };
}
