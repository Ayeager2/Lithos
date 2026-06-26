// Body & Mind stat bars, shown in the action panel once survival is active.
import { SURVIVAL } from "../content/survival.js";
import { getDefense } from "../systems/threats.js";
import { getHousingCap } from "../systems/town.js";
import { computeEra } from "../systems/era.js";

const STAT_TIPS = {
  hunger: "Hunger — rises over time and from heavy work. High hunger drains HP. Eat to bring it back down.",
  thirst: "Thirst — rises faster than hunger. High thirst drains HP. Drink water (boiled is safest).",
  energy: "Energy — depleted by gather / build / fight actions. Low energy slows you. Rest to restore.",
  hp: "HP — your body. Drops from combat, dysentery, starvation, sanity collapse. At 0 you fall (death-debuff applies; the run does not reset).",
  resolve: "Resolve — your willpower. Drops from setbacks. Low Resolve dims most action gains. Some spells trade it for power.",
  sanity: "Sanity — your grip. Damaged by demons, the void, the wrong words. At 0 the world stops making sense for a while.",
  spirit: "Spirit — magical energy (Era 3+). Spent casting spells. Refills slowly; the Ritual action converts fragments to Spirit.",
  defense: "Defense — settlement protection. Reduces damage to your buildings during raids and food theft. Does NOT reduce personal combat damage — that's armor.",
};

function Bar({ label, value, dangerHigh, dangerLow, icon, kind = "default", tooltip }) {
  const v = Math.round(value);
  let state = "ok";
  if (dangerHigh != null && v >= dangerHigh) state = "danger";
  else if (dangerHigh != null && v >= dangerHigh - 15) state = "warn";
  if (dangerLow != null && v <= dangerLow) state = "danger";
  else if (dangerLow != null && v <= dangerLow + 10 && state === "ok") state = "warn";

  return (
    <div
      className={`sb-bar sb-bar--${state} sb-bar--${kind}`}
      title={tooltip || undefined}
    >
      <div className="sb-bar-label">
        <span className="sb-bar-icon" aria-hidden="true">{icon}</span>
        <span className="sb-bar-name">{label}</span>
        <span className="sb-bar-value">{v}</span>
      </div>
      <div className="sb-bar-track">
        <div className="sb-bar-fill" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export default function SurvivalBars({ state }) {
  const stats = state?.run?.stats;
  if (!stats) return null;
  const defense = getDefense(state);
  const era = computeEra(state);
  const showSpirit = era >= 3;

  return (
    <div className="survival-bars">
      <div className="sb-section">
        <div className="sb-section-title">Body</div>
        <Bar label="Hunger" value={stats.hunger ?? 0} dangerHigh={SURVIVAL.penalties.hungerHigh} icon="🍽️" tooltip={STAT_TIPS.hunger} />
        <Bar label="Thirst" value={stats.thirst ?? 0} dangerHigh={SURVIVAL.penalties.thirstHigh} icon="💧" tooltip={STAT_TIPS.thirst} />
        <Bar label="Energy" value={stats.energy ?? 100} dangerLow={SURVIVAL.penalties.energyLow} icon="⚡" tooltip={STAT_TIPS.energy} />
        <Bar label="HP" value={stats.hp ?? 100} dangerLow={20} icon="❤️" kind="hp" tooltip={STAT_TIPS.hp} />
      </div>

      <div className="sb-section">
        <div className="sb-section-title">Mind</div>
        <Bar label="Resolve" value={stats.happiness ?? 50} dangerLow={25} icon="✦" kind="resolve" tooltip={STAT_TIPS.resolve} />
        <Bar label="Sanity" value={stats.sanity ?? 50} dangerLow={25} icon="◐" kind="sanity" tooltip={STAT_TIPS.sanity} />
        {showSpirit && (
          <Bar label="Spirit" value={stats.spirit ?? 50} dangerLow={15} icon="✨" kind="spirit" tooltip={STAT_TIPS.spirit} />
        )}
      </div>

      <div className="sb-defense" title={STAT_TIPS.defense}>
        <span className="sb-defense-icon" aria-hidden="true">🛡️</span>
        <span className="sb-defense-name">Defense</span>
        <span className="sb-defense-value">{defense}</span>
      </div>

      {(() => {
        const pop = state?.run?.population ?? 0;
        const cap = getHousingCap(state);
        if (cap === 0 && pop === 0) return null;
        const atCap = pop >= cap;
        return (
          <div
            className="sb-defense"
            title={atCap
              ? "Population at housing cap. Build more shelter to grow."
              : "Population — grows slowly when food / water / sanity allow."}
          >
            <span className="sb-defense-icon" aria-hidden="true">🏠</span>
            <span className="sb-defense-name">Population</span>
            <span className="sb-defense-value">{pop} / {cap}</span>
          </div>
        );
      })()}
    </div>
  );
}
