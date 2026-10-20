import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Small count for the dashboard banner. Never errors: if the email tables
// haven't been created yet, it just reports zero so the dashboard is unaffected.
export async function GET() {
  try {
    const rows = await sql`
      select count(*)::int as waiting,
             count(*) filter (where received_at < now() - interval '3 days')::int as overdue
      from email_messages
      where is_enquiry and not replied and not dismissed
    `;
    return NextResponse.json({ waiting: rows[0].waiting, overdue: rows[0].overdue });
  } catch (err) {
    return NextResponse.json({ waiting: 0, overdue: 0 });
  }
}
