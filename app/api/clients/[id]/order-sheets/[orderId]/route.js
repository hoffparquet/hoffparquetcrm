import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { orderSheetRowToApi } from "@/lib/mappers";

export async function PATCH(request, { params }) {
  const { orderId } = params;
  const patch = await request.json();

  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    await sql`update order_sheets set status = ${patch.status}, updated_at = now() where id = ${orderId}`;
  }

  const rows = await sql`select * from order_sheets where id = ${orderId}`;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(orderSheetRowToApi(rows[0]));
}

export async function DELETE(request, { params }) {
  const { orderId } = params;
  await sql`delete from order_sheets where id = ${orderId}`;
  return NextResponse.json({ ok: true });
}
