import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { stageIndex } from "@/lib/constants";

// Called by the new hoffparquet.co.uk website (server to server, never a browser):
//   kind "order"   — a paid online order (samples and/or accessories), sent after Mollie confirms payment
//   kind "enquiry" — a quote request or contact-form message
//   kind "trade"   — a trade account application (filed with source "Trade Partner")
//
// Protected by a shared secret: WEBSITE_SECRET here, CRM_WEBSITE_SECRET on the website.
//
// Behaviour:
// - Customers are matched by email, so a returning customer gets a new note on
//   their existing client card instead of a duplicate client.
// - A paid order is only ever filed once, even if the payment provider retries
//   (the payment id is recorded in the note and checked first).
// - Ordering samples moves the client to "Samples Ordered" — but never moves a
//   client backwards if they're already further along the pipeline.

function clean(value, maxLen) {
  return String(value ?? "").trim().slice(0, maxLen);
}

function isAuthorized(request) {
  const provided = request.headers.get("x-website-secret") || "";
  const expected = process.env.WEBSITE_SECRET || "";
  return expected.length > 0 && provided === expected;
}

const money = (n) => "£" + Number(n || 0).toFixed(2);

async function findClientByEmail(email) {
  if (!email) return null;
  const rows = await sql`
    select id, stage, phone, address, dates from clients
    where lower(email) = lower(${email})
    order by created_at desc
    limit 1
  `;
  return rows[0] || null;
}

