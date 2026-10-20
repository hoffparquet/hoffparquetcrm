import { NextResponse } from "next/server";
import { syncMailboxes } from "@/lib/emailSync";

// Called automatically on a schedule (Vercel Cron, or any free "pinger"
// service). It lives under /api/webhooks/ so the login screen doesn't block
// it — instead it is protected by a secret: the request must carry
// "Authorization: Bearer <CRON_SECRET>" (Vercel adds this itself when a
// CRON_SECRET environment variable exists). Without the secret it does nothing.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function run(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await syncMailboxes({});
  return NextResponse.json({ ok: true, results });
}

export const GET = run;
export const POST = run;
