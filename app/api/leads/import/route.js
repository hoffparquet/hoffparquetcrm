import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { segmentById } from "@/lib/leads";

// Saves chosen search results into the leads table.
//
// Companies already imported are skipped rather than duplicated — the
// unique index on company_number backs this up at the database level, so
// even a double-click can't create two copies.
export async function POST(request) {
  const body = await request.json();
  const segment = segmentById(body.segment);
  const rows = Array.isArray(body.leads) ? body.leads : [];

  if (!segment) return NextResponse.json({ error: "Pick a target group first." }, { status: 400 });
  if (rows.length === 0) return NextResponse.json({ error: "Nothing selected to import." }, { status: 400 });

  // Fit-out and joinery firms land as "needs review" and are never
  // treated as ready to contact — some of them are competitors.
  const status = segment.reviewRequired ? "review" : "new";

  let imported = 0;
  let skipped = 0;

  for (const lead of rows) {
    const number = (lead.companyNumber || "").trim();
    const result = await sql`
      insert into leads (
        company_number, company_name, company_status, incorporated_on, sic_codes,
        address, locality, region, postcode, segment, status, review_required
      ) values (
        ${number}, ${lead.companyName || ""}, ${lead.companyStatus || ""},
        ${lead.incorporatedOn || ""}, ${JSON.stringify(lead.sicCodes || [])}::jsonb,
        ${lead.address || ""}, ${lead.locality || ""}, ${lead.region || ""}, ${lead.postcode || ""},
        ${segment.id}, ${status}, ${segment.reviewRequired}
      )
      on conflict (company_number) where company_number <> '' do nothing
      returning id
    `;
    if (result.length > 0) imported += 1;
    else skipped += 1;
  }

  await sql`
    insert into lead_searches (segment, location, result_count, imported_count)
    values (${segment.id}, ${(body.location || "").trim()}, ${rows.length}, ${imported})
  `;

  return NextResponse.json({ imported, skipped, status });
}
