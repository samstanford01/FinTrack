import { useState, useEffect } from "react";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getCategories,
} from "./api";
import ConnectBank from "./ConnectBank";

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Transactions() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    amount: "",
    category: "Food",
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const categories = getCategories();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  function load() {
    setLoading(true);
    getTransactions(month, year)
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [month, year]);

  function openAdd() {
    setShowForm(true);
    setEditingId(null);
    setForm({
      amount: "",
      category: "Food",
      date: new Date().toISOString().slice(0, 10),
      description: "",
    });
    setError("");
  }

  function openEdit(t) {
    setShowForm(true);
    setEditingId(t.id);
    setForm({
      amount: String(t.amount),
      category: t.category,
      date: new Date(t.date).toISOString().slice(0, 10),
      description: t.description || "",
    });
    setError("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (Number.isNaN(amount)) {
      setError("Enter a valid amount");
      return;
    }
    const payload = {
      amount,
      category: form.category,
      date: new Date(form.date).toISOString(),
      description: form.description.trim(),
    };
    setError("");
    if (editingId) {
      updateTransaction(editingId, payload)
        .then(() => { setShowForm(false); setEditingId(null); load(); })
        .catch((e) => setError(e.message));
    } else {
      createTransaction(payload)
        .then(() => { setShowForm(false); setEditingId(null); load(); })
        .catch((e) => setError(e.message));
    }
  }

  function handleDelete(id) {
    if (!window.confirm("Delete this transaction?")) return;
    deleteTransaction(id)
      .then(load)
      .catch((e) => setError(e.message));
  }

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return (
    <section aria-label="Transactions" className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-medium text-zinc-300">Transactions</h2>
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
        <button
          type="button"
          onClick={openAdd}
          className="ml-auto px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90"
        >
          Add transaction
        </button>
        <ConnectBank onImported={load} />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Amount</label>
              <input
                type="number"
                step="any"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full sm:w-28 px-3 py-2 rounded-lg bg-dark border border-zinc-700 text-white"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full sm:w-36 px-3 py-2 rounded-lg bg-dark border border-zinc-700 text-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full sm:w-40 px-3 py-2 rounded-lg bg-dark border border-zinc-700 text-white"
              />
            </div>
            <div className="col-span-2 sm:flex-1">
              <label className="block text-xs text-zinc-400 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-dark border border-zinc-700 text-white"
                placeholder="Optional"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium">
              {editingId ? "Update" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); setForm({ amount: "", category: "Food", date: new Date().toISOString().slice(0, 10), description: "" }); setError(""); }}
              className="px-4 py-2 rounded-lg bg-zinc-700 text-white text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-zinc-500">Loading…</p>}
      {!loading && list.length === 0 && (
        <p className="text-zinc-500">No transactions this month. Add one above.</p>
      )}
      {!loading && list.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left p-3 text-zinc-400 font-medium">Date</th>
                <th className="text-left p-3 text-zinc-400 font-medium">Category</th>
                <th className="text-left p-3 text-zinc-400 font-medium">Description</th>
                <th className="text-right p-3 text-zinc-400 font-medium">Amount</th>
                <th className="w-20 p-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className="border-b border-zinc-800/80 hover:bg-zinc-800/30">
                  <td className="p-3 flex items-center gap-1.5">
                    {formatDate(t.date)}
                    {t.source === "bank" && (
                      <span title="Imported from bank" className="text-zinc-500 text-xs">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/>
                          <line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/>
                          <line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>
                        </svg>
                      </span>
                    )}
                  </td>
                  <td className="p-3">{t.category}</td>
                  <td className="p-3 text-zinc-400 max-w-[180px] truncate">{t.description || "—"}</td>
                  <td className={`p-3 text-right font-medium ${t.amount >= 0 ? "text-positive" : "text-negative"}`}>
                    <span className="text-xs opacity-80 mr-1" aria-hidden>
                      {t.amount >= 0 ? "↑" : "↓"}
                    </span>
                    {t.amount >= 0 ? "+" : "−"}£{Math.abs(Number(t.amount)).toFixed(2)}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      className="text-accent hover:underline mr-2"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
