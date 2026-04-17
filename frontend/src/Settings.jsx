import { useEffect, useState } from "react";
import { applyTextSize, loadTextSize, saveTextSize } from "./settings";
import { applyColorBlindMode, loadColorBlindMode, saveColorBlindMode } from "./accessibility";

const OPTIONS = [
  { id: "sm", label: "Small", scaleLabel: "95%" },
  { id: "md", label: "Medium", scaleLabel: "100%" },
  { id: "lg", label: "Large", scaleLabel: "115%" },
];

export default function Settings() {
  const [textSize, setTextSize] = useState(() => loadTextSize());
  const [colorBlind, setColorBlind] = useState(() => loadColorBlindMode());

  useEffect(() => {
    const onUpdate = () => setTextSize(loadTextSize());
    window.addEventListener("fintrack_text_size_updated", onUpdate);
    return () => window.removeEventListener("fintrack_text_size_updated", onUpdate);
  }, []);

  useEffect(() => {
    const onUpdate = () => setColorBlind(loadColorBlindMode());
    window.addEventListener("fintrack_accessibility_updated", onUpdate);
    return () => window.removeEventListener("fintrack_accessibility_updated", onUpdate);
  }, []);

  function setSize(next) {
    setTextSize(next);
    applyTextSize(next);
    saveTextSize(next);
  }

  function toggleColorBlind(next) {
    setColorBlind(next);
    applyColorBlindMode(next);
    saveColorBlindMode(next);
  }

  return (
    <section aria-label="Settings" className="space-y-6">
      <h2 className="text-lg font-medium text-zinc-300">Settings</h2>

      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 max-w-xl space-y-4">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">Text size</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Adjust the app’s text size for readability. This is saved on this device.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
          {OPTIONS.map((opt) => {
            const active = textSize === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSize(opt.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-accent text-white" : "text-zinc-300 hover:bg-zinc-800"
                }`}
                aria-pressed={active}
              >
                {opt.label} <span className="text-xs opacity-80">({opt.scaleLabel})</span>
              </button>
            );
          })}
        </div>

        <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800">
          <p className="text-zinc-300">
            Preview: Track your spending, set budgets, and build healthier money habits.
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            Tip: You can also zoom the page in your browser.
          </p>
        </div>

        <div className="pt-2 border-t border-zinc-800 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-zinc-200">Colour blind mode</h3>
              <p className="text-sm text-zinc-500 mt-1">
                Uses a colour-blind friendly palette and reduces red/green reliance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleColorBlind(!colorBlind)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                colorBlind ? "bg-accent border-accent/60" : "bg-zinc-800 border-zinc-700"
              }`}
              role="switch"
              aria-checked={colorBlind}
              aria-label="Toggle colour blind mode"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  colorBlind ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-zinc-400">Preview:</span>
            <span className="font-medium text-positive">Income ↑ £120.00</span>
            <span className="font-medium text-negative">Spent ↓ £45.00</span>
          </div>
        </div>
      </div>
    </section>
  );
}

