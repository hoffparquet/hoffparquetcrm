import { NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "hp_session";

function expectedSessionToken() {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "")
    .update("hoff-parquet-crm-session")
    .digest("hex");
}

export function middleware(request) {
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
  const valid = token === expectedSessionToken();

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
