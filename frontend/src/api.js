// In dev we proxy /api -> backend (8000), so same-origin requests work. Otherwise use env or default.
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "http://localhost:8000");

// Set by AuthContext when the Firebase ID token changes
let _authToken = null;
export function setAuthToken(token) {
  _authToken = token;
}

export async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || res.statusText || "Request failed");
  return data;
}

const CATEGORIES = ["Food", "Transport", "Entertainment", "Rent", "Income"];

export function getCategories() {
  return CATEGORIES;
}

export async function getTransactions(month, year) {
  const params = new URLSearchParams();
  if (month != null) params.set("month", month);
  if (year != null) params.set("year", year);
  const q = params.toString();
  return api("/transactions" + (q ? `?${q}` : ""));
}

export async function createTransaction(data) {
  return api("/transactions", { method: "POST", body: JSON.stringify(data) });
}

export async function updateTransaction(id, data) {
  return api(`/transactions/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteTransaction(id) {
  await api(`/transactions/${id}`, { method: "DELETE" });
}

export async function getBudgets() {
  return api("/budgets");
}

export async function setBudget(category, monthlyLimit) {
  return api("/budgets", {
    method: "POST",
    body: JSON.stringify({ category, monthly_limit: monthlyLimit }),
  });
}

export async function sendChatMessage(message) {
  const { reply } = await api("/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
  return reply;
}

export async function getProgress() {
  return api("/progress");
}

export async function getBankAuthUrl() {
  return api("/bank/auth-url");
}

export async function completeBankCallback(code) {
  return api("/bank/callback", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function getBankStatus() {
  return api("/bank/status");
}

export async function syncBank() {
  return api("/bank/sync", { method: "POST" });
}

export async function disconnectBank() {
  await api("/bank/disconnect", { method: "DELETE" });
}
