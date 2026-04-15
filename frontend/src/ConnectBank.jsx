import { useState, useEffect } from "react";
import { getBankAuthUrl, getBankStatus, syncBank, disconnectBank } from "./api";

function BankIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="22" x2="21" y2="22"/>
      <line x1="6" y1="18" x2="6" y2="11"/>
      <line x1="10" y1="18" x2="10" y2="11"/>
      <line x1="14" y1="18" x2="14" y2="11"/>
      <line x1="18" y1="18" x2="18" y2="11"/>
      <polygon points="12 2 20 7 4 7"/>
    </svg>
  );
}

export default function ConnectBank({ onImported }) {
  const [status, setStatus] = useState(null);   // null = loading
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getBankStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false }));
  }, []);

  async function handleConnect() {
    setError("");
    setWorking(true);
    try {
      const { url } = await getBankAuthUrl();
      window.location.href = url;   // redirect to TrueLayer bank picker
    } catch (e) {
      setError(e.message || "Could not start bank connection.");
      setWorking(false);
    }
  }

  async function handleSync() {
    setError("");
    setWorking(true);
    try {
      await syncBank();
      // Give the background task ~3 seconds then reload
      setTimeout(() => {
        if (onImported) onImported();
        getBankStatus().then(setStatus);
        setWorking(false);
      }, 3000);
    } catch (e) {
      setError(e.message);
      setWorking(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect your bank? Imported transactions will stay.")) return;
    setWorking(true);
    await disconnectBank().catch(() => {});
    setStatus({ connected: false });
    setWorking(false);
  }

  if (status === null) return null;  // still loading — render nothing

  if (!status.connected) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleConnect}
          disabled={working}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium text-zinc-200 transition-colors disabled:opacity-50"
        >
          {working ? "Redirecting…" : "Connect bank"}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    );
  }

  // Connected state
  const lastSync = status.last_synced_at
    ? new Date(status.last_synced_at).toLocaleString("en-GB", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : "never";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <BankIcon />
        <span className="text-accent-green font-medium">{status.account_name}</span>
        <span className="text-zinc-500">· synced {lastSync}</span>
      </div>
      <button
        type="button"
        onClick={handleSync}
        disabled={working}
        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-300 transition-colors disabled:opacity-50"
      >
        {working ? "Syncing…" : "Sync now"}
      </button>
      <button
        type="button"
        onClick={handleDisconnect}
        disabled={working}
        className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
      >
        Disconnect
      </button>
      {error && <p className="text-red-400 text-xs w-full">{error}</p>}
    </div>
  );
}
