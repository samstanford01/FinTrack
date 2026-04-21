import { useState } from "react";
import { useAuth } from "./AuthContext";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

export default function LoginPanel({ onDismiss }) {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      // AuthContext will set the user and App.jsx will dismiss this panel automatically
    } catch (e) {
      setError("Sign-in failed. Make sure pop-ups are allowed for this site and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">

          {/* Card header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-zinc-800">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-1">Welcome to FinTrack</h2>
            <p className="text-zinc-400 text-sm">
              Sign in or create an account to sync your budget data across devices.
            </p>
          </div>

          {/* Card body */}
          <div className="px-8 py-8 flex flex-col gap-5">

            {/* What you get signed in */}
            <ul className="space-y-2">
              {[
                "Cloud sync — access your data on any device",
                "Secure — no bank details, manual transactions only",
                "Google account — no new password needed",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-zinc-400">
                  <span className="text-accent-green mt-0.5 flex-shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            {/* Google button */}
            <button
              type="button"
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-white text-zinc-900 font-medium text-sm hover:bg-zinc-100 active:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GoogleIcon />
              {loading ? "Signing in…" : "Continue with Google"}
            </button>

            {error && (
              <p className="text-red-400 text-xs text-center" role="alert">{error}</p>
            )}

            {/* Dismiss */}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-center w-full"
              >
                Continue without signing in
              </button>
            )}
          </div>
        </div>

        <p className="text-zinc-600 text-xs text-center mt-4">
          Your data is stored locally first and only syncs when you're signed in and online.
        </p>
      </div>
    </div>
  );
}
