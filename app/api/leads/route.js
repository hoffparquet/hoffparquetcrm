import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { leadRowToApi } from "@/lib/leadMappers";

export async function GET() {
  const rows = await sql`select * from leads order by created_at desc`;
  return NextResponse.json(rows.map(leadRowToApi));
}

// Adding a lead by hand — for a company you met at a trade show, say,
// rather than one that came out of a Companies House search.
export async function POST(request) {
  const body = await request.json();
  const name = (body.companyName || "").trim();
  if (!name) {
    return NextResponse.json({ error: "A company name is needed." }, { status: 400 });
  }

  const rows = await sql`
    insert into leads (
      company_number, company_name, company_status, incorporated_on, sic_codes,
      address, locality, region, postcode, segment,
      contact_name, email, phone, website, status, review_required, notes
    ) values (
      ${body.companyNumber || ""}, ${name}, ${body.companyStatus || ""},
      ${body.incorporatedOn || ""}, ${JSON.stringify(body.sicCodes || [])}::jsonb,
      ${body.address || ""}, ${body.locality || ""}, ${body.region || ""}, ${body.postcode || ""},
      ${body.segment || ""}, ${body.contactName || ""}, ${body.email || ""},
      ${body.phone || ""}, ${body.website || ""},
      ${body.status || "new"}, ${!!body.reviewRequired}, ${body.notes || ""}
    )
    returning *
  `;
  return NextResponse.json(leadRowToApi(rows[0]), { status: 201 });
}
