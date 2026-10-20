import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { addEmailToCrm } from "@/lib/emailSync";

export const dynamic = "force-dynamic";

// PATCH body: { dismissed: true|false }  or  { addToCrm: true }
export async function PATCH(request, { params }) {
  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const rows = await sql`select * from email_messages where id = ${params.id}`;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = rows[0];

  if (typeof body.dismissed === "boolean") {
    await sql`update email_messages set dismissed = ${body.dismissed} where id = ${row.id}`;
    return NextResponse.json({ ok: true });
  }

  if (body.addToCrm) {
    if (row.client_id) return NextResponse.json({ ok: true, clientId: row.client_id });
    const clientId = await addEmailToCrm(row);
    // Adding it to the CRM means it is a real enquiry, so it should show
    // up in the "Needs reply" list too if it hasn't been answered.
    await sql`update email_messages set is_enquiry = true where id = ${row.id}`;
    return NextResponse.json({ ok: true, clientId });
  }

  return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
}
