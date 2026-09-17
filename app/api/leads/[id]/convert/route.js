import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { clientRowToApi } from "@/lib/mappers";
import { leadRowToApi } from "@/lib/leadMappers";
import { segmentLabel } from "@/lib/leads";

// Turns a lead into a real client in the CRM.
//
// The lead is NOT deleted — it stays in the leads list marked "converted"
// and pointing at the new client, so the outreach history isn't lost.
// The new client lands in Initial Contact like any other enquiry.
export async function POST(request, { params }) {
  const { id } = params;

  const leadRows = await sql`select * from leads where id = ${id}`;
  if (leadRows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lead = leadRows[0];

  if (lead.client_id) {
    return NextResponse.json(
      { error: "This lead has already been converted to a client." },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const clientRows = await sql`
    insert into clients (
      name, company_name, email, phone, address,
      project_category, source, stage, dates
    ) values (
      ${lead.contact_name || lead.company_name},
      ${lead.company_name},
      ${lead.email || ""},
      ${lead.phone || ""},
      ${lead.address || ""},
      'Commercial',
      'Trade Partner',
      'new_lead',
      ${JSON.stringify({ contactDate: today })}::jsonb
    )
    returning *
  `;
  const client = clientRows[0];

  // Carry everything we know across as the client's first note, so the
  // context isn't stranded in the leads table.
  const noteLines = [
    `Converted from lead research (${segmentLabel(lead.segment)}).`,
    lead.company_number ? `Companies House number: ${lead.company_number}` : null,
    lead.website ? `Website: ${lead.website}` : null,
    lead.incorporated_on ? `Incorporated: ${lead.incorporated_on}` : null,
    lead.notes ? `Notes: ${lead.notes}` : null,
  ].filter(Boolean);

  await sql`
    insert into notes (client_id, note_date, body)
    values (${client.id}, ${today}, ${noteLines.join("\n")})
  `;

  const updated = await sql`
    update leads set status = 'converted', client_id = ${client.id}, updated_at = now()
    where id = ${id}
    returning *
  `;

  return NextResponse.json({
    client: clientRowToApi(client, [], [], [], []),
    lead: leadRowToApi(updated[0]),
  });
}
