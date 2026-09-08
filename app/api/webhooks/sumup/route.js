import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSumupCheckoutStatus } from "@/lib/sumup";

// SumUp calls this the moment a checkout's status changes. Per SumUp's own
// documentation, the webhook body carries no signature and must never be
// trusted directly — it's treated purely as a prompt to go check the real
// status via the API, which is exactly what this does before marking
// anything paid.
//
// Always responds with 2xx (even on errors we can't do anything about) so
// SumUp doesn't retry-storm us — if something we can't recover from goes
// wrong, the invoice simply stays unpaid until staff notice and check
// SumUp's own dashboard, matching the manual fallback that already exists.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ ok: true });
  }

  const checkoutId = body?.id;
  if (!checkoutId) {
    return NextResponse.json({ ok: true });
  }

  let status;
  try {
    status = await getSumupCheckoutStatus(checkoutId);
  } catch (err) {
    return NextResponse.json({ ok: true });
  }

  if (status !== "PAID") {
    return NextResponse.json({ ok: true });
  }

  const rows = await sql`select id, status from invoices where sumup_checkout_id = ${checkoutId}`;
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
