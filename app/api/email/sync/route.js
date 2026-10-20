import { NextResponse } from "next/server";
import { syncMailboxes } from "@/lib/emailSync";
import { getMailboxes } from "@/lib/inboxGraph";

// Used by the "Check now" / "Check last 90 days" buttons on the Email
// enquiries page. Protected by the normal CRM login (middleware).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    mailboxes: getMailboxes().map((m) => ({ address: m.address, configured: m.configured })),
  });
}

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    // no body is fine
  }
  const days = Math.min(Math.max(Number(body.backfillDays) || 0, 0), 365);
  try {
    const results = await syncMailboxes({ backfillDays: days });
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
