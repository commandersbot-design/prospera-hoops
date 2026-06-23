// Dependency-free Supabase client.
//
// Supabase is just GoTrue (auth) + PostgREST (database) behind one URL, gated by
// the public "anon" key. Rather than pull in @supabase/supabase-js we talk to its
// REST endpoints directly with fetch — smaller bundle, no install step, and the
// security guarantees are unchanged because Row-Level Security is enforced
// server-side regardless of client.
//
// Config comes from Vite env vars (set in .env.local locally, and in the Vercel
// project settings for production):
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJhbGci...
// When unset, isConfigured === false and the app falls back to the email claim form.

const URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isConfigured = Boolean(URL && ANON);

const SESSION_KEY = "prospera.sb.session.v1";

// --- session storage --------------------------------------------------------
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveSession(s) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

let session = loadSession();
const listeners = new Set();
function emit() {
  for (const fn of listeners) fn(session);
}
export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getSession() {
  return session;
}
function setSession(s) {
  session = s;
  saveSession(s);
  emit();
}

function authHeaders(json = true) {
  const h = { apikey: ANON };
  if (json) h["Content-Type"] = "application/json";
  const token = session?.access_token || ANON;
  h.Authorization = `Bearer ${token}`;
  return h;
}

// --- auth (GoTrue) ----------------------------------------------------------
export const auth = {
  // Send a one-tap magic link to the given email. create_user defaults to true,
  // so this both signs up and signs in.
  async signInWithMagicLink(email, redirectTo, data) {
    if (!isConfigured) throw new Error("Supabase not configured");
    const r = await fetch(`${URL}/auth/v1/otp`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        options: { email_redirect_to: redirectTo || window.location.origin },
        // user_metadata set on the account at first signup (e.g. { role }).
        ...(data && Object.keys(data).length ? { data } : {}),
      }),
    });
    if (!r.ok) {
      const msg = await r.text().catch(() => "");
      throw new Error(msg || `Sign-in failed (${r.status})`);
    }
    return true;
  },

  // Called on every load: if the magic-link redirect put tokens in the URL hash
  // (#access_token=...&refresh_token=...), capture them and clean the URL.
  handleRedirectTokens() {
    if (typeof window === "undefined") return false;
    const hash = window.location.hash || "";
    if (!hash.includes("access_token")) return false;
    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token) {
      setSession({ access_token, refresh_token });
      // Strip the tokens from the address bar.
      const clean = window.location.pathname + window.location.search;
      window.history.replaceState({}, document.title, clean);
      return true;
    }
    return false;
  },

  // Resolve the current user from the stored access token; refresh once on 401.
  async getUser() {
    if (!isConfigured || !session?.access_token) return null;
    let r = await fetch(`${URL}/auth/v1/user`, { headers: authHeaders(false) });
    if (r.status === 401 && session?.refresh_token) {
      const ok = await auth.refresh();
      if (ok) r = await fetch(`${URL}/auth/v1/user`, { headers: authHeaders(false) });
    }
    if (!r.ok) {
      if (r.status === 401) setSession(null);
      return null;
    }
    return r.json();
  },

  async refresh() {
    if (!session?.refresh_token) return false;
    const r = await fetch(`${URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!r.ok) {
      setSession(null);
      return false;
    }
    const data = await r.json();
    setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    return true;
  },

  async signOut() {
    if (isConfigured && session?.access_token) {
      await fetch(`${URL}/auth/v1/logout`, { method: "POST", headers: authHeaders(false) }).catch(() => {});
    }
    setSession(null);
  },
};

// --- database (PostgREST) ---------------------------------------------------
// Thin helpers. `query` is a raw PostgREST querystring, e.g.
//   "select=*&player_id=eq.abc&order=created_at.desc"
async function rest(path, init) {
  const r = await fetch(`${URL}/rest/v1/${path}`, init);
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(msg || `Request failed (${r.status})`);
  }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

export const db = {
  select(table, query = "select=*") {
    return rest(`${table}?${query}`, { headers: authHeaders(false) });
  },
  insert(table, row) {
    return rest(table, {
      method: "POST",
      headers: { ...authHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
  },
  update(table, query, patch) {
    return rest(`${table}?${query}`, {
      method: "PATCH",
      headers: { ...authHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
  },
  // Insert or update by primary key / unique constraint.
  upsert(table, row, onConflict) {
    const q = onConflict ? `?on_conflict=${onConflict}` : "";
    return rest(`${table}${q}`, {
      method: "POST",
      headers: { ...authHeaders(), Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });
  },
  del(table, query) {
    return rest(`${table}?${query}`, { method: "DELETE", headers: { ...authHeaders(false), Prefer: "return=minimal" } });
  },
};
