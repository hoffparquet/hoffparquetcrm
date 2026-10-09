import { NextResponse } from "next/server";
import { finishOutreachDrafts } from "@/lib/draftFinisher";

// Called by the morning outreach agent straight after it has written its
// drafts, so they are branded, given the logo + flyer and tagged
// "Ready to send" in time for Tomas to review before the 9am send.
//
// It only finishes drafts (never sends or deletes), so the key below is
// just to stop strangers poking it. Override with OUTREACH_HOOK_KEY in
// Vercel if you ever want to change it.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_KEY = "W6UP6LPzV4Y79cEAfzyCwCwk7u8FljPQ";

export async function GET(request) {
  const key = new URL(request.url).searchParams.get("key") || "";
  const expected = (process.env.OUTREACH_HOOK_KEY || DEFAULT_KEY).trim();
  if (key !== expected) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  try {
    const result = await finishOutreachDrafts();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
