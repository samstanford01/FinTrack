export const REWARDS_STORAGE_KEY = "fintrack_unlocked_rewards_v1";

// Static reward track. Cosmetic-only: themes + titles.
// Level numbers correspond to backend level logic: level = 1 + xp // 100.
export const REWARD_TRACK = [
  { level: 2, type: "theme", key: "neonMint", name: "Neon Mint" },
  { level: 3, type: "title", key: "budgetRookie", name: "Budget Rookie" },
  { level: 5, type: "theme", key: "sunset", name: "Sunset Glow" },
  { level: 7, type: "title", key: "saver", name: "Saver" },
  { level: 10, type: "theme", key: "monoGold", name: "Mono Gold" },
  { level: 15, type: "title", key: "finTechPro", name: "FinTech Pro" },
];

export function loadRewardsState() {
  try {
    const raw = localStorage.getItem(REWARDS_STORAGE_KEY);
    if (!raw) return { unlockedKeys: [], selectedThemeKey: null, selectedTitleKey: null };
    const parsed = JSON.parse(raw);
    return {
      unlockedKeys: Array.isArray(parsed.unlockedKeys) ? parsed.unlockedKeys : [],
      selectedThemeKey: typeof parsed.selectedThemeKey === "string" ? parsed.selectedThemeKey : null,
      selectedTitleKey: typeof parsed.selectedTitleKey === "string" ? parsed.selectedTitleKey : null,
    };
  } catch {
    return { unlockedKeys: [], selectedThemeKey: null, selectedTitleKey: null };
  }
}

export function saveRewardsState(next) {
  localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(next));
  try {
    window.dispatchEvent(new Event("fintrack_rewards_updated"));
  } catch {
    // ignore
  }
}

export function computeUnlockedKeysForLevel(level) {
  return REWARD_TRACK.filter((r) => level >= r.level).map((r) => r.key);
}

