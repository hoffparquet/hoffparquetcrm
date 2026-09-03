import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, expectedSessionToken, tokensMatch } from "@/lib/auth";

export async function POST(request) {
  const { password } = await request.json();

  if (!tokensMatch(password, process.env.WORKSPACE_PASSWORD)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, expectedSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
