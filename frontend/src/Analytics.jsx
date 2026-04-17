import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { getTransactions } from "./api";

function monthLabel(month, year) {
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleString("en-GB", { month: "short", year: "numeric" });
}

function getPrevMonth(month, year) {
  if (month === 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function calcIncomeSpentNet(txs) {
  let income = 0;
  let spent = 0;
  for (const t of txs) {
    const amt = Number(t.amount) || 0;
    if (t.category === "Income") income += amt;
    else spent += Math.abs(amt);
  }
  return { income, spent, net: income - spent };
}

function calcMostFrequentExpenseCategory(txs) {
  const counts = new Map();
  for (const t of txs) {
    if (t.category === "Income") continue;
    counts.set(t.category, (counts.get(t.category) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [cat, count] of counts.entries()) {
    if (count > bestCount) {
      best = cat;
      bestCount = count;
    }
  }
  return best ? { category: best, count: bestCount } : null;
}

function calcDailySpendSeries(txs, month, year) {
  const n = daysInMonth(month, year);
  const values = Array.from({ length: n }, () => 0);
  for (const t of txs) {
    if (t.category === "Income") continue;
    const dt = new Date(t.date);
    const d = dt.getDate();
    if (Number.isFinite(d) && d >= 1 && d <= n) {
      values[d - 1] += Math.abs(Number(t.amount) || 0);
    }
  }
  const labels = Array.from({ length: n }, (_, i) => String(i + 1));
  return { labels, values };
}

function formatGBP(v) {
  return `£${Number(v).toFixed(2)}`;
}

export default function Analytics() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [txs, setTxs] = useState([]);
  const [prevTxs, setPrevTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const prev = useMemo(() => getPrevMonth(month, year), [month, year]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    Promise.all([getTransactions(month, year), getTransactions(prev.month, prev.year)])
      .then(([a, b]) => {
        if (!alive) return;
        setTxs(Array.isArray(a) ? a : []);
        setPrevTxs(Array.isArray(b) ? b : []);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message || "Failed to load analytics data.");
        setTxs([]);
        setPrevTxs([]);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [month, year, prev.month, prev.year]);

  const { income, spent, net } = useMemo(() => calcIncomeSpentNet(txs), [txs]);
  const { spent: prevSpent } = useMemo(() => calcIncomeSpentNet(prevTxs), [prevTxs]);
  const mostFreq = useMemo(() => calcMostFrequentExpenseCategory(txs), [txs]);
  const daily = useMemo(() => calcDailySpendSeries(txs, month, year), [txs, month, year]);

  // Charts (wired up once Chart.js is added)
  const incomeVsExpenseCanvasRef = useRef(null);
  const momSpendCanvasRef = useRef(null);
  const dailyTrendCanvasRef = useRef(null);

  const incomeVsExpenseChartRef = useRef(null);
  const momSpendChartRef = useRef(null);
  const dailyTrendChartRef = useRef(null);

  useEffect(() => {
    const canvas = incomeVsExpenseCanvasRef.current;
    if (!canvas) return undefined;

    if (incomeVsExpenseChartRef.current) {
      incomeVsExpenseChartRef.current.destroy();
      incomeVsExpenseChartRef.current = null;
    }

    incomeVsExpenseChartRef.current = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Income", "Expenditure"],
        datasets: [
          {
            data: [income, spent],
            backgroundColor: ["#22c55e", "#f87171"],
            borderColor: "rgba(0,0,0,0)",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { color: "#a1a1aa" },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${formatGBP(ctx.raw)}`,
            },
          },
        },
      },
    });

    return () => {
      if (incomeVsExpenseChartRef.current) {
        incomeVsExpenseChartRef.current.destroy();
        incomeVsExpenseChartRef.current = null;
      }
    };
  }, [income, spent]);

  useEffect(() => {
    const canvas = momSpendCanvasRef.current;
    if (!canvas) return undefined;

    if (momSpendChartRef.current) {
      momSpendChartRef.current.destroy();
      momSpendChartRef.current = null;
    }

    momSpendChartRef.current = new Chart(canvas, {
      type: "bar",
      data: {
        labels: [monthLabel(prev.month, prev.year), monthLabel(month, year)],
        datasets: [
          {
            label: "Total spend",
            data: [prevSpent, spent],
            backgroundColor: ["rgba(59,130,246,0.7)", "rgba(59,130,246,0.9)"],
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: { ticks: { color: "#a1a1aa" }, grid: { color: "rgba(63,63,70,0.4)" } },
          y: {
            ticks: { color: "#a1a1aa", callback: (v) => `£${v}` },
            grid: { color: "rgba(63,63,70,0.4)" },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${formatGBP(ctx.raw)}`,
            },
          },
        },
      },
    });

    return () => {
      if (momSpendChartRef.current) {
        momSpendChartRef.current.destroy();
        momSpendChartRef.current = null;
      }
    };
  }, [month, year, prev.month, prev.year, prevSpent, spent]);

  useEffect(() => {
    const canvas = dailyTrendCanvasRef.current;
    if (!canvas) return undefined;

    if (dailyTrendChartRef.current) {
      dailyTrendChartRef.current.destroy();
      dailyTrendChartRef.current = null;
    }

    dailyTrendChartRef.current = new Chart(canvas, {
      type: "bar",
      data: {
        labels: daily.labels,
        datasets: [
          {
            label: "Daily spend",
            data: daily.values,
            backgroundColor: "rgba(147,51,234,0.75)",
            borderRadius: 6,
            maxBarThickness: 18,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: {
            ticks: { color: "#a1a1aa", maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
            grid: { display: false },
          },
          y: {
            ticks: { color: "#a1a1aa", callback: (v) => `£${v}` },
            grid: { color: "rgba(63,63,70,0.4)" },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${formatGBP(ctx.raw)}`,
            },
          },
        },
      },
    });

    return () => {
      if (dailyTrendChartRef.current) {
        dailyTrendChartRef.current.destroy();
        dailyTrendChartRef.current = null;
      }
    };
  }, [daily.labels, daily.values]);

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return (
    <section aria-label="Analytics" className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-medium text-zinc-300">Analytics</h2>
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
        <p className="text-xs text-zinc-500">
          Comparing to {monthLabel(prev.month, prev.year)}
        </p>
      </div>

      {loading && <p className="text-zinc-500">Loading…</p>}
      {!loading && error && (
        <p className="text-red-400" role="alert">{error}</p>
      )}

      {!loading && !error && txs.length === 0 && (
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <p className="text-zinc-400">
            No transactions for {monthLabel(month, year)} yet. Add a transaction to see analytics.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <p className="text-sm text-zinc-400">Income</p>
          <p className="text-2xl font-semibold text-positive">↑ {formatGBP(income)}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <p className="text-sm text-zinc-400">Expenditure</p>
          <p className="text-2xl font-semibold text-negative">↓ {formatGBP(spent)}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <p className="text-sm text-zinc-400">Net savings</p>
          <p className={`text-2xl font-semibold ${net >= 0 ? "text-positive" : "text-negative"}`}>
            {formatGBP(net)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <p className="text-sm text-zinc-400">Most frequent category</p>
          <p className="text-2xl font-semibold text-zinc-200">
            {mostFreq ? mostFreq.category : "—"}
          </p>
          {mostFreq && (
            <p className="text-xs text-zinc-500 mt-1">{mostFreq.count} transactions</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Income vs Expenditure</h3>
          <canvas ref={incomeVsExpenseCanvasRef} height="180" />
          <p className="text-xs text-zinc-500 mt-2">
            {monthLabel(month, year)} totals.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Month-over-month spend</h3>
          <canvas ref={momSpendCanvasRef} height="180" />
          <p className="text-xs text-zinc-500 mt-2">
            {monthLabel(month, year)}: {formatGBP(spent)} · {monthLabel(prev.month, prev.year)}: {formatGBP(prevSpent)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Daily spending trend</h3>
          <canvas ref={dailyTrendCanvasRef} height="180" />
          <p className="text-xs text-zinc-500 mt-2">
            Expenses only · {daily.labels.length} days
          </p>
        </div>
      </div>
    </section>
  );
}

