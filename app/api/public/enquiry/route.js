import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Keeps text fields to a sane length regardless of what's submitted — this
// is a public, unauthenticated endpoint, so it should never trust input.
function clean(value, maxLen) {
  return String(value || "").trim().slice(0, maxLen);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: a field real visitors never see or fill in (hidden off-screen
  // on the form). Bots that auto-fill every field will trip this. Return a
  // normal-looking success without creating anything, so the bot doesn't
  // learn it was caught and try again differently.
  if (clean(body.website, 200)) {
    return NextResponse.json({ ok: true });
  }

  const name = clean(body.name, 200);
  const email = clean(body.email, 200);

  if (!name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const companyName = clean(body.companyName, 200);
  const phone = clean(body.phone, 50);
  const projectType = clean(body.projectType, 100);
  const woodSpecies = clean(body.woodSpecies, 100);
  const areaSqm = clean(body.areaSqm, 20);
  const rooms = clean(body.rooms, 300);
  const message = clean(body.message, 3000);

  // source and stage are never taken from the request — a public submitter
  // can only ever create a fresh, untouched enquiry, nothing else.
  const today = new Date().toISOString().slice(0, 10);
  const rows = await sql`
    insert into clients (
      name, company_name, email, phone, project_type, wood_species,
      area_sqm, rooms, source, stage, dates
    ) values (
      ${name}, ${companyName}, ${email}, ${phone}, ${projectType}, ${woodSpecies},
      ${areaSqm}, ${rooms}, 'Website Enquiry', 'new_lead',
      ${JSON.stringify({ contactDate: today })}::jsonb
    )
    returning id
  `;
  const client = rows[0];

  const noteText = message ? message : "Enquiry submitted via website contact form.";
  await sql`
    insert into notes (client_id, note_date, body)
    values (${client.id}, ${today}, ${noteText})
  `;

  return NextResponse.json({ ok: true });
}
