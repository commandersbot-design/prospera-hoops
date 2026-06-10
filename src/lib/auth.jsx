// React auth context over the thin Supabase client.
// Exposes the current user, magic-link sign-in, sign-out, and an isAdmin flag
// (resolved from the `admins` table). Safe to mount even when Supabase is
// unconfigured — it simply reports configured=false and a null user.
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db, isConfigured, onAuthChange, getSession } from "./supabaseClient.js";

const AuthCtx = createContext({
  configured: false,
  loading: false,
  user: null,
  isAdmin: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(isConfigured);

  const refreshUser = useCallback(async () => {
    if (!isConfigured) return;
    const u = await auth.getUser().catch(() => null);
    setUser(u);
    if (u?.id) {
      // Admin = a row in `admins` for this user id. RLS lets a user read only
      // their own admin row, so a hit here means "I am an admin".
      try {
        const rows = await db.select("admins", `select=user_id&user_id=eq.${u.id}`);
        setIsAdmin(Array.isArray(rows) && rows.length > 0);
      } catch {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    auth.handleRedirectTokens();
    refreshUser().finally(() => setLoading(false));
    const off = onAuthChange(() => {
      if (!getSession()) {
        setUser(null);
        setIsAdmin(false);
      } else {
        refreshUser();
      }
    });
    return off;
  }, [refreshUser]);

  const signIn = useCallback(async (email) => {
    await auth.signInWithMagicLink(email);
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setIsAdmin(false);
  }, []);

  return (
    <AuthCtx.Provider value={{ configured: isConfigured, loading, user, isAdmin, signIn, signOut, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
