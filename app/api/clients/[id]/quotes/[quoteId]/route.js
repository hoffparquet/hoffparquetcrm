import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { quoteRowToApi } from "@/lib/mappers";

export async function PATCH(request, { params }) {
  const { quoteId } = params;
  const patch = await request.json();

  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    await sql`update quotes set status = ${patch.status}, updated_at = now() where id = ${quoteId}`;
  }

  const rows = await sql`select * from quotes where id = ${quoteId}`;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(quoteRowToApi(rows[0]));
}

export async function DELETE(request, { params }) {
  const { quoteId } = params;
  await sql`delete from quotes where id = ${quoteId}`;
  return NextResponse.json({ ok: true });
}
