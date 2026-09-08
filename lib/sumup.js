// Thin wrapper around SumUp's Checkout API. Server-only — this uses the
// secret API key, which must never reach the browser.
//
// Verified directly against SumUp's current developer documentation:
// - Auth: `Authorization: Bearer sup_sk_...` (the API key works directly,
//   no OAuth token exchange needed for a single-merchant integration).
// - POST /v0.1/checkouts creates a checkout; with hosted_checkout.enabled
//   set to true, the response includes a hosted_checkout_url — a
//   SumUp-hosted payment page we redirect the customer to.
// - GET /v0.1/checkouts/{id} returns the checkout's current status:
//   PENDING, PAID, FAILED, or EXPIRED.
// - Hosted Checkout sessions expire 30 minutes after creation, so a
//   checkout must be created fresh right when someone is about to pay —
//   never pre-created and stored for later.

const SUMUP_API_BASE = "https://api.sumup.com";

function authHeaders() {
  // TEMPORARY DIAGNOSTIC — safe to leave in briefly, logs no secret data,
  // just enough to pinpoint a bad character. Remove once resolved.
  const key = process.env.SUMUP_API_KEY || "";
  console.log(
    "SUMUP_API_KEY diagnostic — length:",
    key.length,
    "char codes 18-26:",
    [...key].slice(18, 26).map((c) => c.charCodeAt(0))
  );

  return {
    Authorization: `Bearer ${process.env.SUMUP_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// Creates a fresh SumUp checkout and returns the full response, including
// `id` (needed to correlate the later webhook) and `hosted_checkout_url`
// (where to send the customer to actually pay).
export async function createSumupCheckout({ amount, currency, reference, description, returnUrl, redirectUrl }) {
  const res = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      checkout_reference: reference,
      amount,
      currency,
      merchant_code: process.env.SUMUP_MERCHANT_CODE,
      description,
      return_url: returnUrl,
      redirect_url: redirectUrl,
      hosted_checkout: { enabled: true },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`SumUp checkout creation failed (${res.status}): ${errText}`);
  }

  return res.json();
}

// Looks up a checkout's CURRENT status directly from SumUp. Per SumUp's
// own guidance, a webhook notification is only a prompt to check — never
// proof of payment on its own — so this is always called before trusting
// that a payment actually succeeded.
export async function getSumupCheckoutStatus(checkoutId) {
  const res = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts/${checkoutId}`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`SumUp checkout lookup failed (${res.status})`);
  }

  const data = await res.json();
  return data.status; // "PENDING" | "PAID" | "FAILED" | "EXPIRED"
}
