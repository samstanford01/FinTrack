import { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import Assistant from "./Assistant";
import Transactions from "./Transactions";
import Achievements from "./Achievements";
import Analytics from "./Analytics";
import Rewards from "./Rewards.jsx";
import Settings from "./Settings.jsx";
import LoginPanel from "./Login";
import { useAuth } from "./AuthContext";
import { loadRewardsState, REWARD_TRACK } from "./rewards.js";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "assistant", label: "AI Assistant" },
  { id: "transactions", label: "Transactions" },
  { id: "analytics", label: "Analytics" },
  { id: "rewards", label: "Rewards" },
  { id: "settings", label: "Settings" },
  { id: "achievements", label: "Achievements" },
];

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

function OnlineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return (
    <span
      title={online ? "Online — syncing to cloud" : "Offline — saved locally"}
      className={`w-2 h-2 rounded-full flex-shrink-0 ${online ? "bg-accent-green" : "bg-zinc-600"}`}
    />
  );
}

function UserBadge({ user, onSignOut }) {
  return (
    <div className="flex items-center gap-2.5">
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt={user.displayName || "User"}
          className="w-8 h-8 rounded-full border border-zinc-700 flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
          {(user.displayName || user.email || "U")[0].toUpperCase()}
        </div>
      )}
      <div className="text-right leading-tight min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate max-w-[140px]">
          {user.displayName || "User"}
        </p>
        <p className="text-xs text-zinc-400 truncate max-w-[140px]">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="text-xs text-zinc-500 hover:text-white transition-colors flex-shrink-0 ml-1"
      >
        Sign out
      </button>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showLogin, setShowLogin] = useState(false);
  const [bankCallbackStatus, setBankCallbackStatus] = useState(null);
  const { user, signOutUser, FIREBASE_ENABLED } = useAuth();
  const [title, setTitle] = useState(() => {
    const st = loadRewardsState();
    if (!st.selectedTitleKey) return null;
    return REWARD_TRACK.find((r) => r.key === st.selectedTitleKey)?.name || null;
  });

  useEffect(() => {
    const onUpdate = () => {
      const st = loadRewardsState();
      const next = st.selectedTitleKey
        ? (REWARD_TRACK.find((r) => r.key === st.selectedTitleKey)?.name || null)
        : null;
      setTitle(next);
    };
    window.addEventListener("fintrack_rewards_updated", onUpdate);
    return () => window.removeEventListener("fintrack_rewards_updated", onUpdate);
  }, []);

  // Dismiss the login panel automatically once the user signs in
  useEffect(() => {
    if (user) setShowLogin(false);
  }, [user]);

  // Handle TrueLayer OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;

    // Clean the URL immediately so refresh doesn't re-trigger
    window.history.replaceState({}, "", window.location.pathname);

    setBankCallbackStatus("connecting");
    import("./api").then(({ completeBankCallback }) => {
      completeBankCallback(code)
        .then((res) => {
          setBankCallbackStatus(`connected:${res.account_name}`);
          setActiveTab("transactions");
          setTimeout(() => setBankCallbackStatus(null), 5000);
        })
        .catch((e) => {
          setBankCallbackStatus(`error:${e.message}`);
          setTimeout(() => setBankCallbackStatus(null), 6000);
        });
    });
  }, []);

  // Still resolving auth state
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading…</p>
      </div>
    );
  }

  function handleTabClick(id) {
    setActiveTab(id);
    setShowLogin(false);
  }

  return (
    <div className="min-h-screen bg-dark text-zinc-200 flex flex-col">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center gap-4">
        {/* Left: brand + tabs */}
        <div className="flex items-baseline gap-2 flex-shrink-0">
          <h1 className="text-xl font-semibold text-accent">FinTrack</h1>
          {title && <span className="text-xs text-zinc-500 hidden sm:inline">· {title}</span>}
        </div>

        <nav className="flex gap-1 flex-1" role="tablist">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id && !showLogin}
              onClick={() => handleTabClick(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id && !showLogin
                  ? "bg-accent text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Right: online dot + auth */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <OnlineIndicator />

          {FIREBASE_ENABLED ? (
            user ? (
              <UserBadge user={user} onSignOut={signOutUser} />
            ) : (
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium text-zinc-200 transition-colors"
              >
                <GoogleIcon />
                Login / Sign up
              </button>
            )
          ) : null}
        </div>
      </header>

      <main className="flex-1 p-6">
        {bankCallbackStatus && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            bankCallbackStatus.startsWith("error")
              ? "bg-red-900/40 border border-red-700 text-red-300"
              : "bg-zinc-800 border border-zinc-700 text-zinc-200"
          }`}>
            {bankCallbackStatus === "connecting" && "Connecting your bank account…"}
            {bankCallbackStatus.startsWith("connected:") && (
              `Bank connected: ${bankCallbackStatus.split(":")[1]} — importing transactions in the background.`
            )}
            {bankCallbackStatus.startsWith("error:") && (
              `Bank connection failed: ${bankCallbackStatus.split(":")[1]}`
            )}
          </div>
        )}
        {showLogin && !user ? (
          <LoginPanel onDismiss={() => setShowLogin(false)} />
        ) : (
          <>
            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "assistant" && <Assistant />}
            {activeTab === "transactions" && <Transactions />}
            {activeTab === "analytics" && <Analytics />}
            {activeTab === "rewards" && <Rewards />}
            {activeTab === "settings" && <Settings />}
            {activeTab === "achievements" && <Achievements />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
