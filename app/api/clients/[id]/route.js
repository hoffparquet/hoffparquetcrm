import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { clientRowToApi, clientPatchToColumns } from "@/lib/mappers";

export async function GET(request, { params }) {
  const { id } = params;
  const rows = await sql`select * from clients where id = ${id}`;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const notes = await sql`select * from notes where client_id = ${id} order by created_at desc`;
  const quotes = await sql`select * from quotes where client_id = ${id} order by created_at desc`;
  const invoices = await sql`select * from invoices where client_id = ${id} order by created_at desc`;

  return NextResponse.json(clientRowToApi(rows[0], notes, quotes, invoices));
}

// Every updatable client column gets its own explicit branch here. This is
// more verbose than a fully dynamic query, but it only ever uses parameterized
// values (never a dynamically-built column name), so there's no ambiguity
// about whether the underlying driver supports dynamic identifiers.
async function updateClientColumn(id, column, value) {
  switch (column) {
    case "name":
      return sql`update clients set name = ${value}, updated_at = now() where id = ${id}`;
    case "company_name":
      return sql`update clients set company_name = ${value}, updated_at = now() where id = ${id}`;
    case "email":
      return sql`update clients set email = ${value}, updated_at = now() where id = ${id}`;
    case "phone":
      return sql`update clients set phone = ${value}, updated_at = now() where id = ${id}`;
    case "address":
      return sql`update clients set address = ${value}, updated_at = now() where id = ${id}`;
    case "project_type":
      return sql`update clients set project_type = ${value}, updated_at = now() where id = ${id}`;
    case "wood_species":
      return sql`update clients set wood_species = ${value}, updated_at = now() where id = ${id}`;
    case "area_sqm":
      return sql`update clients set area_sqm = ${value}, updated_at = now() where id = ${id}`;
    case "rooms":
      return sql`update clients set rooms = ${value}, updated_at = now() where id = ${id}`;
    case "source":
      return sql`update clients set source = ${value}, updated_at = now() where id = ${id}`;
    case "estimate_value":
      return sql`update clients set estimate_value = ${value}, updated_at = now() where id = ${id}`;
    case "deposit_amount":
      return sql`update clients set deposit_amount = ${value}, updated_at = now() where id = ${id}`;
    case "paid_in_full":
      return sql`update clients set paid_in_full = ${value}, updated_at = now() where id = ${id}`;
    case "installation_date":
      return sql`update clients set installation_date = ${value}, updated_at = now() where id = ${id}`;
    case "stage":
      return sql`update clients set stage = ${value}, updated_at = now() where id = ${id}`;
    case "dates":
      return sql`update clients set dates = ${JSON.stringify(value)}::jsonb, updated_at = now() where id = ${id}`;
    default:
      return null;
  }
}

export async function PATCH(request, { params }) {
  const { id } = params;
  const patch = await request.json();
  const columns = clientPatchToColumns(patch);

  for (const [column, value] of Object.entries(columns)) {
    await updateClientColumn(id, column, value);
  }

  const rows = await sql`select * from clients where id = ${id}`;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const notes = await sql`select * from notes where client_id = ${id} order by created_at desc`;
  const quotes = await sql`select * from quotes where client_id = ${id} order by created_at desc`;
  const invoices = await sql`select * from invoices where client_id = ${id} order by created_at desc`;

  return NextResponse.json(clientRowToApi(rows[0], notes, quotes, invoices));
}

export async function DELETE(request, { params }) {
  const { id } = params;
  await sql`delete from clients where id = ${id}`;
  return NextResponse.json({ ok: true });
}
