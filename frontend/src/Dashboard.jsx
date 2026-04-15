import { useState, useEffect } from "react";
import { getTransactions, getBudgets, setBudget, getCategories } from "./api";

function useDashboard(month, year) {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([getTransactions(month, year), getBudgets()])
      .then(([txs, buds]) => {
        setTransactions(txs);
        setBudgets(buds);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [month, year]);

  return { transactions, budgets, loading, error, setBudgets };
}

function Dashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { transactions, budgets, loading, error, setBudgets } = useDashboard(month, year);

  const expenseCategories = getCategories().filter((c) => c !== "Income");

  const totalIncome = transactions
    .filter((t) => t.category === "Income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalSpent = transactions
    .filter((t) => t.category !== "Income")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const savings = totalIncome - totalSpent;

  const spentByCategory = {};
  expenseCategories.forEach((c) => (spentByCategory[c] = 0));
  transactions
    .filter((t) => t.category !== "Income")
    .forEach((t) => {
      spentByCategory[t.category] = (spentByCategory[t.category] || 0) + Math.abs(Number(t.amount));
    });

  const budgetByCategory = {};
  budgets.forEach((b) => (budgetByCategory[b.category] = b.monthly_limit));

  const [editingBudget, setEditingBudget] = useState(null);
  const [limitInput, setLimitInput] = useState("");

  async function saveBudget(category) {
    const value = parseFloat(limitInput);
    if (Number.isNaN(value) || value < 0) return;
    try {
      const updated = await setBudget(category, value);
      setBudgets((prev) => {
        const rest = prev.filter((b) => b.category !== category);
        return [...rest, updated];
      });
      setEditingBudget(null);
      setLimitInput("");
    } catch (e) {
      console.error(e);
    }
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  if (loading) return <p className="text-zinc-500">Loading…</p>;
  if (error) {
    const isNotFound = /not found|404/i.test(error);
    return (
      <p className="text-red-400" role="alert">
        {error}
        {isNotFound && (
          <span className="block mt-2 text-zinc-400 text-sm">
            Make sure the backend is running: <code className="bg-zinc-800 px-1 rounded">cd backend && uvicorn main:app --port 8000</code>,
            and you opened the app via the Vite dev server (<code className="bg-zinc-800 px-1 rounded">npm run dev</code>), not a static build.
          </span>
        )}
      </p>
    );
  }

  return (
    <section aria-label="Budget dashboard" className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-medium text-zinc-300">Dashboard</h2>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white"
        >
          {monthNames.map((name, i) => (
            <option key={i} value={i + 1}>{name}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white"
        >
          {[year - 2, year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <p className="text-sm text-zinc-400">Income</p>
          <p className="text-2xl font-semibold text-accent-green">£{totalIncome.toFixed(2)}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <p className="text-sm text-zinc-400">Spent</p>
          <p className="text-2xl font-semibold text-red-400">£{totalSpent.toFixed(2)}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <p className="text-sm text-zinc-400">Savings</p>
          <p className={`text-2xl font-semibold ${savings >= 0 ? "text-accent-green" : "text-red-400"}`}>
            £{savings.toFixed(2)}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-md font-medium text-zinc-300 mb-3">Budget by category</h3>
        <div className="space-y-4">
          {expenseCategories.map((cat) => {
            const spent = spentByCategory[cat] || 0;
            const limit = budgetByCategory[cat];
            const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
            const isEditing = editingBudget === cat;
            return (
              <div key={cat} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{cat}</span>
                  <span className="text-zinc-400">
                    £{spent.toFixed(2)}
                    {limit != null && ` / £${Number(limit).toFixed(2)}`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-accent"
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                {isEditing ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={limitInput}
                      onChange={(e) => setLimitInput(e.target.value)}
                      placeholder="Monthly limit"
                      className="w-32 px-2 py-1 rounded bg-dark border border-zinc-700 text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => saveBudget(cat)}
                      className="px-3 py-1 rounded bg-accent text-white text-sm"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingBudget(null); setLimitInput(""); }}
                      className="text-zinc-400 text-sm hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBudget(cat);
                      setLimitInput(limit != null ? String(limit) : "");
                    }}
                    className="text-xs text-accent hover:underline mt-0.5"
                  >
                    {limit != null ? "Change limit" : "Set limit"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
