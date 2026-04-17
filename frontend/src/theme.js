export const THEMES = {
  // Values are "R G B" so Tailwind can use `rgb(var(--accent) / <alpha-value>)`.
  default: {
    name: "Default",
    accent: "124 108 252",
    accentGreen: "79 209 165",
    bg: "#0a0a0f",
  },
  neonMint: {
    name: "Neon Mint",
    accent: "34 197 94",
    accentGreen: "45 212 191",
    bg: "#071013",
  },
  sunset: {
    name: "Sunset Glow",
    accent: "251 113 133",
    accentGreen: "250 204 21",
    bg: "#0b0a10",
  },
  monoGold: {
    name: "Mono Gold",
    accent: "234 179 8",
    accentGreen: "163 230 53",
    bg: "#0a0a0f",
  },
};

export function applyTheme(themeKey) {
  const t = THEMES[themeKey] || THEMES.default;
  const root = document.documentElement;
  root.style.setProperty("--accent", t.accent);
  root.style.setProperty("--accent-green", t.accentGreen);
  root.style.setProperty("--app-bg", t.bg);
}

