import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { quoteRowToApi } from "@/lib/mappers";

export async function GET(request, { params }) {
  const { id } = params;
  const rows = await sql`select * from quotes where client_id = ${id} order by created_at desc`;
  return NextResponse.json(rows.map(quoteRowToApi));
}

// Creates a new quote, or updates an existing one if the body includes an id
// that already exists (mirrors the "save quote" behaviour from the original
// artifact version — one endpoint handles both new and edited quotes).
export async function POST(request, { params }) {
  const { id: clientId } = params;
  const body = await request.json();

  const items = JSON.stringify(body.items || []);

  if (body.id) {
    const existing = await sql`select id from quotes where id = ${body.id} and client_id = ${clientId}`;
    if (existing.length > 0) {
      const rows = await sql`
        update quotes set
          valid_until = ${body.validUntil || ""},
          items = ${items}::jsonb,
          apply_vat = ${!!body.applyVat},
          vat_rate = ${Number(body.vatRate) || 20},
          terms = ${body.terms || ""},
          notes = ${body.notes || ""},
          scope = ${body.scope || "products"},
          status = ${body.status || "draft"},
          updated_at = now()
        where id = ${body.id}
        returning *
      `;
      return NextResponse.json(quoteRowToApi(rows[0]));
    }
  }

  // New quote — assign the next sequential number from app_settings.
  const settingsRows = await sql`select data from app_settings where id = 1`;
  const settings = settingsRows[0]?.data || { nextQuoteNumber: 1 };
  const seq = settings.nextQuoteNumber || 1;
  const number = `HP-Q-${String(seq).padStart(4, "0")}`;

  const rows = await sql`
    insert into quotes (
      client_id, number, date_created, valid_until, items, apply_vat, vat_rate,
      terms, notes, scope, status
    ) values (
      ${clientId}, ${number}, ${body.dateCreated || new Date().toISOString().slice(0, 10)},
      ${body.validUntil || ""}, ${items}::jsonb, ${!!body.applyVat}, ${Number(body.vatRate) || 20},
      ${body.terms || ""}, ${body.notes || ""}, ${body.scope || "products"}, ${body.status || "draft"}
    )
    returning *
  `;

  await sql`
    update app_settings
    set data = jsonb_set(data, '{nextQuoteNumber}', ${JSON.stringify(seq + 1)}::jsonb)
    where id = 1
  `;

  return NextResponse.json(quoteRowToApi(rows[0]), { status: 201 });
}