async function addNote(clientId, today, body) {
  await sql`insert into notes (client_id, note_date, body) values (${clientId}, ${today}, ${body})`;
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

  const today = new Date().toISOString().slice(0, 10);

  if (body.kind === "order") {
    const paymentId = clean(body.paymentId, 60);
    const ref = clean(body.ref, 40);
    if (!/^tr_[A-Za-z0-9]+$/.test(paymentId)) {
      return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
    }

    // Already filed? (payment providers can call more than once)
    const dup = await sql`select 1 from notes where body like ${"%" + paymentId + "%"} limit 1`;
    if (dup.length) return NextResponse.json({ ok: true, duplicate: true });

    const c = body.customer || {};
    const name = clean(c.name, 200) || "Website customer";
    const email = clean(c.email, 200).toLowerCase();
    const phone = clean(c.phone, 50);
    const company = clean(c.company, 200);
    const address = clean(c.address, 500);
    const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
    const hasSamples = items.some((i) => /^Sample:/i.test(String(i.description || "")));

    const itemLines = items.map((i) => `• ${clean(i.description, 200)}${Number(i.quantity) > 1 ? " × " + Number(i.quantity) : ""} — ${money(i.total)}`);
    const noteBody = [
      `Website order ${ref} — paid ${money(body.total)} online (Mollie ${paymentId}).`,
      ...itemLines,
      Number(body.vat) > 0 ? `• VAT (20%) — ${money(body.vat)}` : "",
      Number(body.delivery) > 0 ? `• Delivery — ${money(body.delivery)}` : "",
      address ? `Deliver to: ${address}` : "",
      clean(body.notes, 500) ? `Customer notes: ${clean(body.notes, 500)}` : "",
      c.marketing ? "Opted in to marketing emails." : "",
    ].filter(Boolean).join("\n");

    let client = await findClientByEmail(email);
    if (client) {
      const dates = client.dates || {};
      let stage = client.stage;
      if (hasSamples && stageIndex(client.stage) < stageIndex("samples_ordered")) {
        stage = "samples_ordered";
        dates.samplesOrderedDate = today;
      }
      await sql`
        update clients set
          stage = ${stage},
          dates = ${JSON.stringify(dates)}::jsonb,
          phone = case when phone = '' then ${phone} else phone end,
          address = case when address = '' then ${address} else address end,
          updated_at = now()
        where id = ${client.id}
      `;
    } else {
      const stage = hasSamples ? "samples_ordered" : "paid";
      const dates = hasSamples ? { contactDate: today, samplesOrderedDate: today } : { contactDate: today, paidDate: today };
      const rows = await sql`
        insert into clients (name, company_name, email, phone, address, source, stage, dates)
        values (${name}, ${company}, ${email}, ${phone}, ${address},
                ${hasSamples ? "Sample Order" : "Website Order"}, ${stage}, ${JSON.stringify(dates)}::jsonb)
        returning id
      `;
      client = rows[0];
    }
    await addNote(client.id, today, noteBody);
    return NextResponse.json({ ok: true, clientId: client.id });
  }

  if (body.kind === "enquiry") {
    const name = clean(body.name, 200);
    const email = clean(body.email, 200).toLowerCase();
    if (!name || !email) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    const phone = clean(body.phone, 50);
    const postcode = clean(body.postcode, 12);
    const projectCategory = body.projectCategory === "Commercial" ? "Commercial" : "Residential";
    const areaSqm = clean(body.areaSqm, 20);
    const product = clean(body.product, 200);
    const noteBody = [
      `Website enquiry${product ? " about " + product : ""}${clean(body.page, 300) ? " (from " + clean(body.page, 300) + ")" : ""}.`,
      clean(body.message, 3000),
      areaSqm ? `Approx. area: ${areaSqm} m²` : "",
      postcode ? `Postcode: ${postcode}` : "",
    ].filter(Boolean).join("\n");

    let client = await findClientByEmail(email);
    if (client) {
      await sql`update clients set phone = case when phone = '' then ${phone} else phone end, updated_at = now() where id = ${client.id}`;
    } else {
      const rows = await sql`
        insert into clients (name, email, phone, address, project_category, area_sqm, project_type, source, stage, dates)
        values (${name}, ${email}, ${phone}, ${postcode}, ${projectCategory}, ${areaSqm},
                ${/chevron/i.test(product) ? "Chevron" : /herringbone/i.test(product) ? "Herringbone" : ""},
                'Website Enquiry', 'new_lead', ${JSON.stringify({ contactDate: today })}::jsonb)
        returning id
      `;
      client = rows[0];
    }
    await addNote(client.id, today, noteBody);
    return NextResponse.json({ ok: true, clientId: client.id });
  }

  if (body.kind === "trade") {
    const name = clean(body.name, 200);
    const email = clean(body.email, 200).toLowerCase();
    const companyName = clean(body.companyName, 200);
    if (!name || !email || !companyName) return NextResponse.json({ error: "Name, email and trading name are required" }, { status: 400 });
    const phone = clean(body.phone, 50);
    const address = [clean(body.address, 300), clean(body.city, 80), clean(body.postcode, 12)].filter(Boolean).join(", ");
    const category = ["Residential", "Commercial"].includes(body.projectCategory) ? body.projectCategory : "";
    const noteBody = [
      `TRADE ACCOUNT APPLICATION — ${companyName} (${clean(body.businessType, 60) || "business type not given"}).`,
      clean(body.jobTitle, 100) ? `Contact: ${name}, ${clean(body.jobTitle, 100)}` : `Contact: ${name}`,
      clean(body.companyWebsite, 200) ? `Website: ${clean(body.companyWebsite, 200)}` : "",
      clean(body.companyNumber, 40) ? `Company / VAT number: ${clean(body.companyNumber, 40)}` : "",
      clean(body.projectCategory, 20) ? `Typical projects: ${clean(body.projectCategory, 20)}` : "",
      clean(body.volume, 40) ? `Approx. flooring per year: ${clean(body.volume, 40)}` : "",
      clean(body.message, 3000) ? `Projects: ${clean(body.message, 3000)}` : "",
      clean(body.heardFrom, 200) ? `Heard about us via: ${clean(body.heardFrom, 200)}` : "",
    ].filter(Boolean).join("\n");

    let client = await findClientByEmail(email);
    if (client) {
      await sql`
        update clients set
          company_name = case when company_name = '' then ${companyName} else company_name end,
          phone = case when phone = '' then ${phone} else phone end,
          address = case when address = '' then ${address} else address end,
          updated_at = now()
        where id = ${client.id}
      `;
    } else {
      const rows = await sql`
        insert into clients (name, company_name, email, phone, address, project_category, source, stage, dates)
        values (${name}, ${companyName}, ${email}, ${phone}, ${address}, ${category},
                'Trade Partner', 'new_lead', ${JSON.stringify({ contactDate: today })}::jsonb)
        returning id
      `;
      client = rows[0];
    }
    await addNote(client.id, today, noteBody);
    return NextResponse.json({ ok: true, clientId: client.id });
  }

  return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
}
