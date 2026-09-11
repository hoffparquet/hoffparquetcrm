import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { sql } from "@/lib/db";
import { createMolliePayment } from "@/lib/mollie";
import { itemsSubtotal } from "@/lib/constants";

// This is a Server Component, not a client page — it runs entirely on the
// server, creates a brand new Mollie payment every time it's visited, then
// redirects the browser straight to Mollie's own hosted payment page. No
// card details ever pass through this app.
export default async function PayInvoicePage({ params }) {
  const { invoiceId } = params;

  const rows = await sql`select * from invoices where id = ${invoiceId}`;
  if (rows.length === 0) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, fontFamily: "sans-serif", textAlign: "center" }}>
        <h1>Invoice not found</h1>
        <p>This payment link doesn&apos;t match an invoice we have on file. Please contact Hoff Parquet directly.</p>
      </div>
    );
  }

  const invoice = rows[0];

  if (invoice.status === "paid") {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, fontFamily: "sans-serif", textAlign: "center" }}>
        <h1>Already paid</h1>
        <p>Invoice {invoice.number} has already been paid in full — thank you!</p>
      </div>
    );
  }

  const subtotal = itemsSubtotal(invoice.items);
  const vatAmount = invoice.apply_vat ? (subtotal * (Number(invoice.vat_rate) || 0)) / 100 : 0;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  if (total <= 0) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, fontFamily: "sans-serif", textAlign: "center" }}>
        <h1>Nothing to pay</h1>
        <p>This invoice doesn&apos;t have a payable balance.</p>
      </div>
    );
  }

  const host = headers().get("host");
  const origin = `https://${host}`;

  let payment;
  try {
    payment = await createMolliePayment({
      amount: total,
      currency: "GBP",
      description: `Invoice ${invoice.number} — Hoff Parquet`,
      webhookUrl: `${origin}/api/webhooks/mollie`,
      redirectUrl: `${origin}/pay/${invoice.id}/thank-you`,
    });
  } catch (err) {
    console.error("Mollie payment creation failed:", err.message);
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, fontFamily: "sans-serif", textAlign: "center" }}>
        <h1>Payment temporarily unavailable</h1>
        <p>Something went wrong setting up this payment. Please try again shortly, or contact Hoff Parquet directly.</p>
      </div>
    );
  }

  // Store this attempt's payment id so the webhook can find its way back
  // to this invoice when Mollie reports a status change.
  await sql`update invoices set mollie_payment_id = ${payment.id}, updated_at = now() where id = ${invoiceId}`;

  redirect(payment.checkoutUrl);
}
