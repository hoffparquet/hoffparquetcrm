import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { clientRowToApi } from "@/lib/mappers";

export async function GET() {
  const clientRows = await sql`select * from clients order by created_at desc`;
  const noteRows = await sql`select * from notes order by created_at desc`;
  const quoteRows = await sql`select * from quotes order by created_at desc`;

  const notesByClient = {};
  for (const n of noteRows) {
    (notesByClient[n.client_id] ||= []).push(n);
  }
  const quotesByClient = {};
  for (const q of quoteRows) {
    (quotesByClient[q.client_id] ||= []).push(q);
  }

  const clients = clientRows.map((row) =>
    clientRowToApi(row, notesByClient[row.id] || [], quotesByClient[row.id] || [])
  );
  return NextResponse.json(clients);
}

export async function POST(request) {
  const body = await request.json();
  const name = (body.name || "Untitled enquiry").trim();

  const rows = await sql`
    insert into clients (
      name, company_name, email, phone, address, project_type, wood_species,
      area_sqm, rooms, source, estimate_value, dates
    ) values (
      ${name}, ${body.companyName || ""}, ${body.email || ""}, ${body.phone || ""},
      ${body.address || ""}, ${body.projectType || ""}, ${body.woodSpecies || ""},
      ${body.areaSqm || ""}, ${body.rooms || ""}, ${body.source || ""},
      ${body.estimateValue || ""}, ${JSON.stringify({ contactDate: new Date().toISOString().slice(0, 10) })}::jsonb
    )
    returning *
  `;
  const client = rows[0];

  if (body.note) {
    await sql`
      insert into notes (client_id, note_date, body)
      values (${client.id}, ${new Date().toISOString().slice(0, 10)}, ${body.note})
    `;
  } else {
    await sql`
      insert into notes (client_id, note_date, body)
      values (${client.id}, ${new Date().toISOString().slice(0, 10)}, 'Enquiry created.')
    `;
  }

  return NextResponse.json(clientRowToApi(client, [], []), { status: 201 });
}
