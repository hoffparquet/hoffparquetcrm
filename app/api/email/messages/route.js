import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await sql`
      select m.id, m.mailbox, m.sender_email, m.sender_name, m.subject, m.snippet, m.received_at,
             m.is_enquiry, m.client_id, m.replied, m.replied_at, m.dismissed, c.name as client_name
      from email_messages m
      left join clients c on c.id = m.client_id
      where m.received_at > now() - interval '400 days'
      order by m.received_at desc
      limit 1500
    `;
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        mailbox: r.mailbox,
        senderEmail: r.sender_email,
        senderName: r.sender_name,
        subject: r.subject,
        snippet: r.snippet,
        receivedAt: r.received_at,
        isEnquiry: r.is_enquiry,
        clientId: r.client_id,
        clientName: r.client_name,
        replied: r.replied,
        repliedAt: r.replied_at,
        dismissed: r.dismissed,
      }))
    );
  } catch (err) {
    return NextResponse.json({ error: "Email tables not set up yet — run migration-14 in Neon first." }, { status: 500 });
  }
}
