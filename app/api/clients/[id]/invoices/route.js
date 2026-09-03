import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { invoiceRowToApi } from "@/lib/mappers";

export async function GET(request, { params }) {
  const { id } = params;
  const rows = await sql`select * from invoices where client_id = ${id} order by created_at desc`;
  return NextResponse.json(rows.map(invoiceRowToApi));
}

// Creates a new invoice, or updates an existing one if the body includes an
// id that already exists — same "one endpoint handles both" pattern as quotes.
export async function POST(request, { params }) {
  const { id: clientId } = params;
  const body = await request.json();

  // Invoice type is always exactly "products" or "installation" — never a
  // combined type. This is deliberate: products and installation labour are
  // always invoiced separately, even if a single quote covered both.
  const type = body.type === "installation" ? "installation" : "products";
  const items = JSON.stringify(body.items || []);

  if (body.id) {
    const existing = await sql`select id from invoices where id = ${body.id} and client_id = ${clientId}`;
    if (existing.length > 0) {
      const rows = await sql`
        update invoices set
          type = ${type},
          date_issued = ${body.dateIssued || ""},
          date_of_supply = ${body.dateOfSupply || ""},
          due_date = ${body.dueDate || ""},
          items = ${items}::jsonb,
          apply_vat = ${!!body.applyVat},
          vat_rate = ${Number(body.vatRate) || 20},
          terms = ${body.terms || ""},
          notes = ${body.notes || ""},
          updated_at = now()
        where id = ${body.id}
        returning *
      `;
      return NextResponse.json(invoiceRowToApi(rows[0]));
    }
  }

  // New invoice — assign the next sequential number from app_settings.
  const settingsRows = await sql`select data from app_settings where id = 1`;
  const settings = settingsRows[0]?.data || { nextInvoiceNumber: 1 };
  const seq = settings.nextInvoiceNumber || 1;
  const number = `HP-INV-${String(seq).padStart(4, "0")}`;

  const rows = await sql`
    insert into invoices (
      client_id, number, type, date_issued, date_of_supply, due_date, items,
      apply_vat, vat_rate, terms, notes, status
    ) values (
      ${clientId}, ${number}, ${type},
      ${body.dateIssued || new Date().toISOString().slice(0, 10)},
      ${body.dateOfSupply || body.dateIssued || new Date().toISOString().slice(0, 10)},
      ${body.dueDate || ""}, ${items}::jsonb, ${!!body.applyVat}, ${Number(body.vatRate) || 20},
      ${body.terms || ""}, ${body.notes || ""}, 'unpaid'
    )
    returning *
  `;

  await sql`
    update app_settings
    set data = jsonb_set(data, '{nextInvoiceNumber}', ${JSON.stringify(seq + 1)}::jsonb)
    where id = 1
  `;

  return NextResponse.json(invoiceRowToApi(rows[0]), { status: 201 });
}
