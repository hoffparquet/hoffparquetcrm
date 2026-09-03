import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { noteRowToApi } from "@/lib/mappers";

export async function POST(request, { params }) {
  const { id } = params;
  const { body } = await request.json();
  if (!body || !body.trim()) {
    return NextResponse.json({ error: "Note text is required" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const rows = await sql`
    insert into notes (client_id, note_date, body)
    values (${id}, ${today}, ${body.trim()})
    returning *
  `;
  return NextResponse.json(noteRowToApi(rows[0]), { status: 201 });
}
