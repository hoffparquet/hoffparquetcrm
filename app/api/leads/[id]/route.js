import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { leadRowToApi, leadPatchToColumns } from "@/lib/leadMappers";

export async function GET(request, { params }) {
  const { id } = params;
  const rows = await sql`select * from leads where id = ${id}`;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(leadRowToApi(rows[0]));
}

// One explicit branch per column, exactly as the clients route does it —
// values are always parameterized, column names are never built from
// user input.
async function updateLeadColumn(id, column, value) {
  switch (column) {
    case "company_number":
      return sql`update leads set company_number = ${value}, updated_at = now() where id = ${id}`;
    case "company_name":
      return sql`update leads set company_name = ${value}, updated_at = now() where id = ${id}`;
    case "company_status":
      return sql`update leads set company_status = ${value}, updated_at = now() where id = ${id}`;
    case "incorporated_on":
      return sql`update leads set incorporated_on = ${value}, updated_at = now() where id = ${id}`;
    case "address":
      return sql`update leads set address = ${value}, updated_at = now() where id = ${id}`;
    case "locality":
      return sql`update leads set locality = ${value}, updated_at = now() where id = ${id}`;
    case "region":
      return sql`update leads set region = ${value}, updated_at = now() where id = ${id}`;
    case "postcode":
      return sql`update leads set postcode = ${value}, updated_at = now() where id = ${id}`;
    case "segment":
      return sql`update leads set segment = ${value}, updated_at = now() where id = ${id}`;
    case "contact_name":
      return sql`update leads set contact_name = ${value}, updated_at = now() where id = ${id}`;
    case "email":
      return sql`update leads set email = ${value}, updated_at = now() where id = ${id}`;
    case "email_status":
      return sql`update leads set email_status = ${value}, updated_at = now() where id = ${id}`;
    case "phone":
      return sql`update leads set phone = ${value}, updated_at = now() where id = ${id}`;
    case "website":
      return sql`update leads set website = ${value}, updated_at = now() where id = ${id}`;
    case "status":
      return sql`update leads set status = ${value}, updated_at = now() where id = ${id}`;
    case "review_required":
      return sql`update leads set review_required = ${value}, updated_at = now() where id = ${id}`;
    case "notes":
      return sql`update leads set notes = ${value}, updated_at = now() where id = ${id}`;
    default:
      return null;
  }
}

export async function PATCH(request, { params }) {
  const { id } = params;
  const patch = await request.json();
  const columns = leadPatchToColumns(patch);

  for (const [column, value] of Object.entries(columns)) {
    await updateLeadColumn(id, column, value);
  }

  const rows = await sql`select * from leads where id = ${id}`;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(leadRowToApi(rows[0]));
}

export async function DELETE(request, { params }) {
  const { id } = params;
  await sql`delete from leads where id = ${id}`;
  return NextResponse.json({ ok: true });
}
