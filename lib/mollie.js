// Thin wrapper around Mollie's Payments API. Server-only — this uses the
// secret API key, which must never reach the browser.
//
// Verified directly against Mollie's current developer documentation:
// - Auth: `Authorization: Bearer live_...` (or `test_...` in test mode) —
//   the API key works directly, no separate token exchange needed.
// - POST /v2/payments creates a payment; amount.value must be a STRING
//   with the correct number of decimal places (e.g. "10.00", not 10).
// - The response's `_links.checkout.href` is the URL to send the customer
//   to in order to actually pay.
// - GET /v2/payments/{id} returns the payment's current status: open,
//   pending, authorized, paid, failed, canceled, or expired.
// - Mollie's webhook is deliberately minimal: a single form-encoded field
//   `id` — no status, no signature. Mollie's own docs are explicit that
//   this is a security choice: the webhook is only ever a prompt to go
//   fetch the real status yourself, never something to trust directly.

const MOLLIE_API_BASE = "https://api.mollie.com/v2";

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.MOLLIE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// Creates a fresh Mollie payment and returns the full response, including
// `id` (needed to correlate the later webhook) and the checkout URL.
export async function createMolliePayment({ amount, currency, description, redirectUrl, webhookUrl }) {
  const res = await fetch(`${MOLLIE_API_BASE}/payments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      amount: {
        currency,
        // Mollie requires this as a string with exactly 2 decimal places.
        value: Number(amount).toFixed(2),
      },
      description,
      redirectUrl,
      webhookUrl,
      // Forces the checkout straight to card entry — without this, Mollie
      // shows its own method-selection screen (bank transfer, etc.) based
      // on whatever's enabled on the account, which isn't what "Pay by
      // Card" should mean.
      method: "creditcard",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Mollie payment creation failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    checkoutUrl: data._links?.checkout?.href,
  };
}

// Looks up a payment's CURRENT status directly from Mollie. Always called
// before trusting that a payment actually succeeded — the webhook itself
// carries no proof, by Mollie's own design.
export async function getMolliePaymentStatus(paymentId) {
  const res = await fetch(`${MOLLIE_API_BASE}/payments/${paymentId}`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Mollie payment lookup failed (${res.status})`);
  }

  const data = await res.json();
  return data.status; // "open" | "pending" | "authorized" | "paid" | "failed" | "canceled" | "expired"
}
