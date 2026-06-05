import { useEffect, useState } from "react";
import DevPanel, { useDevPanelToggle, isDevAvailable } from "./DevPanel.jsx";
import Scene from "./Scene.jsx";
import ActionPanel from "./ActionPanel.jsx";
import CharacterView from "./CharacterView.jsx";
import CraftingView from "./CraftingView.jsx";
import ArcaneView from "./ArcaneView.jsx";
import StudiesView from "./StudiesView.jsx";
import LeftColumn from "./LeftColumn.jsx";
import StonePanel from "./StonePanel.jsx";
import RightColumn from "./RightColumn.jsx";
import ActionStrip from "./ActionStrip.jsx";
import TeachingsTreeModal from "./TeachingsTreeModal.jsx";
import BuildingsTreeModal from "./BuildingsTreeModal.jsx";
import StudyTreeModal from "./StudyTreeModal.jsx";
import ToolsModal from "./ToolsModal.jsx";
import SpellsModal from "./SpellsModal.jsx";
import BossFightModal from "./BossFightModal.jsx";
import EventModal from "./EventModal.jsx";
import SettingsModal from "./SettingsModal.jsx";
import SettingsTrigger from "./SettingsTrigger.jsx";
import PrestigeModal from "./PrestigeModal.jsx";
import PrestigeShop from "./PrestigeShop.jsx";
import { getPrestigeReward } from "../systems/prestige.js";
import { computeEra, getEra } from "../systems/era.js";

// View states (#43) — the center column swaps between these. Everything
// else (header, Scene, LeftColumn, RightColumn, StonePanel, ActionStrip)
// stays mounted across all views. New views: just add a case here and an
// entry in the VIEWS list below.
const VIEWS = [
  { id: "world", icon: "🌍", label: "World" },
  { id: "character", icon: "👤", label: "Character" },
  { id: "crafting", icon: "🛠️", label: "Crafting" },
];

// Right-panel mode — left panel is rail-only now (no lc-content),
// so only the right column keeps its off-canvas behavior.
//   "grid"    — panel sits in the grid (default; full width visible)
//   "closed"  — panel hidden; a tab button is rendered on the viewport edge
//   "overlay" — panel pulled out as a position-fixed overlay over the center
// Persisted to localStorage so "I want this collapsed" survives reloads.
// "overlay" is ephemeral — degrades to "closed" on reload.
const RIGHT_KEY = "lithos.rightPanelMode";
function loadPanelMode(key) {
  try {
    const v = localStorage.getItem(key);
    if (v === "closed" || v === "grid") return v;
  } catch (_) { /* localStorage unavailable */ }
  return "grid";
}

