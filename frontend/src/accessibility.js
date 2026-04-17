export const COLOR_BLIND_STORAGE_KEY = "fintrack_color_blind_v1";

export function loadColorBlindMode() {
  try {
    return (localStorage.getItem(COLOR_BLIND_STORAGE_KEY) || "") === "on";
  } catch {
    return false;
  }
}

export function applyColorBlindMode(enabled) {
  const root = document.documentElement;
  if (enabled) {
    // Colour-blind friendly: blue/orange/yellow.
    root.style.setProperty("--positive", "59 130 246"); // blue-500
    root.style.setProperty("--negative", "249 115 22"); // orange-500
    root.style.setProperty("--warning", "234 179 8"); // amber-500
  } else {
    // Default: green/red/amber.
    root.style.setProperty("--positive", "79 209 165"); // close to accent-green
    root.style.setProperty("--negative", "248 113 113"); // red-400
    root.style.setProperty("--warning", "245 158 11"); // amber-500-ish
  }
}

export function saveColorBlindMode(enabled) {
  localStorage.setItem(COLOR_BLIND_STORAGE_KEY, enabled ? "on" : "off");
  try {
    window.dispatchEvent(new Event("fintrack_accessibility_updated"));
  } catch {
    // ignore
  }
}

