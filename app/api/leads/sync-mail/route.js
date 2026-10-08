import { NextResponse } from "next/server";
import { syncOutreachMailbox } from "@/lib/outreachSync";
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
    const result = await syncOutreachMailbox();
    return NextResponse.json(result);
  } catch (e) {
    const status = e instanceof MailError ? 400 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