export default function Shell({ state, actions, settingsHook }) {
  const [view, setView] = useState("world");
  const [rightMode, setRightMode] = useState(() => loadPanelMode(RIGHT_KEY));
  useEffect(() => {
    try {
      const persist = rightMode === "overlay" ? "closed" : rightMode;
      localStorage.setItem(RIGHT_KEY, persist);
    } catch (_) { /* ignore */ }
  }, [rightMode]);

  const [teachingsOpen, setTeachingsOpen] = useState(false);
  const [buildingsOpen, setBuildingsOpen] = useState(false);
  const [studyTreeOpen, setStudyTreeOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [spellsOpen, setSpellsOpen] = useState(false);
  const [bossFight, setBossFight] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prestigeOpen, setPrestigeOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [devOpen, setDevOpen] = useDevPanelToggle(settingsHook.settings);
  const devAvailable = isDevAvailable(settingsHook.settings);

  // Patrol boss encounter (#66) — when the patrol roll picks a knowledge-
  // gated boss, performPatrol stamps run.patrolBossEncounter with the
  // boss id. We auto-open the BossFightModal here and clear the stamp via
  // devPatch so it doesn't re-fire on every render.
  const patrolBossId = state.run.patrolBossEncounter;
  useEffect(() => {
    if (!patrolBossId) return;
    setBossFight({ initialBossId: patrolBossId });
    actions.devPatch({
      run: { ...state.run, patrolBossEncounter: null },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patrolBossId]);

  const era = computeEra(state);
  const eraInfo = getEra(state);
  const prestigeUnlocked = era >= 2;
  const reward = getPrestigeReward(state);
  const showEchoes = prestigeUnlocked || state.persistent.echoes > 0;
  const eligibleForPrestige = prestigeUnlocked && reward.eligible;

  const handleResetClick = () => setPrestigeOpen(true);
  const handleConfirmReset = () => {
    if (eligibleForPrestige) actions.prestige();
    else actions.resetRun();
  };

  return (
    <div className="shell">
      <header className="shell-header">
        <h1>Lithos</h1>
        <div className="shell-meta">
          {era > 0 && <span className="meta-item meta-era">{eraInfo.name}</span>}
          {showEchoes && (
            <button
              className="meta-item meta-item--echoes"
              onClick={() => setShopOpen(true)}
              title="Open the Echo Shop"
              type="button"
            >
              🌀 Echoes: {state.persistent.echoes}
            </button>
          )}
        </div>
      </header>

      <Scene state={state} />

      <div
        className={`shell-grid ${rightMode !== "grid" ? "right-collapsed" : ""}`}
      >
        {/* Left side. Rail-only — no lc-content. Each rail icon either
            swaps the center view or opens a modal (Buildings tree,
            Challenges boss). */}
        <aside className="shell-area shell-area--left">
          <LeftColumn
            state={state}
            view={view}
            setView={setView}
            views={VIEWS}
            onOpenBuildings={() => setBuildingsOpen(true)}
            onOpenBossFight={() => setBossFight({ initialBossId: null })}
          />
        </aside>

        <main className={`shell-area shell-area--center shell-area--view-${view}`}>
          {view === "world" && <ActionPanel state={state} />}
          {view === "character" && <CharacterView state={state} actions={actions} />}
          {view === "crafting" && <CraftingView state={state} />}
          {view === "arcane" && <ArcaneView state={state} actions={actions} />}
          {view === "studies" && (
            <StudiesView
              state={state}
              actions={actions}
              onOpenStudyTree={() => setStudyTreeOpen(true)}
            />
          )}
        </main>

        <aside
          className={`shell-area shell-area--right mode-${rightMode}`}
        >
          {rightMode !== "closed" && (
            <RightColumn
              state={state}
              onClose={() => setRightMode("closed")}
              overlayMode={rightMode === "overlay"}
            />
          )}
        </aside>

        {rightMode === "closed" && (
          <button
            type="button"
            className="panel-edge-tab panel-edge-tab--right"
            onClick={() => setRightMode("overlay")}
            title="Show right panel"
            aria-label="Show right panel"
          >
            ‹
          </button>
        )}
      </div>

      <StonePanel
        state={state}
        onListen={() => setTeachingsOpen(true)}
        channelEligible={eligibleForPrestige}
        channelReward={reward}
        onChannel={handleResetClick}
      />

      <ActionStrip
        state={state}
        actions={actions}
        settings={settingsHook.settings}
        settingsHook={settingsHook}
        prestigeEligible={eligibleForPrestige}
        showResetButton={true}
        onReset={handleResetClick}
      />

      {teachingsOpen && (
        <TeachingsTreeModal
          state={state}
          actions={actions}
          onClose={() => setTeachingsOpen(false)}
        />
      )}

      {buildingsOpen && (
        <BuildingsTreeModal
          state={state}
          actions={actions}
          onClose={() => setBuildingsOpen(false)}
        />
      )}

      {studyTreeOpen && (
        <StudyTreeModal
          state={state}
          actions={actions}
          onClose={() => setStudyTreeOpen(false)}
        />
      )}

      {toolsOpen && (
        <ToolsModal
          state={state}
          actions={actions}
          onClose={() => setToolsOpen(false)}
        />
      )}

      {spellsOpen && (
        <SpellsModal
          state={state}
          actions={actions}
          onClose={() => setSpellsOpen(false)}
        />
      )}

      {bossFight && (
        <BossFightModal
          state={state}
          actions={actions}
          initialBossId={bossFight.initialBossId}
          onClose={() => setBossFight(null)}
        />
      )}

      <EventModal state={state} actions={actions} />

      <SettingsTrigger onOpen={() => setSettingsOpen(true)} />

      {devAvailable && (
        <button
          className="dev-floating-btn"
          onClick={() => setDevOpen(true)}
          title="Open dev panel (Ctrl+Shift+D)"
          type="button"
        >
          🛠️
        </button>
      )}

      {devOpen && (
        <DevPanel
          state={state}
          actions={actions}
          onClose={() => setDevOpen(false)}
        />
      )}

      {prestigeOpen && (
        <PrestigeModal
          mode={eligibleForPrestige ? "prestige" : "reset"}
          reward={reward}
          echoes={state.persistent.echoes}
          onConfirm={handleConfirmReset}
          onOpenShop={() => {
            setPrestigeOpen(false);
            setShopOpen(true);
          }}
          onClose={() => setPrestigeOpen(false)}
        />
      )}

      {shopOpen && (
        <PrestigeShop
          state={state}
          actions={actions}
          onClose={() => setShopOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settingsHook.settings}
          update={settingsHook.update}
          state={state}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
