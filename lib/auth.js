import crypto from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "hp_session";

// A fixed, signed token derived from SESSION_SECRET. Because everyone shares
// one workspace password, we don't need per-user session IDs — just proof
// that *someone* typed the correct password at some point.
export function expectedSessionToken() {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "")
    .update("hoff-parquet-crm-session")
    .digest("hex");
}

export function tokensMatch(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// For use inside API route handlers (app/api/**/route.js).
// Returns true if the request carries a valid session cookie.
export function isAuthenticated() {
  const store = cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return tokensMatch(token, expectedSessionToken());
}
