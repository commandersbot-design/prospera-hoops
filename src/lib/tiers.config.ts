// Prospera Hoops — tiers, entitlements, pricing, stat-source trust.
// Single source of truth for monetization (§5) + the stat-trust hard rule (§6.1).
// Recreated from the MASTER build prompt spec. Import and read via the helpers.

export type Tier = "FREE" | "PROSPERA_PLUS" | "COACH_HQ" | "COLLEGE_COACH" | "PROGRAM";

// §6.1 — every stat row carries a source. The comparative engine (percentiles,
// archetypes, Development Arc) may read ONLY trusted sources. SELF_REPORTED is
// quarantined: shown with a "player-reported" tag, NEVER in rankings.
export type StatSource = "VERIFIED" | "COACH_SUBMITTED" | "SELF_REPORTED";
export const TRUSTED_SOURCES: StatSource[] = ["VERIFIED", "COACH_SUBMITTED"];
export const isTrustedSource = (s: StatSource): boolean => TRUSTED_SOURCES.includes(s);

// §6.3 — account-trust state. Claimed = email-verified (can edit, contact hidden);
// Verified = identity-confirmed (blue badge, contact opt-in unlocked).
export type ClaimStatus = "CLAIMED" | "VERIFIED";
export type VerifiedVia = "COACH" | "SCHOOL_EMAIL" | "CHALLENGE" | "ADMIN" | null;

export type Feature =
  // Free — data IN is free, plus your own intelligence OUT.
  | "claim_profile" | "edit_profile" | "browse_board" | "follow" | "view_own_intelligence"
  // Prospera+
  | "who_viewed_you" | "verified_badge_eligible" | "one_pager_pdf" | "extra_film" | "alerts" | "deep_compare"
  // Coach HQ
  | "scout_tools" | "board_filters_export"
  // College / recruiter
  | "recruiter_search" | "recruiter_export";

const FREE_FEATURES: Feature[] = ["claim_profile", "edit_profile", "browse_board", "follow", "view_own_intelligence"];
const PLUS_FEATURES: Feature[] = [...FREE_FEATURES, "who_viewed_you", "verified_badge_eligible", "one_pager_pdf", "extra_film", "alerts", "deep_compare"];
const COACH_FEATURES: Feature[] = [...FREE_FEATURES, "scout_tools", "board_filters_export"];
const COLLEGE_FEATURES: Feature[] = [...FREE_FEATURES, "recruiter_search", "recruiter_export"];
const PROGRAM_FEATURES: Feature[] = [...COACH_FEATURES, "recruiter_search", "recruiter_export"]; // concierge superset

export const TIER_FEATURES: Record<Tier, Feature[]> = {
  FREE: FREE_FEATURES,
  PROSPERA_PLUS: PLUS_FEATURES,
  COACH_HQ: COACH_FEATURES,
  COLLEGE_COACH: COLLEGE_FEATURES,
  PROGRAM: PROGRAM_FEATURES,
};

export interface Account {
  tier: Tier;
  founding?: boolean;                 // §5.4 — Prospera+ free for life + gold badge (admin-approved)
  claim_status?: ClaimStatus;         // §6.3
  coach_free_until?: string | null;   // §5.5 — verified coaches: Coach HQ free through the first season (ISO date)
}

// Founding members get Prospera+ entitlements regardless of paid tier. A verified
// coach inside the free season keeps Coach HQ even on the FREE tier.
export function effectiveTier(a: Account): Tier {
  if (a.founding) return "PROSPERA_PLUS";
  if (a.coach_free_until && new Date(a.coach_free_until).getTime() > Date.now()) return "COACH_HQ";
  return a.tier;
}

export function hasFeature(a: Account, f: Feature): boolean {
  return TIER_FEATURES[effectiveTier(a)].includes(f);
}

// §5.1 / §5.3 — only two self-serve SKUs (PROSPERA_PLUS, COACH_HQ). Push annual.
export interface Price { monthly: number | null; annual: number | null; label: string; selfServe: boolean; trialDays?: number; }
export const PRICING: Record<Tier, Price> = {
  FREE:          { monthly: 0,   annual: 0,   label: "Free forever",            selfServe: false },
  PROSPERA_PLUS: { monthly: 5,   annual: 39,  label: "Prospera+",               selfServe: true, trialDays: 30 },
  COACH_HQ:      { monthly: 19,  annual: 149, label: "Coach HQ",                selfServe: true },
  COLLEGE_COACH: { monthly: 0,   annual: 0,   label: "College — verified, free", selfServe: false },
  PROGRAM:       { monthly: null, annual: 499, label: "Program — concierge",    selfServe: false },
};

// §5.4 — Founding 50 is approval-gated. Public UI shows CAPACITY, never a live
// ticker. The real approved tally is admin-only.
export const FOUNDING_CAP = 50;
