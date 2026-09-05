import { NextResponse } from "next/server";

// IMPORTANT: this file runs on Vercel's Edge Runtime, not regular Node.js.
// Edge Runtime does NOT support Node's built-in `crypto` module (the one
// used in lib/auth.js for API routes) — only the browser-style Web Crypto
// API (the global `crypto.subtle`). Importing Node's `crypto` here crashes
// the middleware with MIDDLEWARE_INVOCATION_FAILED.
//
// This computes the exact same HMAC-SHA256 hex digest as lib/auth.js does
// with Node's crypto — same algorithm, just using the Edge-compatible API —
// so a session cookie set by /api/auth (Node runtime) is still recognised
// here correctly.

const SESSION_COOKIE_NAME = "hp_session";

async function expectedSessionToken() {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(process.env.SESSION_SECRET || "");
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode("hoff-parquet-crm-session"));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow the login page, the public enquiry form (meant to be
  // linked/embedded from the public website — no login should ever be
  // required to submit it), their API routes, and Next.js's internal
  // static asset requests.
  const isPublic =
    pathname === "/login" ||
    pathname === "/enquiry" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (isPublic) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const expected = await expectedSessionToken();
  const valid = !!token && token === expected;

  if (!valid) {
    // API routes get a plain 401 instead of a redirect, since a redirect
    // response doesn't make sense for a fetch() call.
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
