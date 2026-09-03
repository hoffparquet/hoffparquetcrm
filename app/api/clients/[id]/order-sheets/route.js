import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { orderSheetRowToApi } from "@/lib/mappers";

export async function GET(request, { params }) {
  const { id } = params;
  const rows = await sql`select * from order_sheets where client_id = ${id} order by created_at desc`;
  return NextResponse.json(rows.map(orderSheetRowToApi));
}

// Creates a new order sheet, or updates an existing one if the body includes
// an id that already exists. Deliberately never touches price fields — the
// items stored here only ever carry description, quantity and unit.
export async function POST(request, { params }) {
  const { id: clientId } = params;
  const body = await request.json();

  const items = JSON.stringify(
    (body.items || []).map((it) => ({
      id: it.id,
      description: it.description || "",
      quantity: it.quantity || "",
      unit: it.unit || "",
    }))
  );

  if (body.id) {
    const existing = await sql`select id from order_sheets where id = ${body.id} and client_id = ${clientId}`;
    if (existing.length > 0) {
      const rows = await sql`
        update order_sheets set
          target_date = ${body.targetDate || ""},
          items = ${items}::jsonb,
          notes = ${body.notes || ""},
          updated_at = now()
        where id = ${body.id}
        returning *
      `;
      return NextResponse.json(orderSheetRowToApi(rows[0]));
    }
  }

  const settingsRows = await sql`select data from app_settings where id = 1`;
  const settings = settingsRows[0]?.data || { nextOrderNumber: 1 };
  const seq = settings.nextOrderNumber || 1;
  const number = `HP-ORD-${String(seq).padStart(4, "0")}`;

  const rows = await sql`
    insert into order_sheets (
      client_id, number, date_created, target_date, items, notes, status
    ) values (
      ${clientId}, ${number}, ${body.dateCreated || new Date().toISOString().slice(0, 10)},
      ${body.targetDate || ""}, ${items}::jsonb, ${body.notes || ""}, 'draft'
    )
    returning *
  `;

  await sql`
    update app_settings
    set data = jsonb_set(data, '{nextOrderNumber}', ${JSON.stringify(seq + 1)}::jsonb)
    where id = 1
  `;

  return NextResponse.json(orderSheetRowToApi(rows[0]), { status: 201 });
}
