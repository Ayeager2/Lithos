// Equipment inventory grid (#45) — top-tabbed item grid + equip/unequip UI.
//
// Lives inside CharacterView as the bottom-of-page inventory surface. As a
// result the standalone "Inventory" left-rail tab retires — Character is
// the new canonical "look at me + my stuff + my gear" page.
//
// Top tabs (filters):
//   All / Weapons / Defense / Herbs / Magic / Tools / Crafting / Other
//
// Each tab renders the player's inventory entries (run.inventory) as
// cards. Cards know how to surface the right actions for the item kind:
//   • Pure weapons + dual-use weapons → "Equip → L / R / Ranged / Both"
//   • Armor (future)                  → "Equip → <slot>"
//   • Consumables (potions)           → "Use" (dispatches USE_TOOL)
//   • Resources                       → display only (count + cap)
//
// Tooltip comparison (#46) is a separate task — this file just shows
// stats inline on the card. The hover-compare popover lives in #46.

import { useState, useMemo } from "react";
import {
  getResource,
  getInventoryItem,
  isResourceHidden,
} from "../content/resources.js";
import { getTool } from "../content/tools.js";
import { getWeapon } from "../content/weapons.js";
import {
  SLOTS,
  HAND_SLOTS,
  RING_COUNT,
  getEquippable,
  canEquip,
} from "../systems/equipment.js";
import { getCapStatus } from "../systems/storage.js";
import { canUseTool } from "../systems/consumables.js";

// ─── Category routing ────────────────────────────────────────────────
//
// Categorize each inventory entry into one of the grid's top tabs. Pure
// data lookup — no state required. Items can match multiple categories
// in theory (e.g. a dual-use weapon is both a weapon and a tool), but we
// route by the strongest tag so each item lives in exactly one place.
// "All" shows everything regardless.

const CATEGORIES = [
  { id: "all",     label: "All",      icon: "🗂️" },
  { id: "weapons", label: "Weapons",  icon: "⚔️" },
  { id: "defense", label: "Defense",  icon: "🛡️" },
  { id: "magic",   label: "Magic",    icon: "✨" },
  { id: "tools",   label: "Tools",    icon: "🔨" },
  { id: "crafting",label: "Crafting", icon: "🪨" },
  { id: "herbs",   label: "Herbs",    icon: "🌿" },
  { id: "other",   label: "Other",    icon: "📦" },
];

// Decide which category bucket an item def falls into. Weapons take
// priority — a dual-use Stone Axe routes here as a weapon even though
// it's also a tool. Filters then mean "show me equippables" reads true.
function categorize(def, item) {
  if (!def) return "other";
  if (def.weaponStats) return "weapons";
  if (def.armorStats) return "defense";
  // Magic-flavored items: arcane fragments, scrolls/ink (craftMaterial
  // gated by altarWork), potions, anything with category "arcane".
  if (def.id === "fragments") return "magic";
  if (def.category === "craftMaterial") return "magic";
  if (def.category === "arcane") return "magic";
  if (def.consumable) return "magic"; // potions live here
  // Future herbs (Combat Phase 4 / #35) — none authored yet but the
  // filter is here so the bucket exists.
  if (def.category === "herb" || def.id === "herbs" || def.id === "mushrooms") {
    return "herbs";
  }
  // Non-weapon tools — Net, Snare, Digging Stick, Water Skin, Spirit
  // Censer, Warding Talisman. Anything with durability that isn't a
  // weapon falls here.
  if (item?.kind === "tool" && !def.weaponStats) return "tools";
  // Crafting materials — wood, stone, feathers, future iron_ore + coal.
  if (def.category === "materials") return "crafting";
  // Food, drink, miscellaneous.
  return "other";
}

// ─── Single item card ────────────────────────────────────────────────

