import { useEffect, useMemo, useState } from "react";
import { getProgress } from "./api";
import { applyTheme, THEMES } from "./theme";
import {
  REWARD_TRACK,
  computeUnlockedKeysForLevel,
  loadRewardsState,
  saveRewardsState,
} from "./rewards";

function clamp01(x) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function RewardPill({ unlocked, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
        unlocked ? "bg-zinc-900/50 border-accent-green/50 text-accent-green" : "bg-zinc-900/30 border-zinc-800 text-zinc-500"
      }`}
    >
      <span aria-hidden>{unlocked ? "✓" : "🔒"}</span>
      {label}
    </span>
  );
}

function RewardCard({ reward, unlocked, isSelected, onSelect }) {
  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={onSelect}
      className={`text-left w-full p-4 rounded-xl border transition-colors ${
        unlocked
          ? isSelected
            ? "bg-zinc-900/80 border-accent"
            : "bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900/80"
          : "bg-zinc-900/30 border-zinc-800 opacity-70 cursor-not-allowed"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{reward.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Level {reward.level} · {reward.type === "theme" ? "Theme" : "Title"}
          </p>
        </div>
        <RewardPill unlocked={unlocked} label={unlocked ? "Unlocked" : "Locked"} />
      </div>
      {reward.type === "theme" && THEMES[reward.key] && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-full border border-zinc-700"
            style={{ backgroundColor: `rgb(${THEMES[reward.key].accent})` }}
            aria-hidden
          />
          <span className="text-xs text-zinc-500">Preview accent</span>
        </div>
      )}
      {unlocked && isSelected && (
        <p className="text-xs text-accent mt-2">Selected</p>
      )}
    </button>
  );
}

export default function Rewards() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [state, setState] = useState(() => loadRewardsState());

  useEffect(() => {
    getProgress()
      .then(setProgress)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const xp = progress?.xp ?? 0;
  const level = progress?.level ?? 1;
  const xpInLevel = xp % 100;
  const xpToNext = 100 - xpInLevel;
  const pct = clamp01(xpInLevel / 100);

  const unlockedByLevel = useMemo(() => new Set(computeUnlockedKeysForLevel(level)), [level]);

  // Auto-unlock anything newly earned.
  useEffect(() => {
    const nextUnlocked = new Set([...(state.unlockedKeys || [])]);
    let changed = false;
    for (const k of unlockedByLevel) {
      if (!nextUnlocked.has(k)) {
        nextUnlocked.add(k);
        changed = true;
      }
    }
    if (!changed) return;
    const next = { ...state, unlockedKeys: Array.from(nextUnlocked) };
    setState(next);
    saveRewardsState(next);
  }, [unlockedByLevel]); // intentionally not depending on state to avoid loops

  function isUnlocked(key) {
    return unlockedByLevel.has(key) || (state.unlockedKeys || []).includes(key);
  }

  function selectTheme(key) {
    if (!isUnlocked(key)) return;
    applyTheme(key);
    const next = { ...state, selectedThemeKey: key };
    setState(next);
    saveRewardsState(next);
  }

  function selectTitle(key) {
    if (!isUnlocked(key)) return;
    const next = { ...state, selectedTitleKey: key };
    setState(next);
    saveRewardsState(next);
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;
  if (error) return <p className="text-red-400" role="alert">{error}</p>;
  if (!progress) return null;

  return (
    <section aria-label="Rewards" className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-medium text-zinc-300">Rewards</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Earn XP by logging transactions, setting budgets, and chatting with FinBot.
          </p>
        </div>
        {state.selectedTitleKey && (
          <span className="text-xs text-zinc-400">
            Title: <span className="text-zinc-200 font-medium">{REWARD_TRACK.find((r) => r.key === state.selectedTitleKey)?.name || state.selectedTitleKey}</span>
          </span>
        )}
      </div>

      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex justify-between items-center mb-2">
          <span className="text-zinc-400">Level {level}</span>
          <span className="text-accent font-semibold">{xp} XP</span>
        </div>
        <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          {xpToNext} XP to level {level + 1}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-300">Themes</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {REWARD_TRACK.filter((r) => r.type === "theme").map((r) => (
              <RewardCard
                key={r.key}
                reward={r}
                unlocked={isUnlocked(r.key)}
                isSelected={state.selectedThemeKey === r.key}
                onSelect={() => selectTheme(r.key)}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Themes are cosmetic and saved on this device only.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-300">Titles</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {REWARD_TRACK.filter((r) => r.type === "title").map((r) => (
              <RewardCard
                key={r.key}
                reward={r}
                unlocked={isUnlocked(r.key)}
                isSelected={state.selectedTitleKey === r.key}
                onSelect={() => selectTitle(r.key)}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Titles appear in the Rewards tab (and can be added elsewhere later).
          </p>
        </div>
      </div>
    </section>
  );
}

