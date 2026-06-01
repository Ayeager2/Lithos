// Left rail — vertical icon nav. Each icon either swaps the center
// column view (most) or triggers a modal directly (Buildings tree,
// Challenges boss fight; refactor pending to inline those too).
//
// The rail is split into two groups by a thin divider:
//   • TOP: view switcher (World / Character / Crafting) — always visible
//   • BOTTOM: content tabs (Arcane / Buildings / Studies / Challenges) —
//             each visible when its content has something meaningful to
//             show. The old Inventory tab retired with #45 and Skills
//             retired with the #54 hub refactor — both now live as
//             sections on the Character page.
//
// No more lc-content panel — every icon either changes the center view or
// pops a modal. Blurbs that used to be the panel's lead text are now
// tooltip `title` attributes on the rail buttons.

import {
  getKnownBuildings,
  getAvailableBuildings,
} from "../systems/building.js";
import { getKnownSpells } from "../systems/spells.js";
import { getStartableStudies } from "../systems/studies.js";
import { getBossesAvailable } from "../content/bosses.js";

export default function LeftColumn({
  state,
  view,
  setView,
  views,
  onOpenBuildings,
  onOpenBossFight,
}) {
  // Visibility of each tab.
  // Inventory + Skills tabs retired — both surface on the Character page.
  const knownSpells = getKnownSpells(state);
  const arcaneVisible = knownSpells.length > 0;
  const buildings = getKnownBuildings(state);
  const buildingsVisible = buildings.length > 0;
  const studiesVisible = !!state.run.built?.stoneAltar;
  const startableStudies = studiesVisible ? getStartableStudies(state) : [];
  const bossesAvailable = getBossesAvailable(state);
  const challengesVisible = bossesAvailable.length > 0;
  const challengesActionable = bossesAvailable.filter(
    (b) => !state.persistent.bossesDefeated?.[b.id]
  ).length;

  // Actionable counts (badges).
  const buildingsActionable = getAvailableBuildings(state).length;
  const studiesActionable = startableStudies.length;

  // Tab descriptors. Each has either `viewId` (swaps view) or `onClick`
  // (triggers a modal directly).
  const tabs = [
    {
      id: "arcane",
      icon: "✨",
      label: "Arcane",
      tip: "What the Stone teaches when you listen long enough.",
      visible: arcaneVisible,
      actionable: 0,
      viewId: "arcane",
    },
    {
      id: "buildings",
      icon: "🏛️",
      label: "Buildings",
      tip: "What you raise from the dust. Pan and zoom the tree.",
      visible: buildingsVisible,
      actionable: buildingsActionable,
      onClick: onOpenBuildings,
    },
    {
      id: "studies",
      icon: "🕯️",
      label: "Studies",
      tip: "Sit at the altar. Real lessons take time. The clock pauses when you act.",
      visible: studiesVisible,
      actionable: studiesActionable,
      viewId: "studies",
    },
    {
      id: "challenges",
      icon: "⚔️",
      label: "Challenges",
      tip: "Foes who came looking for you. Death does not reset the run.",
      visible: challengesVisible,
      actionable: challengesActionable,
      onClick: onOpenBossFight,
    },
  ].filter((t) => t.visible);

  return (
    <div className="left-col">
      <div className="lc-rail" role="tablist" aria-label="Navigation rail">
        {/* View switcher (#43) — top of the rail. Controls the CENTER
            column. Divider separates from content tabs below. */}
        {views && setView && (
          <>
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                className={`lc-rail-btn lc-rail-btn--view ${view === v.id ? "is-active" : ""}`}
                onClick={() => setView(v.id)}
                title={`View: ${v.label}`}
              >
                <span className="lc-rail-icon" aria-hidden="true">
                  {v.icon}
                </span>
                <span className="lc-rail-label">{v.label}</span>
              </button>
            ))}
            <div className="lc-rail-divider" aria-hidden="true" />
          </>
        )}
        {/* Content tabs — each click either swaps view or opens a modal. */}
        {tabs.map((t) => {
          const isView = !!t.viewId;
          const active = isView && view === t.viewId;
          const handleClick = isView ? () => setView(t.viewId) : t.onClick;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`lc-rail-btn ${active ? "is-active" : ""}`}
              onClick={handleClick}
              title={
                t.actionable > 0
                  ? `${t.label} — ${t.actionable} available\n\n${t.tip}`
                  : `${t.label}\n\n${t.tip}`
              }
            >
              <span className="lc-rail-icon" aria-hidden="true">
                {t.icon}
              </span>
              <span className="lc-rail-label">{t.label}</span>
              {t.actionable > 0 && (
                <span
                  className="lc-rail-badge"
                  aria-label={`${t.actionable} actionable`}
                >
                  {t.actionable}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
