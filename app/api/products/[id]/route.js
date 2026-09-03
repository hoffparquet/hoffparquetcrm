import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function DELETE(request, { params }) {
  const { id } = params;
  await sql`delete from products where id = ${id}`;
  return NextResponse.json({ ok: true });
}
