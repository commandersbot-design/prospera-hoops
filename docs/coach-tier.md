# Coach Tier — Scout HQ access

Scout HQ is gated as a **coach tier**. Base users (players, parents, fans) don't get the
tools — they see a locked landing that explains the tier and takes an access code. Everything
else on the site (profiles, stats, team pages, leaderboards, recaps) stays **free for everyone**.

## Who gets in

Access is granted three ways (`src/lib/coachAccess.js` + `useAuth().isAdmin`):

1. **Admin / owner** — a row in the Supabase `admins` table (`useAuth().isAdmin`). You always have access.
2. **Coach subscription** — the real paid tier. *Not built yet* — it lands when Supabase auth +
   billing are live (an approved claim with role `Coach`, or a paid plan flag). Until then, use:
3. **Pilot pass** — a coach redeems an **access code** you give them. Stored per-device in
   `localStorage` (`prospera.coachPass.v1`). This is how pilots get in for free before subscriptions exist.

## Access codes (current)

Defined in `CODES` in `src/lib/coachAccess.js`. Hand these to the pilot coaches directly:

| Code | Grants |
|---|---|
| `PROSPERA-OWNER` | Owner access (you, on any device) |
| `HAYFIELD-PILOT` | Hayfield HS · pilot |
| `PROSPECTU-PILOT` | Prospect U · pilot |
| `AKT-PILOT` | AKT · pilot |

Add a pilot by adding one line to `CODES`. A coach enters the code on the Scout HQ locked
screen → it unlocks on that device and shows a "Coach access · <program> · Pilot · free" bar
with a **Sign out of coach** button.

## Security note (honest)

Codes live **client-side**. That's deliberate and fine for a **free pilot gate** — it's a feature
flag, not a paywall protecting money or PII. Anyone determined can read the bundle and find a code;
the point is that the tier isn't open to casual base users, and pilots get a clean, brandable
unlock. **Real enforcement** (so access actually requires a paid/approved account) arrives with the
subscription backend: at that point access should be checked server-side via Supabase
(approved `Coach` claim or active plan), and the local pass becomes a fallback for offline pilots only.

## What's gated vs free

- **Gated (coach tier):** Scout HQ — Opponents, Matchups (Team / 5-on-5 / 1-on-1), Players, My Team, Lists & Notes.
- **Free (everyone):** player profiles, stats, archetypes, team pages, leaderboards, recaps, map, classes, commitments, claim-your-profile.

## Related
- Outreach + how pilots are onboarded: [coach-outreach.md](coach-outreach.md)
- Self-serve accounts (the future login that backs the real subscription): [self-serve-profiles-spec.md](self-serve-profiles-spec.md)
