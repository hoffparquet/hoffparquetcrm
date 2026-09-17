import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { advancedSearch, CompaniesHouseError } from "@/lib/companiesHouse";
import { segmentById, formatAddress } from "@/lib/leads";

// Runs a Companies House search and returns what it found — WITHOUT
// saving anything. You look at the results first, then press Import.
export async function POST(request) {
  const body = await request.json();
  const segment = segmentById(body.segment);

  if (!segment) {
    return NextResponse.json({ error: "Pick a target group first." }, { status: 400 });
  }

  try {
    const { total, items } = await advancedSearch({
      sicCodes: segment.sicCodes,
      location: (body.location || "").trim(),
      size: body.size || 100,
      startIndex: body.startIndex || 0,
      incorporatedFrom: body.incorporatedFrom || undefined,
    });

    // Anything already in the leads table is flagged so the UI can grey
    // it out rather than offering it again.
    const numbers = items.map((i) => i.company_number).filter(Boolean);
    let known = new Set();
    if (numbers.length) {
      // Passed as one comma-separated string and split by Postgres, rather
      // than as an array parameter — array binding behaves differently
      // across drivers, a plain text parameter doesn't.
      const existing = await sql`
        select company_number from leads
        where company_number = any(string_to_array(${numbers.join(",")}, ','))
      `;
      known = new Set(existing.map((r) => r.company_number));
    }

    const results = items.map((item) => ({
      companyNumber: item.company_number || "",
      companyName: item.company_name || "",
      companyStatus: item.company_status || "",
      incorporatedOn: item.date_of_creation || "",
      sicCodes: item.sic_codes || [],
      address: formatAddress(item.registered_office_address),
      locality: item.registered_office_address?.locality || "",
      region: item.registered_office_address?.region || "",
      postcode: item.registered_office_address?.postal_code || "",
      alreadyImported: known.has(item.company_number),
    }));

    return NextResponse.json({
      total,
      returned: results.length,
      segment: segment.id,
      reviewRequired: segment.reviewRequired,
      results,
    });
  } catch (err) {
    if (err instanceof CompaniesHouseError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Couldn't reach Companies House just now. Try again in a moment." },
      { status: 502 }
    );
  }
}
