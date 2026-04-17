export const TEXT_SIZE_STORAGE_KEY = "fintrack_text_size_v1";

export function loadTextSize() {
  try {
    const v = (localStorage.getItem(TEXT_SIZE_STORAGE_KEY) || "").trim();
    if (v === "sm" || v === "md" || v === "lg") return v;
    return "md";
  } catch {
    return "md";
  }
}

export function applyTextSize(size) {
  const scale = size === "sm" ? 0.95 : size === "lg" ? 1.15 : 1.0;
  document.documentElement.style.setProperty("--font-scale", String(scale));
}

export function saveTextSize(size) {
  localStorage.setItem(TEXT_SIZE_STORAGE_KEY, size);
  try {
    window.dispatchEvent(new Event("fintrack_text_size_updated"));
  } catch {
    // ignore
  }
}

