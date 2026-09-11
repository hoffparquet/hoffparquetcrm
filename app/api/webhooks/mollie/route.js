import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getMolliePaymentStatus } from "@/lib/mollie";

// Mollie calls this the moment a payment's status changes. Unlike some
// other providers, Mollie's webhook body is deliberately minimal — a
// single form-encoded field called `id`, with no status and no signature.
// Mollie's own documentation is explicit that this is a security choice:
// since the webhook can't prove anything on its own, the only thing to do
// with it is treat it as a prompt to go check the real status via the API,
// which is exactly what this does before marking anything paid.
//
// Always responds with 2xx (even on errors we can't do anything about) so
// Mollie doesn't retry-storm us — if something we can't recover from goes
// wrong, the invoice simply stays unpaid until staff notice and check
// Mollie's own dashboard, matching the manual fallback that already exists.
export async function POST(request) {
  let paymentId;
  try {
    const formData = await request.formData();
    paymentId = formData.get("id");
  } catch (e) {
    return NextResponse.json({ ok: true });
  }

  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  let status;
  try {
    status = await getMolliePaymentStatus(paymentId);
  } catch (err) {
    return NextResponse.json({ ok: true });
  }

  if (status !== "paid") {
    return NextResponse.json({ ok: true });
  }

  const rows = await sql`select id, status from invoices where mollie_payment_id = ${paymentId}`;
  if (rows.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const invoice = rows[0];
  if (invoice.status !== "paid") {
    const today = new Date().toISOString().slice(0, 10);
    await sql`update invoices set status = 'paid', paid_date = ${today}, updated_at = now() where id = ${invoice.id}`;
  }

  return NextResponse.json({ ok: true });
}
