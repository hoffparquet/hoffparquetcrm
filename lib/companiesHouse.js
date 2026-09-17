import { sql } from "@/lib/db";

// Companies House public data API.
//
// Authentication is HTTP Basic with the API key as the username and an
// empty password — that's how they do it, there's no bearer token.
//
// The key is read from the lead_settings table (you paste it into the
// CRM's Email & Leads setup page), falling back to an environment
// variable if one is set in Vercel. Storing it in the database means you
// can change it without a redeploy.

const BASE = "https://api.company-information.service.gov.uk";

export async function getLeadSettings() {
  const rows = await sql`select data from lead_settings where id = 1`;
  return rows[0]?.data || {};
}

export async function saveLeadSettings(patch) {
  const current = await getLeadSettings();
  const next = { ...current, ...patch };
  await sql`
    insert into lead_settings (id, data) values (1, ${JSON.stringify(next)}::jsonb)
    on conflict (id) do update set data = ${JSON.stringify(next)}::jsonb
  `;
  return next;
}

export async function getApiKey() {
  const settings = await getLeadSettings();
  const fromDb = (settings.companiesHouseKey || "").trim();
  if (fromDb) return fromDb;
  return (process.env.COMPANIES_HOUSE_API_KEY || "").trim();
}

function authHeader(key) {
  // Basic auth: "<key>:" base64-encoded. Note the trailing colon —
  // the password is deliberately empty.
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

// Thrown so API routes can turn it into a readable message instead of a
// generic 500 with a stack trace.
export class CompaniesHouseError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function advancedSearch({ sicCodes, location, size = 100, startIndex = 0, incorporatedFrom }) {
  const key = await getApiKey();
  if (!key) {
    throw new CompaniesHouseError(
      "No Companies House API key saved yet. Add one on the Email & Leads setup page.",
      400
    );
  }

  const params = new URLSearchParams();
  if (sicCodes?.length) params.set("sic_codes", sicCodes.join(","));
  if (location) params.set("location", location);
  if (incorporatedFrom) params.set("incorporated_from", incorporatedFrom);
  params.set("company_status", "active");
  params.set("size", String(Math.min(Number(size) || 100, 500)));
  params.set("start_index", String(Number(startIndex) || 0));

  const res = await fetch(`${BASE}/advanced-search/companies?${params.toString()}`, {
    headers: { Authorization: authHeader(key), Accept: "application/json" },
    cache: "no-store",
  });

  if (res.status === 401) {
    throw new CompaniesHouseError(
      "Companies House rejected the API key. Check it was copied in full, with no spaces at either end.",
      401
    );
  }
  if (res.status === 429) {
    throw new CompaniesHouseError(
      "Companies House is rate-limiting us (600 requests per 5 minutes). Wait a couple of minutes and try again.",
      429
    );
  }
  if (!res.ok) {
    throw new CompaniesHouseError(`Companies House returned an error (${res.status}).`, res.status);
  }

  const body = await res.json();
  return {
    total: body.hits ?? 0,
    items: body.items || [],
  };
}

// Checks a key works without importing anything — used by the "Test key"
// button on the setup page.
export async function testApiKey(key) {
  const res = await fetch(`${BASE}/advanced-search/companies?size=1&company_status=active`, {
    headers: { Authorization: authHeader(key), Accept: "application/json" },
    cache: "no-store",
  });
  if (res.ok) return { ok: true };
  if (res.status === 401) return { ok: false, error: "That key was rejected. Check it was copied in full." };
  return { ok: false, error: `Companies House returned ${res.status}.` };
}
