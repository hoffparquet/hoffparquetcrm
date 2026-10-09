import { NextResponse } from "next/server";
import { syncOutreachMailbox } from "@/lib/outreachSync";
import { finishOutreachDrafts } from "@/lib/draftFinisher";
import { getLeadSettings } from "@/lib/companiesHouse";
import { MailError } from "@/lib/graphMail";

// The "Check sales@ now" button on the Leads page. Behind the normal CRM
// login (middleware.js), so only your team can trigger it.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const settings = await getLeadSettings();
  return NextResponse.json({
    lastSync: settings.mailLastSync || null,
    lastResult: settings.mailLastResult || null,
  });
}

export async function POST() {
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
