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

  const actions = {
    gather: () => dispatch({ type: ACTIONS.GATHER }),
    build: (buildingId) => dispatch({ type: ACTIONS.BUILD, buildingId }),
    research: (researchId) => dispatch({ type: ACTIONS.RESEARCH, researchId }),
    craft: (toolId) => dispatch({ type: ACTIONS.CRAFT_TOOL, toolId }),
    hunt: () => dispatch({ type: ACTIONS.HUNT }),
    patrol: () => dispatch({ type: ACTIONS.PATROL }),
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
    devPatch: (patch) => dispatch({ type: ACTIONS.DEV_PATCH, patch }),
  };

  return { state, actions };
}
