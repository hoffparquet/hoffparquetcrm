import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Keeps text fields to a sane length regardless of what's submitted — this
// endpoint is called by an external automation (Zapier), not typed by a
// person, so it should still never trust input blindly.
function clean(value, maxLen) {
  return String(value ?? "").trim().slice(0, maxLen);
}

// A shared secret, set once in Vercel and once in the Zapier webhook step.
// Without a correct match, the request is rejected. This is a much lighter
// check than a full login, appropriate for a single trusted automation
// calling in, not a human-facing form.
function isAuthorized(request) {
  const provided = request.headers.get("x-webhook-secret") || "";
  const expected = process.env.SAMPLE_ORDER_SECRET || "";
  return expected.length > 0 && provided === expected;
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = clean(body.name, 200);
  if (!name) {
    return NextResponse.json({ error: "A customer name is required." }, { status: 400 });
  }

  const email = clean(body.email, 200);
  const phone = clean(body.phone, 50);
  const address = clean(body.address, 500);
  const companyName = clean(body.companyName, 200);
  const samples = clean(body.samples, 2000);
  const orderReference = clean(body.orderReference, 100);

  const today = new Date().toISOString().slice(0, 10);

  const rows = await sql`
    insert into clients (
      name, company_name, email, phone, address, source, stage, dates
    ) values (
      ${name}, ${companyName}, ${email}, ${phone}, ${address},
      'Sample Order', 'samples_ordered',
      ${JSON.stringify({ contactDate: today, samplesOrderedDate: today })}::jsonb
    )
    returning id
  `;
  const client = rows[0];

  const noteLines = [
    samples ? `Samples ordered: ${samples}` : "Samples ordered via website (no item detail provided).",
  ];
  if (orderReference) noteLines.push(`Order reference: ${orderReference}`);

  await sql`
    insert into notes (client_id, note_date, body)
    values (${client.id}, ${today}, ${noteLines.join(" ")})
  `;

  return NextResponse.json({ ok: true });
}
