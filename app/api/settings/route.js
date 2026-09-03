import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const rows = await sql`select data from app_settings where id = 1`;
  return NextResponse.json(rows[0]?.data || {});
}

// Shallow-merges the patch into the stored settings object. For nested
// objects like "company", send the full company object each time (the
// frontend does this) rather than a partial one.
export async function PATCH(request) {
  const patch = await request.json();
  const rows = await sql`select data from app_settings where id = 1`;
  const current = rows[0]?.data || {};
  const next = { ...current, ...patch };

  await sql`update app_settings set data = ${JSON.stringify(next)}::jsonb where id = 1`;
  return NextResponse.json(next);
}
