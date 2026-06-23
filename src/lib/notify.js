// Fire a transactional email via the /api/notify serverless function. Best-effort:
// failures (e.g. email not configured yet) never block the action that triggered it.
import { getSession } from "./supabaseClient.js";

export async function notifyClaimApproved(claimId) {
  const t = getSession()?.access_token;
  if (!t || !claimId) return;
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ event: "claim_approved", claimId }),
    });
  } catch { /* email is best-effort */ }
}
