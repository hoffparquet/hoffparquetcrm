import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { installationJobRowToApi } from "@/lib/mappers";

export async function GET() {
  const rows = await sql`select * from installation_jobs order by job_date desc, created_at desc`;
  return NextResponse.json(rows.map(installationJobRowToApi));
}

// Creates a new job, or updates an existing one if the body includes an id
// that already exists — same "one endpoint handles both" pattern used
// elsewhere in the app (quotes, invoices, order sheets).
export async function POST(request) {
  const body = await request.json();

  const items = JSON.stringify(
    (body.items || [])
      .filter((it) => (it.description || "").trim())
      .map((it) => ({
        id: it.id,
        description: it.description || "",
        quantity: it.quantity || "",
        unit: it.unit || "",
        costPerUnit: Number(it.costPerUnit) || 0,
        chargePerUnit: Number(it.chargePerUnit) || 0,
      }))
  );

  if (body.id) {
    const existing = await sql`select id from installation_jobs where id = ${body.id}`;
    if (existing.length > 0) {
      const rows = await sql`
        update installation_jobs set
          client_id = ${body.clientId || null},
          project_name = ${body.projectName || ""},
          job_date = ${body.jobDate || ""},
          fitter_name = ${body.fitterName || ""},
          items = ${items}::jsonb,
          notes = ${body.notes || ""},
          updated_at = now()
        where id = ${body.id}
        returning *
      `;
      return NextResponse.json(installationJobRowToApi(rows[0]));
    }
  }

  const rows = await sql`
    insert into installation_jobs (
      client_id, project_name, job_date, fitter_name, items, notes
    ) values (
      ${body.clientId || null}, ${body.projectName || ""}, ${body.jobDate || ""},
      ${body.fitterName || ""}, ${items}::jsonb, ${body.notes || ""}
    )
    returning *
  `;
  return NextResponse.json(installationJobRowToApi(rows[0]), { status: 201 });
}
