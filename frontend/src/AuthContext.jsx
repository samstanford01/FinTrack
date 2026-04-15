import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, FIREBASE_ENABLED } from "./firebase";
import { setAuthToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still loading, null = signed out, object = signed in
  const [user, setUser] = useState(FIREBASE_ENABLED ? undefined : null);
  const [idToken, setIdToken] = useState(null);

  useEffect(() => {
    if (!FIREBASE_ENABLED) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setIdToken(token);
        setAuthToken(token);
      } else {
        setIdToken(null);
        setAuthToken(null);
      }
    });

    return unsubscribe;
  }, []);

  // Refresh the ID token before it expires (tokens last 1 h; refresh every 50 min)
  useEffect(() => {
    if (!user || !FIREBASE_ENABLED) return;
    const interval = setInterval(async () => {
      const token = await user.getIdToken(/* forceRefresh */ true);
      setIdToken(token);
      setAuthToken(token);
    }, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
  const signOutUser = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, idToken, signInWithGoogle, signOutUser, FIREBASE_ENABLED }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
