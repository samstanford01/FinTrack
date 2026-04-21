import { useState, useEffect } from "react";
import { getProgress } from "./api";

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Achievements() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProgress()
      .then(setProgress)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-zinc-500">Loading…</p>;
  if (error) return <p className="text-red-400" role="alert">{error}</p>;
  if (!progress) return null;

  const { xp, level, achievements } = progress;
  const xpInCurrentLevel = xp % 100;
  const xpForNextLevel = 100;

  return (
    <section aria-label="Achievements" className="space-y-6">
      <h2 className="text-lg font-medium text-zinc-300">Achievements</h2>

      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 max-w-md">
        <div className="flex justify-between items-center mb-2">
          <span className="text-zinc-400">Level {level}</span>
          <span className="text-accent font-semibold">{xp} XP</span>
        </div>
        <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${(xpInCurrentLevel / xpForNextLevel) * 100}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          {xpForNextLevel - xpInCurrentLevel} XP to level {level + 1}
        </p>
      </div>

      <div>
        <h3 className="text-md font-medium text-zinc-300 mb-3">Badges</h3>
        <ul className="space-y-3">
          {achievements.map((a) => (
            <li
              key={a.key}
              className={`flex items-center gap-4 p-3 rounded-lg border ${
                a.unlocked_at ? "bg-zinc-900/50 border-accent-green/50" : "bg-zinc-900/30 border-zinc-800"
              }`}
            >
              <span
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  a.unlocked_at ? "bg-accent-green/20 text-accent-green" : "bg-zinc-800 text-zinc-500"
                }`}
                aria-hidden
              >
                {a.unlocked_at ? "✓" : "?"}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-zinc-200">{a.name}</p>
                <p className="text-sm text-zinc-500">{a.description}</p>
                {a.unlocked_at && (
                  <p className="text-xs text-accent-green mt-0.5">
                    Unlocked {formatDate(a.unlocked_at)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
