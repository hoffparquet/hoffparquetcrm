import { NextResponse } from "next/server";
import { sendReadyDrafts } from "@/lib/draftSender";
import { finishOutreachDrafts } from "@/lib/draftFinisher";
import { grantedRoles, sendSelfTest, stepTest, graphRequest } from "@/lib/graphMail";

// Sends today's reviewed outreach drafts (see lib/draftSender.js for the rules).
// Called by Vercel's schedule (vercel.json, with CRON_SECRET) or manually with
// ?key=... . Add &dry=1 to see what WOULD be sent without sending anything.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_KEY = "W6UP6LPzV4Y79cEAfzyCwCwk7u8FljPQ";

export async function GET(request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const expected = (process.env.OUTREACH_HOOK_KEY || DEFAULT_KEY).trim();
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  const fromCron = cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`;
  if (key !== expected && !fromCron) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  if (url.searchParams.get("diag") === "2") {
    const f = encodeURIComponent("categories/any(c:c eq 'Ready to send')");
    const l = await graphRequest(`/mailFolders/Drafts/messages?$filter=${f}&$select=id&$top=1`);
    const id = l?.value?.[0]?.id;
    return NextResponse.json(id ? await stepTest(id) : { error: "no ready draft" });
  }
  if (url.searchParams.get("diag") === "1") {
    return NextResponse.json({ roles: await grantedRoles(), selfTest: url.searchParams.get("test") === "1" ? await sendSelfTest() : null });
  }

  try {
    // Last-chance finishing for any draft the morning runs missed.
    try { await finishOutreachDrafts(); } catch (e) {}
    const result = await sendReadyDrafts({ dryRun: url.searchParams.get("dry") === "1" });
    return NextResponse.json({ sentCount: result.sent.length, ...result });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
