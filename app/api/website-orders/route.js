import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureOrdersTable, orderRowToApi, ORDER_STATUSES } from "@/lib/websiteOrders";

// Online orders from the website (signed-in CRM users only — see middleware.js).
export async function GET() {
  try {
    await ensureOrdersTable();
    const rows = await sql`select * from website_orders order by coalesce(paid_at, created_at) desc limit 500`;
    return NextResponse.json(rows.map(orderRowToApi));
  } catch (e) {
    console.error("website orders:", e);
    return NextResponse.json({ error: `Could not load orders: ${e.message}` }, { status: 500 });
  }
}

// Change an order's status: { id, status: "new" | "packed" | "sent" | "cancelled" }
export async function PATCH(request) {
  await ensureOrdersTable();
  let body;
  try { body = await request.json(); } catch (e) { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1 || !ORDER_STATUSES.includes(body.status)) return NextResponse.json({ error: "Unknown order or status" }, { status: 400 });
  const stamp = JSON.stringify({ [body.status]: new Date().toISOString() });
  const rows = await sql`
    update website_orders set status = ${body.status}, status_dates = status_dates || ${stamp}::jsonb
    where id = ${id} returning *
  `;
  if (!rows.length) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(orderRowToApi(rows[0]));
}
