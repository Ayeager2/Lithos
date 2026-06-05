// All action types in one place. Single source of truth.

export const ACTIONS = {
  LOAD: "LOAD",
  RESET_RUN: "RESET_RUN",
  PRESTIGE: "PRESTIGE",

  GATHER: "GATHER",
  BUILD: "BUILD",
  RESEARCH: "RESEARCH",
  CRAFT_TOOL: "CRAFT_TOOL",
  HUNT: "HUNT",
  PATROL: "PATROL",

  EAT: "EAT",
  DRINK: "DRINK",
  BOIL_WATER: "BOIL_WATER",
  REST: "REST",
  RITUAL: "RITUAL",
  CAST_SPELL: "CAST_SPELL",
  USE_TOOL: "USE_TOOL",

  // Arcane Studies — timed magic study at the Stone Altar (#27).
  START_STUDY: "START_STUDY",
  SET_ACTIVE_STUDY: "SET_ACTIVE_STUDY",
  CANCEL_STUDY: "CANCEL_STUDY",

  // Combat — equipment management (#32).
  EQUIP: "EQUIP",
  UNEQUIP: "UNEQUIP",
  EQUIP_RING: "EQUIP_RING",
  UNEQUIP_RING: "UNEQUIP_RING",

  TICK: "TICK",
  RESPOND_TO_EVENT: "RESPOND_TO_EVENT",
  SYNC_MUSIC_UNLOCKS: "SYNC_MUSIC_UNLOCKS",
  SYNC_ERA: "SYNC_ERA",

  MARK_SPLASH_SEEN: "MARK_SPLASH_SEEN",
  CLEAR_LOG: "CLEAR_LOG",

  BUY_ECHO_UPGRADE: "BUY_ECHO_UPGRADE",

  // Boss fight commit (#40). Dispatched by BossFightModal at end of fight.
  BOSS_FIGHT_END: "BOSS_FIGHT_END",

  DEV_PATCH: "DEV_PATCH",
};
