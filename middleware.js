import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "hp_session";

// Vercel runs middleware on the Edge Runtime, which does NOT support
// Node's built-in "crypto" module (crypto.createHmac etc). We use the
// Web Crypto API instead (globalThis.crypto.subtle), which IS available
// in the Edge Runtime and produces an identical HMAC-SHA256 hex digest.
function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function expectedSessionToken() {
  const secret = process.env.SESSION_SECRET || "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("hoff-parquet-crm-session")
  );
  return bufToHex(signature);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow the login page itself and the login/logout API routes,
  // plus Next.js's internal static asset requests.
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (isPublic) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const valid = token === (await expectedSessionToken());

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
