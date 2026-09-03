import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { invoiceRowToApi } from "@/lib/mappers";

export async function PATCH(request, { params }) {
  const { invoiceId } = params;
  const patch = await request.json();

  if (patch.status === "paid") {
    const today = new Date().toISOString().slice(0, 10);
    await sql`update invoices set status = 'paid', paid_date = ${today}, updated_at = now() where id = ${invoiceId}`;
  }

  const rows = await sql`select * from invoices where id = ${invoiceId}`;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoiceRowToApi(rows[0]));
}

export async function DELETE(request, { params }) {
  const { invoiceId } = params;
  await sql`delete from invoices where id = ${invoiceId}`;
  return NextResponse.json({ ok: true });
}
