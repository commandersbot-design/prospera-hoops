import { useEffect, useReducer } from "react";

/**
 * Gold-tier store — the user's MANUAL "this kid is elite" marks.
 *
 * Gold tier is set by hand (our conviction made visible), so this holds the
 * prospect IDs the user has marked in-app. Persisted to localStorage, which
 * means marks are per-device until a real backend/data write exists. A mark can
 * also be baked permanently into prospects.json as `"goldTier": true` — both are
 * honored (see isGoldTier in the workspace).
 *
 * Single source for the toggle; the workspace reads isGold() for its badges and
 * the profile uses useGold() to render + flip the control.
 */
const KEY = "prospera.goldTier.v1";

function load() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); }
  catch { return new Set(); }
}

let marks = load();
const listeners = new Set();

export function isGold(id) {
  return id != null && marks.has(id);
}

export function goldIds() {
  return [...marks];
}

export function toggleGold(id) {
  if (id == null) return;
  if (marks.has(id)) marks.delete(id); else marks.add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...marks])); } catch { /* private mode */ }
  listeners.forEach((fn) => fn());
}

// Subscribe a component to gold-mark changes so badges/toggles re-render live.
export function useGold() {
  const [, force] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => listeners.delete(force);
  }, []);
  return { isGold, toggleGold, goldIds };
}

/**
 * Scout-verified store — "a Prospera scout has confirmed this player's info."
 * This is the INTERNAL, scout-side verification (a trust signal on the system of
 * record), persisted to localStorage like the gold mark. It is NOT the public,
 * player/parent "claim your profile" flow — that needs accounts + a backend and
 * is left as an owner-decision (see the Verify control's note).
 */
const VKEY = "prospera.verified.v1";
function loadV() {
  try { return new Set(JSON.parse(localStorage.getItem(VKEY) || "[]")); }
  catch { return new Set(); }
}
let verifiedMarks = loadV();

export function isVerified(id) {
  return id != null && verifiedMarks.has(id);
}
export function toggleVerified(id) {
  if (id == null) return;
  if (verifiedMarks.has(id)) verifiedMarks.delete(id); else verifiedMarks.add(id);
  try { localStorage.setItem(VKEY, JSON.stringify([...verifiedMarks])); } catch { /* private mode */ }
  listeners.forEach((fn) => fn());
}
export function useVerified() {
  const [, force] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => listeners.delete(force);
  }, []);
  return { isVerified, toggleVerified };
}