function EquipButtons({ state, actions, def, equipped }) {
  // Returns a small row of action buttons specific to the item type.
  // canEquip handles "do you own one" gating; we only show buttons whose
  // target slots make sense for this item type.
  const id = def.id;
  const t = def.weaponStats?.type;

  // Already equipped somewhere? Show a small status chip instead of
  // equip buttons. Multiple slots can hold the same id (e.g. you crafted
  // two Stone Spears) — we show the FIRST slot we find.
  const equippedSlots = [];
  for (const s of [
    SLOTS.HAND_LEFT, SLOTS.HAND_RIGHT, SLOTS.RANGED,
    SLOTS.HEAD, SLOTS.CHEST, SLOTS.LEGGINGS, SLOTS.BOOTS, SLOTS.GLOVES,
    SLOTS.BACK, SLOTS.OVER_ARMOR, SLOTS.TALISMAN,
  ]) {
    if (equipped?.[s]?.id === id) equippedSlots.push(s);
  }
  // Rings live in an array — count how many slots hold this id.
  const ringCount = (equipped?.rings || []).filter((r) => r?.id === id).length;

  // Inventory count vs equipped count. If you own 2 Stone Maces and one
  // is in your right hand, the card still offers to equip the OTHER one
  // into your left hand.
  const owned = state.run.inventory?.[id] || 0;
  const slotsHolding = equippedSlots.length + ringCount;
  const sparesAvailable = owned - slotsHolding;

  // No spares left to equip — show only the "equipped" status chips.
  if (sparesAvailable <= 0) {
    if (equippedSlots.length === 0 && ringCount === 0) {
      // Edge case: owned 0 — shouldn't happen since the parent filtered
      // qty>0, but render nothing rather than a broken state.
      return null;
    }
    return (
      <div className="ei-card-equipped">
        {equippedSlots.map((s) => (
          <span key={s} className="ei-equipped-chip" title={`Equipped: ${s}`}>
            equipped: {prettySlot(s)}
          </span>
        ))}
        {ringCount > 0 && (
          <span className="ei-equipped-chip">
            on {ringCount} ring{ringCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }

  const buttons = [];

  // Weapons — type drives slot routing.
  if (t === "melee") {
    for (const slot of HAND_SLOTS) {
      const check = canEquip(state, id, slot);
      // For the spare-available case, canEquip should be ok — but if the
      // target slot already holds this same id (two of the same), the
      // button label changes to indicate that.
      const slotHolds = equipped?.[slot]?.id === id;
      buttons.push(
        <button
          key={slot}
          type="button"
          className="btn btn-secondary btn-tiny"
          onClick={() => actions.equip(id, slot)}
          disabled={!check.ok || slotHolds}
          title={
            slotHolds
              ? "Already in this slot — equip a spare to the other hand."
              : check.ok
              ? `Equip into ${prettySlot(slot)}`
              : check.reason
          }
        >
          → {slot === SLOTS.HAND_LEFT ? "L" : "R"}
        </button>
      );
    }
  } else if (t === "ranged") {
    const check = canEquip(state, id, SLOTS.RANGED);
    buttons.push(
      <button
        key={SLOTS.RANGED}
        type="button"
        className="btn btn-secondary btn-tiny"
        onClick={() => actions.equip(id, SLOTS.RANGED)}
        disabled={!check.ok}
        title={check.ok ? "Equip into ranged (back)" : check.reason}
      >
        → Ranged
      </button>
    );
  } else if (t === "two-handed") {
    const check = canEquip(state, id, SLOTS.HAND_LEFT);
    buttons.push(
      <button
        key="2h"
        type="button"
        className="btn btn-secondary btn-tiny"
        onClick={() => actions.equip(id, SLOTS.HAND_LEFT)}
        disabled={!check.ok}
        title={check.ok ? "Equip — takes both hands" : check.reason}
      >
        → Both hands
      </button>
    );
  }

  // Armor pieces (future, post-#36) carry armorStats.slot. Until that
  // ships, this branch never fires — keeping the code path live so #36
  // can light it up without a refactor.
  if (def.armorStats?.slot) {
    const slot = def.armorStats.slot;
    const check = canEquip(state, id, slot);
    buttons.push(
      <button
        key={slot}
        type="button"
        className="btn btn-secondary btn-tiny"
        onClick={() => actions.equip(id, slot)}
        disabled={!check.ok}
        title={check.ok ? `Equip → ${prettySlot(slot)}` : check.reason}
      >
        → {prettySlot(slot)}
      </button>
    );
  }

  // Rings (also future-flagged via def.equipAsRing — placeholder for
  // when ring content lands).
  if (def.equipAsRing) {
    // Auto-equip to first empty ring slot. Player can move rings around
    // in the accessory tray later.
    const firstEmpty = (equipped?.rings || []).findIndex((r) => !r);
    if (firstEmpty >= 0 && firstEmpty < RING_COUNT) {
      buttons.push(
        <button
          key="ring"
          type="button"
          className="btn btn-secondary btn-tiny"
          onClick={() => actions.equipRing(id, firstEmpty)}
          title={`Equip into ring slot ${firstEmpty + 1}`}
        >
          → Ring {firstEmpty + 1}
        </button>
      );
    }
  }

  // Consumables — Use button. Bypasses the slot system entirely.
  if (def.consumable) {
    const check = canUseTool(state, id);
    buttons.push(
      <button
        key="use"
        type="button"
        className="btn btn-secondary btn-tiny"
        onClick={() => actions.useTool(id)}
        disabled={!check.ok}
        title={check.ok ? "Use one" : check.reason}
      >
        Use
      </button>
    );
  }

  // Show the equipped status alongside the equip buttons if some copies
  // are already wielded (e.g. left-hand equipped, one spare in pack).
  return (
    <div className="ei-card-actions">
      {(equippedSlots.length > 0 || ringCount > 0) && (
        <div className="ei-card-equipped">
          {equippedSlots.map((s) => (
            <span key={s} className="ei-equipped-chip" title={`Equipped: ${s}`}>
              in {prettySlot(s)}
            </span>
          ))}
          {ringCount > 0 && (
            <span className="ei-equipped-chip">
              on {ringCount} ring{ringCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
      {buttons.length > 0 && (
        <div className="ei-card-buttons">{buttons}</div>
      )}
    </div>
  );
}

function prettySlot(s) {
  switch (s) {
    case SLOTS.HAND_LEFT: return "Left hand";
    case SLOTS.HAND_RIGHT: return "Right hand";
    case SLOTS.RANGED: return "Ranged";
    case SLOTS.HEAD: return "Head";
    case SLOTS.CHEST: return "Chest";
    case SLOTS.LEGGINGS: return "Legs";
    case SLOTS.BOOTS: return "Boots";
    case SLOTS.GLOVES: return "Gloves";
    case SLOTS.BACK: return "Back";
    case SLOTS.OVER_ARMOR: return "Over-armor";
    case SLOTS.TALISMAN: return "Talisman";
    default: return s;
  }
}

function ItemCard({ state, actions, entry }) {
  const { id, qty, displayed, real, kind, cap, durability } = entry;
  // For a hidden resource the displayed name/icon is "???". canEquip etc.
  // can still work — but the card hides equip actions for hidden items
  // (the player doesn't know what it is yet, can't act on it).
  const equipped = state.run.equipped || {};
  const hidden = entry.hidden;

  // Cap status label — same color convention as InventoryPanel.
  const capChip =
    cap?.status === "uncapped"
      ? `${qty}`
      : `${qty} / ${cap.cap}`;

  // Durability — only show for tools/weapons that have durability defs.
  const durBar = durability ? (
    <div
      className="ei-card-dur"
      title={`Durability ${durability.current} / ${durability.max}`}
    >
      <div
        className="ei-card-dur-fill"
        style={{ width: `${(durability.current / durability.max) * 100}%` }}
      />
    </div>
  ) : null;

  // For pure-resource entries (no def or no equippable shape), we just
  // show the count. No actions row.
  const def = real;
  const showActions =
    !hidden &&
    !!def &&
    (def.weaponStats || def.armorStats || def.consumable || def.equipAsRing);

  return (
    <div className={`ei-card ${hidden ? "ei-card--hidden" : ""}`}>
      <div className="ei-card-header">
        <span className="ei-card-icon" aria-hidden="true">
          {displayed.icon}
        </span>
        <span className="ei-card-name">{displayed.name}</span>
        <span
          className={`ei-card-qty ${
            cap?.status === "full" ? "qty--full" : cap?.status === "warn" ? "qty--warn" : ""
          }`}
        >
          {capChip}
        </span>
      </div>
      {/* Weapon stats — chip layout (#103). Each stat sits in its own
          rounded chip with an icon prefix so the row stops looking
          smooshed. Wraps naturally on narrow cards. */}
      {def?.weaponStats && (
        <div className="ei-card-stats">
          {def.weaponStats.damage && (
            <span className="ei-stat-chip" title="Damage range">
              <span aria-hidden="true">⚔️</span>{" "}
              {def.weaponStats.damage[0]}–{def.weaponStats.damage[1]}
            </span>
          )}
          {def.weaponStats.acc != null && (
            <span className="ei-stat-chip" title="Attack accuracy">
              <span aria-hidden="true">🎯</span>{" "}
              {Math.round(def.weaponStats.acc * 100)}%
            </span>
          )}
          {def.weaponStats.crit != null && def.weaponStats.crit > 0 && (
            <span className="ei-stat-chip" title="Critical hit chance">
              <span aria-hidden="true">✨</span>{" "}
              {Math.round(def.weaponStats.crit * 100)}%
            </span>
          )}
        </div>
      )}
      {def?.description && (
        <div className="ei-card-desc muted">{def.description}</div>
      )}
      {durBar}
      {showActions && (
        <EquipButtons
          state={state}
          actions={actions}
          def={def}
          equipped={equipped}
        />
      )}
    </div>
  );
}

// ─── Main grid ───────────────────────────────────────────────────────

export default function EquipmentInventoryGrid({ state, actions }) {
  const [activeTab, setActiveTab] = useState("all");

  // Build the list of inventory entries with everything the cards need.
  const entries = useMemo(() => {
    const inv = state.run.inventory || {};
    const dur = state.run.toolDurability || {};
    const list = [];
    for (const [id, qty] of Object.entries(inv)) {
      if (qty <= 0) continue;
      // First try resource lookup, then tools, then weapons. getInventoryItem
      // handles resources + tool aliasing already; weapons need their own
      // path since they aren't in tools.js.
      const resourceDef = getResource(id);
      const toolDef = getTool(id);
      const weaponDef = getWeapon(id);
      const def = resourceDef || toolDef || weaponDef;
      if (!def) continue;
      const kind = resourceDef ? "resource" : (weaponDef ? "weapon" : "tool");
      const item = resourceDef
        ? getInventoryItem(state, id)
        : { kind, id, raw: def, displayed: { ...def, _displayCategory: "tool" } };
      if (!item) continue;
      // Hidden resources (e.g. pre-arcaneAwakening fragments) display
      // as "???". Cards still render — they just don't expose actions.
      const hidden = resourceDef ? isResourceHidden(state, resourceDef) : false;
      const cap = resourceDef
        ? getCapStatus(state, id)
        : { status: "uncapped" };
      const durMax = def.durability?.max;
      const durCurrent = typeof dur[id] === "number" ? dur[id] : durMax;
      const durability =
        durMax != null
          ? { max: durMax, current: durCurrent ?? durMax }
          : null;
      list.push({
        id,
        qty,
        displayed: item.displayed,
        real: def,
        kind,
        cap,
        durability,
        hidden,
      });
    }
    // Stable ordering: equippables first (player wants to find weapons
    // quickly), then everything else alphabetical by name.
    list.sort((a, b) => {
      const aEq = a.real?.weaponStats || a.real?.armorStats ? 0 : 1;
      const bEq = b.real?.weaponStats || b.real?.armorStats ? 0 : 1;
      if (aEq !== bEq) return aEq - bEq;
      return (a.displayed.name || "").localeCompare(b.displayed.name || "");
    });
    return list;
  }, [state.run.inventory, state.run.toolDurability, state.persistent.permanentlyKnown, state.run.researched]);

  // Per-tab counts (small badges in the tab strip).
  const counts = useMemo(() => {
    const c = { all: entries.length };
    for (const cat of CATEGORIES) c[cat.id] = 0;
    c.all = entries.length;
    for (const e of entries) {
      const id = categorize(e.real, e);
      c[id] = (c[id] || 0) + 1;
    }
    return c;
  }, [entries]);

  // Filter to the active tab.
  const visible = useMemo(() => {
    if (activeTab === "all") return entries;
    return entries.filter((e) => categorize(e.real, e) === activeTab);
  }, [entries, activeTab]);

  return (
    <div className="ei-grid">
      <div className="ei-tabs" role="tablist" aria-label="Inventory category">
        {CATEGORIES.map((c) => {
          const n = counts[c.id] || 0;
          const empty = n === 0 && c.id !== "all";
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={activeTab === c.id}
              className={`ei-tab ${activeTab === c.id ? "is-active" : ""} ${empty ? "is-empty" : ""}`}
              onClick={() => setActiveTab(c.id)}
              title={`${c.label} (${n})`}
            >
              <span className="ei-tab-icon" aria-hidden="true">{c.icon}</span>
              <span className="ei-tab-label">{c.label}</span>
              {n > 0 && c.id !== "all" && (
                <span className="ei-tab-count muted">{n}</span>
              )}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="ei-empty muted">
          {activeTab === "all"
            ? "Nothing in your pack yet."
            : `Nothing in ${
                CATEGORIES.find((c) => c.id === activeTab)?.label ?? activeTab
              } yet.`}
        </div>
      ) : (
        <div className="ei-cards">
          {visible.map((e) => (
            <ItemCard key={e.id} state={state} actions={actions} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
