// Shared design tokens for components defined outside App.jsx.
// Mirrors the `T` / `mono` objects in App.jsx (same global --prospera-* CSS vars)
// so auth/claim/editor UI matches the app without a circular import.
export const T = {
  bg: "var(--prospera-bg)",
  surface: "var(--prospera-surface)",
  surface2: "var(--prospera-surface-2)",
  border: "var(--prospera-border)",
  borderSoft: "var(--prospera-border-soft)",
  text: "var(--prospera-text)",
  textDim: "var(--prospera-text-dim)",
  textMute: "var(--prospera-text-mute)",
  accent: "var(--prospera-cyan)", // brand orange
  signal: "var(--prospera-signal)",
  positive: "var(--prospera-positive)",
  warn: "var(--prospera-warn)",
  danger: "var(--prospera-danger)",
  track: "var(--prospera-pct-track)",
};

// Body / UI face — Hanken Grotesk (named `ui`, not monospace).
export const ui = {
  fontFamily: "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

// Display / nameplate face — Saira Condensed.
export const display = {
  fontFamily: "'Saira Condensed', system-ui, -apple-system, sans-serif",
};

// Shared input styling for the auth / claim / editor forms.
export const inputStyle = {
  ...ui,
  fontSize: 13,
  color: T.text,
  background: T.surface2,
  border: `1px solid ${T.border}`,
  borderRadius: 6,
  padding: "9px 11px",
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};

export const label = {
  ...ui,
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
  color: T.textMute,
};
