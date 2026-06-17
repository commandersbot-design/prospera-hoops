// Prospera Hoops — the three coexisting badges (§7). Distinct meanings, never
// conflated: gold (premium) must never read as "verified".
//   Founding Member  — gold gradient #F5C451→#E0A23C + orange edge — account.founding
//   Verified Account — blue #3B9EFF (dashed/low-opacity when pending) — claim_status==='VERIFIED'
//   Verified Stats   — teal #2FBF8F — has ≥1 VERIFIED/COACH_SUBMITTED stat
// Fixed render order: Founding · Verified Account · Verified Stats. Icon + tooltip,
// never color alone (accessibility). Recreated from the MASTER build prompt spec.
import React from "react";
import type { ClaimStatus } from "../lib/tiers.config";

const GOLD_A = "#F5C451", GOLD_B = "#E0A23C", ORANGE = "#FF6A1A", BLUE = "#3B9EFF", TEAL = "#2FBF8F";
const INK = "#0b0a09";

const BODY = "'Hanken Grotesk', system-ui, sans-serif";

function pill(extra: React.CSSProperties): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 5, height: 22, padding: "0 9px 0 7px",
    borderRadius: 999, fontFamily: BODY, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.02em",
    whiteSpace: "nowrap", lineHeight: 1, userSelect: "none", ...extra,
  };
}

const Star = ({ c = INK }: { c?: string }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill={c} aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" /></svg>
);
const Shield = ({ c, dashed }: { c: string; dashed?: boolean }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={dashed ? { strokeDasharray: "3 2.5" } : undefined}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />{!dashed && <path d="M9 12l2 2 4-4" />}</svg>
);
const StatCheck = ({ c }: { c: string }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19V10M9 19V5M14 19v-6M19 19V8" /></svg>
);

export function FoundingBadge({ title = "Founding Member — an early supporter who helped build Prospera Hoops." }: { title?: string }) {
  return (
    <span title={title} style={pill({
      color: INK, background: `linear-gradient(135deg, ${GOLD_A}, ${GOLD_B})`,
      boxShadow: `inset 0 0 0 1px ${ORANGE}66, inset 0 1px 0 rgba(255,255,255,.45)`,
    })}>
      <Star /> Founding
    </span>
  );
}

export function VerifiedAccountBadge({ pending = false, title }: { pending?: boolean; title?: string }) {
  const t = title || (pending
    ? "Pending verification — claimed by email, identity not yet confirmed."
    : "Verified Account — a real, identity-confirmed person.");
  return (
    <span title={t} style={pill(pending
      ? { color: `${BLUE}`, background: "transparent", border: `1px dashed ${BLUE}66`, opacity: 0.75 }
      : { color: BLUE, background: `${BLUE}1f`, border: `1px solid ${BLUE}55` })}>
      <Shield c={BLUE} dashed={pending} /> {pending ? "Pending" : "Verified"}
    </span>
  );
}

export function VerifiedStatsBadge({ title = "Verified Stats — numbers from official box scores or a verified coach." }: { title?: string }) {
  return (
    <span title={title} style={pill({ color: TEAL, background: `${TEAL}1c`, border: `1px solid ${TEAL}55` })}>
      <StatCheck c={TEAL} /> Verified Stats
    </span>
  );
}

// Render whichever badges apply, in the fixed order. accountStatus: 'VERIFIED'
// → solid blue; 'CLAIMED' → pending blue; null/undefined → no account badge.
export function BadgeRow(
  { founding, accountStatus, statsVerified, gap = 6 }:
  { founding?: boolean; accountStatus?: ClaimStatus | null; statsVerified?: boolean; gap?: number },
) {
  const any = founding || accountStatus || statsVerified;
  if (!any) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap, flexWrap: "wrap" }}>
      {founding && <FoundingBadge />}
      {accountStatus && <VerifiedAccountBadge pending={accountStatus !== "VERIFIED"} />}
      {statsVerified && <VerifiedStatsBadge />}
    </span>
  );
}
