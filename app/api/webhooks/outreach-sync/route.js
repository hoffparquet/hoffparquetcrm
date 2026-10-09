import { NextResponse } from "next/server";
import { syncOutreachMailbox } from "@/lib/outreachSync";
import { finishOutreachDrafts } from "@/lib/draftFinisher";
import { MailError } from "@/lib/graphMail";

// Called automatically by Vercel once a day (see vercel.json).
// It sits under /api/webhooks/ so it doesn't need the CRM login, so instead
// it checks a password of its own: Vercel sends CRON_SECRET with every
// scheduled call. Without that secret set in Vercel, this does nothing.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const secret = (process.env.CRON_SECRET || "").trim();
  const auth = request.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  try {
    // First finish the agent's new drafts (branding, logo, flyer). A problem
    // here (e.g. missing permission) is reported but doesn't stop the
    // reply check below.
    let drafts;
    try {
      drafts = await finishOutreachDrafts();
    } catch (e) {
      drafts = { finished: 0, skipped: 0, errors: [`Drafts: ${e.message}`] };
    }
    const result = await syncOutreachMailbox();
    return NextResponse.json({
      ...result,
      draftsFinished: drafts.finished,
      errors: [...drafts.errors, ...result.errors],
    });
  } catch (e) {
    const status = e instanceof MailError ? 400 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
