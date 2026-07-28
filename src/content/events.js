// Random event definitions — DATA, not code.

export const EVENTS = {
  // ============================================================
  // Era 1 — original shipped set
  // ============================================================

  windFromEast: {
    id: "windFromEast", name: "Wind from the East", trigger: "any", weight: 8,
    requires: { era: 1 }, cooldownMs: 5 * 60 * 1000,
    flavor: "A wind from the east. The dust thins for a breath.",
    onFire: {
      effects: {
        inventory: { wood: 5, stone: 5 },
        log: { kind: "event_good", message: "🌬️ A wind from the east. The dust thins. You find wood and stone in the clearing." },
      },
    },
  },

  crackedEarth: {
    id: "crackedEarth", name: "Cracked Earth", trigger: "gather", weight: 5,
    requires: { era: 1 }, cooldownMs: 8 * 60 * 1000,
    flavor: "The ground splits.",
    onFire: {
      effects: {
        inventory: { stone: 20 },
        log: { kind: "event_good", message: "💥 The ground splits beneath you. A vein of stone, exposed." },
      },
    },
  },

  hiddenSpring: {
    id: "hiddenSpring", name: "Hidden Spring", trigger: "gather", weight: 4,
    requires: { era: 1 }, cooldownMs: 10 * 60 * 1000,
    flavor: "Water you didn't know was there.",
    onFire: {
      effects: {
        inventory: { water: 4 },
        log: { kind: "event_good", message: "💧 You scrape moss from a stone and water beads. A small spring you hadn't seen." },
      },
    },
  },

  strangeLights: {
    id: "strangeLights", name: "Strange Lights", trigger: "interval", weight: 3,
    requires: { era: 1 }, cooldownMs: 12 * 60 * 1000,
    flavor: "Lights in the sky that should not be there.",
    onFire: {
      effects: {
        stats: { sanity: -1 },
        inventory: { fragments: 2 },
        log: { kind: "event_strange", message: "✨ Lights in the sky that should not be there. Your hand twitches around the stone. Two more fragments fall from the dark." },
      },
    },
  },

  bloodMoon: {
    id: "bloodMoon", name: "Blood Moon", trigger: "interval", weight: 1,
    requires: { era: 1 }, cooldownMs: 30 * 60 * 1000,
    flavor: "The moon has gone red. The world feels thin.",
    onFire: {
      effects: {
        stats: { sanity: -2, happiness: -3 },
        log: { kind: "event_strange", message: "🩸 A blood moon. The world feels thin. You see shapes in the dust that move when you do not look at them directly." },
      },
    },
  },

  carrionFlock: {
    id: "carrionFlock", name: "Carrion Flock", trigger: "any", weight: 5,
    requires: { era: 1, hasBuilding: "garden" }, cooldownMs: 12 * 60 * 1000,
    flavor: "A flock of carrion birds settles on the garden.",
    onFire: {
      effects: {
        setsPest: { pestId: "birdFlock", durationMs: 5 * 60 * 1000 },
        log: { kind: "event_strange", message: "🦅 A flock of carrion birds settles over the garden. They strut, they pluck, they eat. Hunt them off — or wait them out." },
      },
    },
  },

  blackRain: {
    id: "blackRain", name: "Black Rain", trigger: "interval", weight: 3,
    requires: { era: 1 }, cooldownMs: 15 * 60 * 1000,
    flavor: "Black rain. Old soot in the clouds. But it is water, still.",
    onFire: {
      effects: {
        stats: { sanity: -1, happiness: -1 },
        inventory: { water: 6 },
        log: { kind: "event_strange", message: "🌧️ The rain comes black with old soot. You catch what you can in cupped hands. Water is water. +6 water." },
      },
    },
  },

  burrowingThing: {
    id: "burrowingThing", name: "A Burrowing Thing", trigger: "interval", weight: 3,
    requires: { era: 1 }, cooldownMs: 18 * 60 * 1000,
    flavor: "Something pale and many-legged is in your stores. It chitters when you approach.",
    choices: [
      { id: "kill", label: "Kill it",
        effect: {
          stats: { hp: -3, happiness: -1 },
          inventory: { food: 4 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "🪲 You crush it. There is more meat on it than you thought. +4 grubs." },
        },
      },
      { id: "let", label: "Let it pass",
        effect: {
          stats: { sanity: 2, happiness: 1 },
          inventory: { food: -2 },
          alignment: { good: 1 },
          log: { kind: "event_good", message: "🪲 You step back. It eats what it came for and is gone. (-2 grubs taken.)" },
        },
      },
    ],
  },

  howlInTheDark: {
    id: "howlInTheDark", name: "Howl in the Dark", trigger: "interval", weight: 2,
    requires: { era: 1 }, cooldownMs: 22 * 60 * 1000,
    flavor: "A long howl, far off. Something with too many lungs. It calls again, closer.",
    choices: [
      { id: "investigate", label: "Walk toward it",
        effect: {
          stats: { sanity: -3, hp: -2 },
          inventory: { fragments: 2, stone: 6 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "👁️ You follow the sound. A depression in the dust where something curled. +2 fragments, +6 stone — and your hand will not stop shaking." },
        },
      },
      { id: "hide", label: "Hide and wait",
        effect: {
          stats: { sanity: 3, happiness: 2 },
          alignment: { good: 1 },
          log: { kind: "event_good", message: "🛖 You sit still inside the hut. The howl passes. You keep breathing. There are smaller victories than glory." },
        },
      },
    ],
  },

  wanderingChild: {
    id: "wanderingChild", name: "A Wandering Child", trigger: "interval", weight: 4,
    requires: { era: 1 }, cooldownMs: 20 * 60 * 1000,
    flavor: "A child has wandered close to your hut. Hungry. Watching. They have no one with them.",
    choices: [
      { id: "share", label: "Share food", cost: { food: 2 }, missingMessage: "You have no food to share.",
        effect: {
          stats: { happiness: 5, sanity: 3 },
          alignment: { good: 2 },
          log: { kind: "event_good", message: "🤝 You give what you can. The child eats and slips back into the dust. Your chest feels lighter." },
        },
      },
      { id: "ignore", label: "Look away",
        effect: {
          stats: { happiness: -2 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "You look away. The child watches a moment longer, then is gone. The wind picks up." },
        },
      },
    ],
  },

  hurtElder: {
    id: "hurtElder", name: "An Elder, Hurt", trigger: "interval", weight: 2,
    requires: { era: 1 }, cooldownMs: 25 * 60 * 1000,
    flavor: "An elder lies by the path, bleeding from a wound. They look at you, their eyes clouded but knowing.",
    choices: [
      { id: "help", label: "Tend their wounds", cost: { water: 1, food: 1 }, missingMessage: "You haven't enough to spare.",
        worldScoreDelta: 0.5,    // World Score (#29) — kindness leaves a mark on the world
        effect: {
          stats: { happiness: 5, sanity: 5 },
          alignment: { good: 3 },
          log: { kind: "event_good", message: "🩹 You tend their wounds. They tell you a story of the world before, then go quiet. You feel something steady inside you." },
        },
      },
      { id: "leave", label: "Walk past",
        effect: {
          stats: { happiness: -5, sanity: -2 },
          alignment: { evil: 2 },
          log: { kind: "event_strange", message: "You walk past. Their breath rasps. You do not look back. Something inside you goes quiet." },
        },
      },
    ],
  },

  // ============================================================
  // Era 1 — content drop (10 new)
  // ============================================================

  ashStorm: {
    id: "ashStorm", name: "Ash Storm", trigger: "interval", weight: 3,
    requires: { era: 1 }, cooldownMs: 14 * 60 * 1000,
    flavor: "The horizon goes brown. You taste grit before you taste anything else.",
    onFire: {
      effects: {
        stats: { sanity: -1, happiness: -2 },
        inventory: { water: 3 },
        log: { kind: "event_strange", message: "🌪️ An ash storm rolls through. You catch what melts off the windward stones. +3 water. The grit gets in everywhere." },
      },
    },
  },

  brokenPottery: {
    id: "brokenPottery", name: "Broken Pottery", trigger: "gather", weight: 3,
    requires: { era: 1 }, cooldownMs: 10 * 60 * 1000,
    flavor: "Your foot turns up an old, weathered shard.",
    onFire: {
      effects: {
        inventory: { stone: 8 },
        log: { kind: "event_good", message: "🏺 Old pottery. Beneath it, ground worked smooth — and useful stone, ready for the picking. +8 stone." },
      },
    },
  },

  packOfRats: {
    id: "packOfRats", name: "Pack of Rats", trigger: "interval", weight: 3,
    requires: { era: 1, hutBuilt: true }, cooldownMs: 16 * 60 * 1000,
    flavor: "Skittering inside the walls. Eyes catch the firelight.",
    onFire: {
      effects: {
        stats: { sanity: -1 },
        inventory: { food: -2 },
        log: { kind: "event_strange", message: "🐀 A pack of rats finds your stores. -2 grubs by the time you drive them out." },
      },
    },
  },

  windfall: {
    id: "windfall", name: "Windfall", trigger: "gather", weight: 3,
    requires: { era: 1 }, cooldownMs: 12 * 60 * 1000,
    flavor: "A dead tree groans and gives up.",
    onFire: {
      effects: {
        inventory: { wood: 10 },
        log: { kind: "event_good", message: "🪵 A dead tree falls upwind of you. You spend the afternoon dragging pieces home. +10 wood." },
      },
    },
  },

  strangerByFire: {
    id: "strangerByFire", name: "A Stranger by the Fire", trigger: "interval", weight: 3,
    requires: { era: 1, hasBuilding: "firepit" }, cooldownMs: 18 * 60 * 1000,
    flavor: "A stranger stops outside the firelight. They do not ask, but they look cold.",
    choices: [
      { id: "wave_in", label: "Wave them in", cost: { water: 1 }, missingMessage: "You have no water to share.",
        worldScoreDelta: 0.5,    // World Score (#29) — small kindness, small mark
        effect: {
          stats: { happiness: 3, sanity: 2 },
          alignment: { good: 1 },
          log: { kind: "event_good", message: "🔥 They sit by the fire, drink the water you give them, leave at first light. They don't say their name." },
        },
      },
      { id: "wave_off", label: "Wave them on",
        effect: {
          stats: { happiness: -1 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "You shake your head. They look at the fire a moment longer, then turn into the dark." },
        },
      },
    ],
  },

  whisperingDust: {
    id: "whisperingDust", name: "Whispering Dust", trigger: "interval", weight: 2,
    requires: { era: 1, rockAwakened: true }, cooldownMs: 14 * 60 * 1000,
    flavor: "The dust is talking. Quietly. In a voice you almost recognize.",
    onFire: {
      effects: {
        stats: { sanity: -2 },
        inventory: { fragments: 2 },
        log: { kind: "event_strange", message: "🌫️ The dust talks today. You don't want to listen. You listen anyway. +2 fragments fall out of the air." },
      },
    },
  },

  bonesInTheSand: {
    id: "bonesInTheSand", name: "Bones in the Sand", trigger: "gather", weight: 2,
    requires: { era: 1 }, cooldownMs: 16 * 60 * 1000,
    flavor: "You step on something that gives. Then crunches.",
    onFire: {
      effects: {
        stats: { sanity: -1 },
        inventory: { feathers: 3, stone: 2 },
        log: { kind: "event_strange", message: "💀 Old bones, half-buried. Feathers stuck in the ribs. You take what's useful and try not to look at the skull. +3 feathers, +2 stone." },
      },
    },
  },

  distantSinging: {
    id: "distantSinging", name: "Distant Singing", trigger: "interval", weight: 3,
    requires: { era: 1 }, cooldownMs: 12 * 60 * 1000,
    flavor: "A voice on the wind, very far off. Something like a song.",
    onFire: {
      effects: {
        stats: { sanity: 2, happiness: 3 },
        log: { kind: "event_good", message: "🎵 Someone is singing, very far away. You can't make out the words. You hum along for a while without meaning to." },
      },
    },
  },

  emptyGraves: {
    id: "emptyGraves", name: "Empty Graves", trigger: "interval", weight: 2,
    requires: { era: 1 }, cooldownMs: 24 * 60 * 1000,
    flavor: "You find a row of shallow mounds. Someone's been digging — or something's been crawling out.",
    choices: [
      { id: "dig", label: "Dig deeper",
        effect: {
          stats: { sanity: -3 },
          inventory: { stone: 8, fragments: 3 },
          alignment: { evil: 2 },
          log: { kind: "event_strange", message: "⚰️ You dig. You take stones and shards from the dirt. The graves were never sealed properly. +8 stone, +3 fragments." },
        },
      },
      { id: "respect", label: "Leave them alone",
        effect: {
          stats: { sanity: 2, happiness: 1 },
          alignment: { good: 2 },
          log: { kind: "event_good", message: "🪦 You leave them. There's enough taken from the world without you adding to it." },
        },
      },
    ],
  },

  theLastBird: {
    id: "theLastBird", name: "The Last Bird", trigger: "interval", weight: 2,
    requires: { era: 1 }, cooldownMs: 22 * 60 * 1000,
    flavor: "A bird passes overhead. Just one. You watch it until it's a dot.",
    onFire: {
      effects: {
        stats: { happiness: 2, sanity: 1 },
        inventory: { feathers: 2 },
        log: { kind: "event_good", message: "🪶 A bird passes overhead. Two feathers spiral down. The wasteland is wider than you knew, and emptier — but the bird went somewhere." },
      },
    },
  },

  // ============================================================
  // Era 2 — original NPC-hint set
  // ============================================================

  wandererHintHome: {
    id: "wandererHintHome", name: "A Wanderer at the Fire", trigger: "interval", weight: 4,
    requires: { era: 2, hasBuilding: "hut", notHasBuilding: "home" },
    cooldownMs: 8 * 60 * 1000,
    flavor: "A wanderer settles by your fire. She does not stay long.",
    onFire: {
      effects: {
        stats: { happiness: 2 },
        log: { kind: "event_good", message: "👤 A wanderer settles by your fire. She warms her hands, glances at the hut, and asks if you have a home of your own. She is gone before you answer." },
      },
    },
  },

  soldierHintWalls: {
    id: "soldierHintWalls", name: "An Old Soldier", trigger: "interval", weight: 4,
    requires: { era: 2, hasBuilding: "home", notHasBuilding: "walls" },
    cooldownMs: 8 * 60 * 1000,
    flavor: "An old soldier squints at the open ground.",
    onFire: {
      effects: {
        stats: { sanity: -1 },
        log: { kind: "event_strange", message: "🪖 An old soldier passes through. He glances at the open ground and says — quiet, not making a thing of it — 'A wall would help. Even a low one.' Then he is gone, and the wasteland feels wider than before." },
      },
    },
  },

  childHintSilo: {
    id: "childHintSilo", name: "A Child Asks About Stores", trigger: "interval", weight: 3,
    requires: { era: 2, hasBuilding: "home", notHasBuilding: "silo" },
    cooldownMs: 8 * 60 * 1000,
    flavor: "A child asks where you keep your stores.",
    onFire: {
      effects: {
        stats: { happiness: -1 },
        log: { kind: "event_strange", message: "🧒 A child asks where you keep your stores. You point at the dust. She doesn't laugh. Her face says enough." },
      },
    },
  },

  farmerHintFarmhouse: {
    id: "farmerHintFarmhouse", name: "A Farmer Passes", trigger: "interval", weight: 3,
    requires: { era: 2, hasBuilding: "garden", notHasBuilding: "farmhouse" },
    cooldownMs: 10 * 60 * 1000,
    flavor: "A farmer wanders by and looks at your garden.",
    onFire: {
      effects: {
        inventory: { food: 3 },
        stats: { happiness: 2, sanity: 1 },
        log: { kind: "event_good", message: "🧑‍🌾 A farmer wanders by, says nothing, but plants something with a calloused hand before going. The earth shifts. +3 grubs." },
      },
    },
  },

  // ============================================================
  // Era 2 — content drop (10 new)
  // ============================================================

  tradingCaravan: {
    id: "tradingCaravan", name: "A Trading Caravan", trigger: "interval", weight: 4,
    requires: { era: 2 }, cooldownMs: 18 * 60 * 1000,
    flavor: "A small caravan stops. They have water. You have wood. They are willing to talk.",
    choices: [
      { id: "trade_wood", label: "Trade 10 wood for 4 water", cost: { wood: 10 }, missingMessage: "You haven't enough wood to trade.",
        effect: {
          inventory: { water: 4 },
          stats: { happiness: 2 },
          log: { kind: "event_good", message: "🐪 The caravan-leader weighs the wood, nods, hands you a stoppered skin. +4 water." },
        },
      },
      { id: "trade_stone", label: "Trade 15 stone for 1 fragment", cost: { stone: 15 }, missingMessage: "You haven't enough stone to trade.",
        effect: {
          inventory: { fragments: 1 },
          stats: { sanity: -1 },
          log: { kind: "event_strange", message: "🐪 They take the stone. From a wrapped cloth they bring out a shard. It hums when your hand closes around it. +1 fragment." },
        },
      },
      { id: "wave_off", label: "Wave them on",
        effect: {
          stats: { happiness: -1 },
          log: { kind: "event_strange", message: "They nod once, move on. The dust settles back into the road they cut." },
        },
      },
    ],
  },

  bandits: {
    id: "bandits", name: "Bandits at the Wall", trigger: "interval", weight: 3,
    requires: { era: 2, hasBuilding: "home" }, cooldownMs: 25 * 60 * 1000,
    flavor: "Three figures stop short of the camp. They are armed, but only barely. They want a toll.",
    choices: [
      { id: "pay", label: "Pay the toll", cost: { food: 4, wood: 5 }, missingMessage: "You haven't enough to pay.",
        effect: {
          stats: { happiness: -2 },
          alignment: { good: 1 },
          log: { kind: "event_strange", message: "🪙 You hand them what they want. They leave. The dust settles. You stand watching the empty path for a long time." },
        },
      },
      { id: "fight", label: "Stand your ground",
        effect: {
          stats: { hp: -10, sanity: -2, happiness: -3 },
          inventory: { fragments: 2 },
          alignment: { evil: 2 },
          log: { kind: "event_strange", message: "⚔️ You meet them at the line. It is not glorious. When it is over, two of them are gone and one is running. +2 fragments fall from a torn pouch. The hands keep shaking for a while." },
        },
      },
    ],
  },

  firstFrost: {
    id: "firstFrost", name: "First Frost", trigger: "interval", weight: 2,
    requires: { era: 2 }, cooldownMs: 22 * 60 * 1000,
    flavor: "The ground crunches when you walk on it. The breath shows.",
    onFire: {
      effects: {
        stats: { sanity: -1, happiness: -1 },
        inventory: { water: 4, food: -2 },
        log: { kind: "event_strange", message: "❄️ The first frost. Two grubs don't survive the cold. The ice that forms on the stones melts into the bucket. +4 water, -2 grubs." },
      },
    },
  },

  harvestSong: {
    id: "harvestSong", name: "Harvest Song", trigger: "interval", weight: 4,
    requires: { era: 2, hasBuilding: "garden" }, cooldownMs: 14 * 60 * 1000,
    flavor: "A good day in the garden. Someone is singing again, but this time it is you.",
    onFire: {
      effects: {
        stats: { happiness: 4, sanity: 2 },
        inventory: { food: 3 },
        log: { kind: "event_good", message: "🎶 You find yourself humming over the rows. The garden is being kind today. +3 grubs without trying." },
      },
    },
  },

  wallInspection: {
    id: "wallInspection", name: "Walking the Wall", trigger: "interval", weight: 3,
    requires: { era: 2, hasBuilding: "walls" }, cooldownMs: 16 * 60 * 1000,
    flavor: "You walk the wall in the evening. The stones are warm from the sun.",
    onFire: {
      effects: {
        stats: { sanity: 3, happiness: 3 },
        log: { kind: "event_good", message: "🧱 You walk the wall in the evening. It is here. It is yours. It will not blow over in the night." },
      },
    },
  },

  roamingDog: {
    id: "roamingDog", name: "A Roaming Dog", trigger: "interval", weight: 3,
    requires: { era: 2 }, cooldownMs: 24 * 60 * 1000,
    flavor: "A skinny dog with a torn ear watches you from the brush.",
    choices: [
      { id: "feed", label: "Feed it", cost: { food: 2 }, missingMessage: "You have no food to spare.",
        effect: {
          stats: { happiness: 6, sanity: 3 },
          alignment: { good: 1 },
          log: { kind: "event_good", message: "🐕 You set out food. It eats fast, watches you a long time after, and curls up under the eaves. You feel something warm move in your chest." },
        },
      },
      { id: "send_off", label: "Send it on",
        effect: {
          stats: { happiness: -2 },
          log: { kind: "event_strange", message: "You wave it off. It goes. You look at the place it stood for a while afterward." },
        },
      },
    ],
  },

  smithApprentice: {
    id: "smithApprentice", name: "An Apprentice", trigger: "interval", weight: 2,
    requires: { era: 2, hasBuilding: "forge" }, cooldownMs: 22 * 60 * 1000,
    flavor: "A boy stands by the forge with his hands tucked under his arms. He wants to be taught.",
    choices: [
      { id: "teach", label: "Show him the basics",
        effect: {
          stats: { happiness: 4, sanity: 2, energy: -5 },
          alignment: { good: 2 },
          log: { kind: "event_good", message: "🔨 You show him how to hold the hammer. How to listen to the metal. He stays the afternoon. You teach more than you knew you knew." },
        },
      },
      { id: "refuse", label: "Send him away",
        effect: {
          stats: { happiness: -2 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "You shake your head. He goes. He doesn't ask twice." },
        },
      },
    ],
  },

  siloRaid: {
    id: "siloRaid", name: "Thieves at the Silo", trigger: "interval", weight: 2,
    requires: { era: 2, hasBuilding: "silo" }, cooldownMs: 26 * 60 * 1000,
    flavor: "Someone is at the silo door. You hear the wooden lid shift.",
    choices: [
      { id: "defend", label: "Defend it",
        effect: {
          stats: { hp: -5, sanity: -2 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "🛡️ You catch them at the lid. There is a brief, ugly fight. They run. -5 HP. The silo is yours, still." },
        },
      },
      { id: "let_take", label: "Let them take some",
        effect: {
          stats: { happiness: -2, sanity: 1 },
          inventory: { food: -5 },
          alignment: { good: 2 },
          log: { kind: "event_good", message: "🤲 You step back. They take an armful and run. -5 grubs. You sleep without trouble that night." },
        },
      },
    ],
  },

  strangeMerchant: {
    id: "strangeMerchant", name: "A Strange Merchant", trigger: "interval", weight: 3,
    requires: { era: 2 }, cooldownMs: 20 * 60 * 1000,
    flavor: "A man with a long coat opens a wooden box. Inside: things that catch the light wrong.",
    choices: [
      { id: "buy", label: "Buy a shard (3 food)", cost: { food: 3 }, missingMessage: "You haven't enough food to trade.",
        effect: {
          inventory: { fragments: 2 },
          stats: { sanity: -1 },
          log: { kind: "event_strange", message: "🎒 He nods slowly, takes the food, presses two shards into your hand. They are cooler than they should be. +2 fragments." },
        },
      },
      { id: "decline", label: "Decline",
        effect: {
          stats: { sanity: 1 },
          log: { kind: "event_good", message: "You shake your head. He smiles like he expected it, closes the box. The box is gone before you can ask where he keeps it." },
        },
      },
    ],
  },

  villageMessenger: {
    id: "villageMessenger", name: "A Messenger Passes", trigger: "interval", weight: 2,
    requires: { era: 2 }, cooldownMs: 24 * 60 * 1000,
    flavor: "A runner stops at the wall, breathless, and shares the news.",
    onFire: {
      effects: {
        stats: { happiness: 2, sanity: 2 },
        log: { kind: "event_good", message: "🏃 A messenger from somewhere else stops, drinks, and tells you names of places you do not know. People are still alive elsewhere. You knew, but it is good to hear." },
      },
    },
  },

  // ============================================================
  // Era 3 — original alignment-gated set
  // ============================================================

  benevolentPilgrim: {
    id: "benevolentPilgrim", name: "A Benevolent Pilgrim", trigger: "interval", weight: 4,
    requires: { era: 3, alignment: { good: 3 } }, cooldownMs: 20 * 60 * 1000,
    flavor: "A pilgrim arrives. They know your face the way a stranger should not.",
    choices: [
      { id: "welcome", label: "Welcome them", cost: { food: 3, water: 2 }, missingMessage: "You haven't enough to share.",
        worldScoreDelta: 1,      // World Score (#29) — Era 3 pilgrim, bigger mark
        effect: {
          stats: { happiness: 6, sanity: 4, spirit: 5 },
          alignment: { good: 2 },
          log: { kind: "event_good", message: "🙏 You share what you have. The pilgrim eats slow, blesses the fire, and is gone before morning. Something in the room is warmer." },
        },
      },
      { id: "turn_away", label: "Send them on",
        effect: {
          stats: { happiness: -3, sanity: -1 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "You shake your head. They look at you for a moment, then go. The fire goes a little colder." },
        },
      },
    ],
  },

  bitterScholar: {
    id: "bitterScholar", name: "A Bitter Scholar", trigger: "interval", weight: 4,
    requires: { era: 3, alignment: { evil: 3 } }, cooldownMs: 20 * 60 * 1000,
    flavor: "A man with stained hands and clever eyes asks if he might sit by your fire. He has a book bound in something thin.",
    choices: [
      { id: "listen", label: "Hear him out",
        effect: {
          inventory: { fragments: 3 },
          stats: { sanity: -4, spirit: 8 },
          alignment: { evil: 2 },
          log: { kind: "event_strange", message: "📖 He shows you a page. The diagrams move when you don't look at them. +3 fragments. Something in you sharpens. Something else dulls." },
        },
      },
      { id: "refuse", label: "Refuse him",
        effect: {
          stats: { happiness: 2, sanity: 2 },
          alignment: { good: 1 },
          log: { kind: "event_good", message: "You shake your head. He smiles, closes the book, leaves. You breathe out for a long time." },
        },
      },
    ],
  },

  // ============================================================
  // Era 3 — content drop (10 new)
  // ============================================================

  dreamOfTheStone: {
    id: "dreamOfTheStone", name: "Dream of the Stone", trigger: "interval", weight: 4,
    requires: { era: 3 }, cooldownMs: 18 * 60 * 1000,
    flavor: "You dream of the stone. It is younger, and the world around it has trees.",
    onFire: {
      effects: {
        stats: { sanity: 3, spirit: 5, happiness: 2 },
        log: { kind: "event_good", message: "💭 You dream of the stone when it was new — green leaves and a road and a person carrying it. You wake calmer than you have been in weeks." },
      },
    },
  },

  fragmentsHum: {
    id: "fragmentsHum", name: "The Shards Hum", trigger: "interval", weight: 3,
    requires: { era: 3 }, cooldownMs: 16 * 60 * 1000,
    flavor: "The Arcane Shards in your pack are humming louder tonight. The humming wants to be listened to.",
    choices: [
      { id: "listen", label: "Listen",
        effect: {
          stats: { spirit: 10, sanity: -4 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "✨ You put your ear close. The humming pours into you. +10 spirit. -4 sanity. You don't know what you heard. You only know you understood it." },
        },
      },
      { id: "resist", label: "Resist",
        effect: {
          stats: { sanity: 3, happiness: 2 },
          alignment: { good: 1 },
          log: { kind: "event_good", message: "You wrap the shards in cloth and sleep in the next room. The humming stops, or you stop hearing it." },
        },
      },
    ],
  },

  theCensingMan: {
    id: "theCensingMan", name: "The Censing Man", trigger: "interval", weight: 2,
    requires: { era: 3 }, cooldownMs: 25 * 60 * 1000,
    flavor: "A man with a smoking censer arrives. He is selling, or asking, or both. The smoke goes the wrong way.",
    choices: [
      { id: "trade", label: "Trade 3 fragments for arcane gear", cost: { fragments: 3 }, missingMessage: "You haven't enough fragments.",
        effect: {
          inventory: { feathers: 5, stone: 10 },
          stats: { spirit: 5 },
          log: { kind: "event_good", message: "🕴️ He nods, swings the censer twice, and sets feathers and a handful of strange stones on the ground. +5 feathers, +10 stone. The smoke smells like rain." },
        },
      },
      { id: "decline", label: "Decline",
        effect: {
          stats: { sanity: 1 },
          log: { kind: "event_good", message: "You shake your head. He inclines his head, swings the censer once, and is gone. The smoke lingers a long time." },
        },
      },
    ],
  },

  mirroredPool: {
    id: "mirroredPool", name: "The Mirrored Pool", trigger: "gather", weight: 2,
    requires: { era: 3 }, cooldownMs: 18 * 60 * 1000,
    flavor: "A puddle that reflects the wrong sky.",
    onFire: {
      effects: {
        stats: { sanity: -2, spirit: 3 },
        inventory: { fragments: 2, water: 3 },
        log: { kind: "event_strange", message: "🪞 A pool reflects a sky that is not yours. You drink anyway. +3 water. +2 fragments at the bottom, smooth as worn glass." },
      },
    },
  },

  whisperingBlade: {
    id: "whisperingBlade", name: "The Whispering Blade", trigger: "interval", weight: 2,
    requires: { era: 3, hasBuilding: "alembic" }, cooldownMs: 22 * 60 * 1000,
    flavor: "Something in the workshop is dreaming of being sharper.",
    onFire: {
      effects: {
        stats: { spirit: 3, sanity: -2 },
        log: { kind: "event_strange", message: "🔪 The Alembic stops working for a moment, and in the quiet, you hear something humming in your toolkit. You put it back down without looking at which tool. +3 spirit. -2 sanity." },
      },
    },
  },

  omenOfWings: {
    id: "omenOfWings", name: "Omen of Wings", trigger: "interval", weight: 2,
    requires: { era: 3 }, cooldownMs: 24 * 60 * 1000,
    flavor: "Birds in the sky, arranged in a pattern they should not be capable of.",
    onFire: {
      effects: {
        stats: { sanity: 2, spirit: 2, happiness: 1 },
        inventory: { fragments: 3, feathers: 2 },
        log: { kind: "event_good", message: "🕊️ The birds wheel in a ring. The ring holds for too long. When it breaks, shards fall with the feathers. +3 fragments, +2 feathers." },
      },
    },
  },

  pilgrimReturns: {
    id: "pilgrimReturns", name: "The Pilgrim Returns", trigger: "interval", weight: 3,
    requires: { era: 3, alignment: { good: 5 } }, cooldownMs: 30 * 60 * 1000,
    flavor: "The pilgrim who came before is at the door again. She is older than when she left.",
    onFire: {
      effects: {
        stats: { happiness: 6, sanity: 5, spirit: 5 },
        inventory: { fragments: 2 },
        log: { kind: "event_good", message: "🙏 She returns. She does not stay. She presses two shards into your palm and tells you to keep going. You do. +2 fragments." },
      },
    },
  },

  scholarReturns: {
    id: "scholarReturns", name: "The Scholar Returns", trigger: "interval", weight: 3,
    requires: { era: 3, alignment: { evil: 5 } }, cooldownMs: 30 * 60 * 1000,
    flavor: "The scholar is at the fire again. The book is thicker than it was.",
    onFire: {
      effects: {
        stats: { sanity: -5, spirit: 10 },
        inventory: { fragments: 4 },
        alignment: { evil: 2 },
        log: { kind: "event_strange", message: "📖 He opens the book. There are pages now that there cannot be. You read with him. +4 fragments. +10 spirit. You don't ask where he goes after." },
      },
    },
  },

  midnightChant: {
    id: "midnightChant", name: "Midnight Chant", trigger: "interval", weight: 3,
    requires: { era: 3 }, cooldownMs: 22 * 60 * 1000,
    flavor: "A chant is rising somewhere west of the camp. It is in a language you almost know.",
    choices: [
      { id: "join", label: "Join in",
        effect: {
          stats: { spirit: 8, sanity: -3, happiness: -2 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "🕯️ You match the syllables. The chant goes on far longer than you can. When it ends, you can't remember the words. +8 spirit." },
        },
      },
      { id: "cover_ears", label: "Cover your ears",
        effect: {
          stats: { sanity: 2, happiness: 2 },
          alignment: { good: 1 },
          log: { kind: "event_good", message: "You stuff cloth in your ears and wait it out. The morning comes. The chanting does not." },
        },
      },
    ],
  },

  theWalkingDoubt: {
    id: "theWalkingDoubt", name: "The Walking Doubt", trigger: "interval", weight: 1,
    requires: { era: 3 }, cooldownMs: 35 * 60 * 1000,
    flavor: "You see yourself on the horizon. Walking the wrong way.",
    choices: [
      { id: "follow", label: "Walk toward it",
        effect: {
          stats: { sanity: -8, spirit: 5 },
          inventory: { fragments: 5 },
          alignment: { evil: 2 },
          log: { kind: "event_strange", message: "👤 You walk toward yourself. You meet in the middle. The other you presses five shards into your hand and walks past, into the camp you just left. +5 fragments. You don't sleep that night." },
        },
      },
      { id: "look_away", label: "Look away",
        effect: {
          stats: { sanity: 4, happiness: 2 },
          alignment: { good: 1 },
          log: { kind: "event_good", message: "You close your eyes and count. When you open them, the horizon is empty. You go back to work. The work is what holds." },
        },
      },
    ],
  },

  // ============================================================
  // #188 — Population events (wanderers + losses)
  // ============================================================

  wandererArrival: {
    id: "wandererArrival", name: "A Wanderer Arrives", trigger: "interval", weight: 4,
    requires: { era: 1, hasBuilding: "hut" }, cooldownMs: 8 * 60 * 1000,
    flavor: "A figure on the road, asking nothing, eyes on the dust.",
    onFire: {
      effects: {
        population: 1,
        populationReason: "a wanderer joined the settlement",
        stats: { happiness: 2 },
        log: { kind: "event_good", message: "🚶 A wanderer reaches your fire. They ask only for a place to sit. Tomorrow they pick up a shovel." },
      },
    },
  },

  refugeeFamily: {
    id: "refugeeFamily", name: "Refugee Family", trigger: "interval", weight: 2,
    requires: { era: 2, hasBuilding: "home" }, cooldownMs: 20 * 60 * 1000,
    flavor: "Three at the gate. Tired. The youngest has not slept in days.",
    choices: [
      { id: "take_in", label: "Take them in",
        effect: {
          population: 3,
          populationReason: "took in a refugee family",
          stats: { food: 0, happiness: 4, sanity: 2 },
          inventory: { food: -5, water: -3 },
          alignment: { good: 2 },
          log: { kind: "event_good", message: "🏘️ You take them in. They have nothing — they bring less. By the third week they bring more." },
        },
      },
      { id: "turn_away", label: "Turn them away",
        effect: {
          stats: { sanity: -3, happiness: -2 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "🏘️ You turn them away. The youngest is the one you cannot stop seeing in your sleep." },
        },
      },
    ],
  },

  villagerLost: {
    id: "villagerLost", name: "Villager Lost", trigger: "interval", weight: 2,
    requires: { era: 1, hasBuilding: "hut" }, cooldownMs: 25 * 60 * 1000,
    flavor: "Someone left for water and did not come back.",
    onFire: {
      effects: {
        population: -1,
        populationReason: "wandered into the wastes and did not return",
        stats: { sanity: -3, happiness: -2 },
        log: { kind: "event_strange", message: "🕯️ The dust holds onto the ones who walk too far. The settlement is one quieter tonight." },
      },
    },
  },

  plagueOutbreak: {
    id: "plagueOutbreak", name: "Plague Outbreak", trigger: "interval", weight: 1,
    requires: { era: 2 }, cooldownMs: 45 * 60 * 1000,
    flavor: "A coughing that doesn't stop. The wells taste wrong.",
    choices: [
      { id: "quarantine", label: "Quarantine the sick",
        effect: {
          population: -1,
          populationReason: "lost to plague (quarantined the rest)",
          stats: { sanity: -2 },
          inventory: { water_boiled: -5 },
          log: { kind: "event_strange", message: "🤒 You wall off the sick. One does not make it. The rest do." },
        },
      },
      { id: "let_run", label: "Let it run",
        effect: {
          population: -3,
          populationReason: "lost to plague",
          stats: { sanity: -5, happiness: -4 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "💀 You do nothing. The cough takes three. The fourth wakes coughing." },
        },
      },
    ],
  },

  villagerSeeksFortune: {
    id: "villagerSeeksFortune", name: "Villager Seeks Fortune", trigger: "interval", weight: 2,
    requires: { era: 2, hasBuilding: "home" }, cooldownMs: 20 * 60 * 1000,
    flavor: "One of the villagers has been looking at the road too long.",
    choices: [
      { id: "blessing", label: "Send them off with a blessing",
        effect: {
          population: -1,
          populationReason: "left to seek their fortune",
          inventory: { food: -3, water: -2 },
          stats: { sanity: 1, happiness: 1 },
          alignment: { good: 1 },
          log: { kind: "event_good", message: "🌅 They take a pack and a kind word. The settlement is smaller, but you sleep well." },
        },
      },
      { id: "force_stay", label: "Make them stay",
        effect: {
          stats: { sanity: -2, happiness: -3 },
          alignment: { evil: 2 },
          log: { kind: "event_strange", message: "⛓️ They stay. They will not look you in the eye after." },
        },
      },
    ],
  },

  travelingCaravan: {
    id: "travelingCaravan", name: "Traveling Caravan", trigger: "interval", weight: 2,
    requires: { era: 2, hasBuilding: "home" }, cooldownMs: 30 * 60 * 1000,
    flavor: "Wagon-wheels on the road. Two carts. Five people. The lead driver tips their hat.",
    onFire: {
      effects: {
        population: 2,
        populationReason: "the caravan stayed",
        inventory: { food: 4, tarnished_coin: 3 },
        stats: { happiness: 3 },
        log: { kind: "event_good", message: "🐎 The caravan parks at the edge of the settlement. Two of them never get back on the cart. The rest leave with thanks." },
      },
    },
  },

  // ============================================================
  // #190 — Settlement raids
  // ============================================================

  banditRaid: {
    id: "banditRaid", name: "Bandit Raid", trigger: "interval", weight: 3,
    requires: { era: 2, hasBuilding: "home" }, cooldownMs: 25 * 60 * 1000,
    flavor: "Men on horses on the road, looking for what they can take.",
    onFire: {
      effects: {
        raid: { sweepFraction: 0.6, stealResource: { id: "food", amount: 15 }, killVillagers: 1 },
        stats: { sanity: -3, happiness: -3 },
        log: { kind: "alert", message: "⚔️ Bandits hit the settlement. They take what isn't nailed down." },
      },
    },
  },

  carrionCrew: {
    id: "carrionCrew", name: "Carrion Crew", trigger: "interval", weight: 2,
    requires: { era: 2, hasBuilding: "cottage" }, cooldownMs: 35 * 60 * 1000,
    flavor: "Scavengers who work in numbers. They smell weakness.",
    onFire: {
      effects: {
        raid: { sweepFraction: 0.5, stealResource: { id: "tarnished_coin", amount: 5 }, damageBuilding: { count: 1 } },
        stats: { sanity: -2 },
        log: { kind: "alert", message: "🦅 A carrion crew swarms in. Coin and lumber both go missing." },
      },
    },
  },

  cultistVisit: {
    id: "cultistVisit", name: "Cultists Come Calling", trigger: "interval", weight: 2,
    requires: { era: 3, hasBuilding: "stoneAltar" }, cooldownMs: 40 * 60 * 1000,
    flavor: "Robed strangers ask after the stone. They are not asking.",
    choices: [
      { id: "refuse", label: "Refuse them",
        effect: {
          raid: { sweepFraction: 0.7, killVillagers: 2, damageBuilding: { count: 1 } },
          stats: { sanity: -5, happiness: -3 },
          alignment: { good: 1 },
          log: { kind: "alert", message: "🕯️ You refuse them. They take what they came for, the slow way." },
        },
      },
      { id: "appease", label: "Give them fragments",
        effect: {
          inventory: { fragments: -10 },
          stats: { sanity: -2 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "🕯️ You hand over the fragments. They thank you in a language you do not know." },
        },
      },
    ],
  },

  demonIncursion: {
    id: "demonIncursion", name: "Demon Incursion", trigger: "interval", weight: 1,
    requires: { era: 3, hasBuilding: "stoneAltar" }, cooldownMs: 60 * 60 * 1000,
    flavor: "The wards crack. Something steps through.",
    onFire: {
      effects: {
        raid: { sweepFraction: 0.95, killVillagers: 3, damageBuilding: { count: 2 }, stealResource: { id: "fragments", amount: 8 } },
        stats: { sanity: -8, happiness: -5 },
        alignment: { evil: 1 },
        log: { kind: "alert", message: "👹 A demon steps from a thinning. By the time it goes back through, the settlement is smaller." },
      },
    },
  },

  plagueCaravan: {
    id: "plagueCaravan", name: "Plague Caravan", trigger: "interval", weight: 2,
    requires: { era: 3, hasBuilding: "marketplace" }, cooldownMs: 35 * 60 * 1000,
    flavor: "A caravan limps in. The lead driver coughs into a rag the wrong color.",
    choices: [
      { id: "turn_back", label: "Turn them back",
        effect: {
          stats: { sanity: -2, happiness: -1 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "🚫 You turn the caravan away. The wagon wheels squeal as they recede." },
        },
      },
      { id: "trade", label: "Trade with them anyway",
        effect: {
          inventory: { tarnished_coin: 10, food: 5 },
          raid: { sweepFraction: 0.3, killVillagers: 2 },
          stats: { sanity: -3 },
          log: { kind: "alert", message: "🤝 You trade. The coin is good. The cough spreads through the settlement by week's end." },
        },
      },
    ],
  },

  // ============================================================
  // #201 — NPC trading caravans
  // ============================================================

  wanderingTinker: {
    id: "wanderingTinker", name: "Wandering Tinker", trigger: "interval", weight: 3,
    requires: { era: 1, hasBuilding: "hut" }, cooldownMs: 12 * 60 * 1000,
    flavor: "A small cart at the road's bend. Pots dangle from the awning. The tinker waves you over.",
    choices: [
      { id: "trade_wood", label: "Trade 10 wood for 1 hide",
        effect: {
          inventory: { wood: -10, hide: 1 },
          stats: { sanity: 1 },
          log: { kind: "event_good", message: "🛒 The tinker stacks the wood and hands over a folded hide. Even trade." },
        },
      },
      { id: "trade_stone", label: "Trade 15 stone for 1 sinew",
        effect: {
          inventory: { stone: -15, sinew: 1 },
          stats: { sanity: 1 },
          log: { kind: "event_good", message: "🛒 The tinker hefts the stone bag and tosses you a length of sinew. Done." },
        },
      },
      { id: "wave_off", label: "Wave them on",
        effect: {
          log: { kind: "event_strange", message: "🛒 They roll on without complaint. The cart squeaks all the way out of earshot." },
        },
      },
    ],
  },

  saltCaravan: {
    id: "saltCaravan", name: "Salt Caravan", trigger: "interval", weight: 2,
    requires: { era: 2, hasBuilding: "cottage" }, cooldownMs: 25 * 60 * 1000,
    flavor: "Four pack-mules. A driver who counts your buildings as they speak.",
    choices: [
      { id: "buy_salt", label: "Buy 5 salt for 6 tarnished coin",
        effect: {
          inventory: { tarnished_coin: -6, salt_crystal: 5 },
          log: { kind: "event_good", message: "🛒 You take the salt. The driver counts the coins twice." },
        },
      },
      { id: "sell_iron", label: "Sell 3 iron for 8 tarnished coin",
        effect: {
          inventory: { iron: -3, tarnished_coin: 8 },
          log: { kind: "event_good", message: "🛒 They take the iron and the wagon sits lower as they leave. Coins in hand." },
        },
      },
      { id: "refuse", label: "Refuse",
        effect: {
          log: { kind: "event_strange", message: "🛒 They tip a hat and keep walking. The mules follow." },
        },
      },
    ],
  },

  pilgrimCaravan: {
    id: "pilgrimCaravan", name: "Pilgrim Caravan", trigger: "interval", weight: 1,
    requires: { era: 3, hasBuilding: "stoneAltar" }, cooldownMs: 35 * 60 * 1000,
    flavor: "Robed travelers, eyes too still. They ask after the stone, then after the altar. They carry odd weight.",
    choices: [
      { id: "buy_fragments", label: "Trade 4 coin for 2 fragments",
        effect: {
          inventory: { tarnished_coin: -4, fragments: 2 },
          stats: { sanity: -1 },
          log: { kind: "event_strange", message: "🛒 The pilgrim hands you the fragments. They hum lightly against your palm." },
        },
      },
      { id: "buy_runes", label: "Trade 8 coin + 3 fragments for a Splinter Rune",
        effect: {
          inventory: { tarnished_coin: -8, fragments: -3, splinterRune: 1 },
          stats: { sanity: -2 },
          alignment: { evil: 1 },
          log: { kind: "event_strange", message: "🛒 The rune comes warm and dark. The pilgrim walks off humming a phrase you almost remember." },
        },
      },
      { id: "wave_off", label: "Wave them on",
        effect: {
          stats: { sanity: 2 },
          alignment: { good: 1 },
          log: { kind: "event_good", message: "🛒 You let them pass. The sound of their humming fades, then stops." },
        },
      },
    ],
  },

  taintedOutriders: {
    id: "taintedOutriders", name: "Tainted Outriders", trigger: "interval", weight: 4,
    requires: { era: 4 }, cooldownMs: 18 * 60 * 1000,
    flavor: "Riders at the perimeter, faces wrong somehow.",
    onFire: {
      effects: {
        raid: { sweepFraction: 0.95, damageBuilding: { count: 1 } },
        stats: { sanity: -2 },
        log: { kind: "alert", message: "🩸 Tainted Outriders sweep the settlement." },
      },
    },
  },

  quietCensus: {
    id: "quietCensus", name: "The Quiet Census", trigger: "interval", weight: 2,
    requires: { era: 4 }, cooldownMs: 30 * 60 * 1000,
    flavor: "A figure with a ledger walks the streets at dusk.",
    choices: [
      { id: "refuse_count", label: "Refuse them entry",
        effect: {
          stats: { sanity: -3 },
          alignment: { good: 1 },
          log: { kind: "event_strange", message: "🚫 You bar the gate." },
        },
      },
      { id: "let_count", label: "Let them count",
        effect: {
          population: -2,
          populationReason: "taken by The Quiet Census",
          stats: { sanity: -5 },
          alignment: { evil: 1 },
          log: { kind: "alert", message: "📋 By dawn, two villagers are gone." },
        },
      },
    ],
  },

  buildingTaint: {
    id: "buildingTaint", name: "Something Lives in the Walls", trigger: "interval", weight: 1,
    requires: { era: 4, hasBuilding: "aetherFoundry" }, cooldownMs: 45 * 60 * 1000,
    flavor: "Your foreman comes to you. The Aether Foundry's hum has changed pitch.",
    onFire: {
      effects: {
        taintBuilding: { count: 1 },
        stats: { sanity: -3 },
        log: { kind: "alert", message: "🦠 A building has been tainted. Cleanse at the Stone Altar (5 fragments)." },
      },
    },
  },

};

export const getEvent = (id) => EVENTS[id] || null;
export const getAllEvents = () => Object.values(EVENTS);
