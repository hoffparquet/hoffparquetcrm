// Same job as lib/mappers.js, but for leads: the database uses
// snake_case columns, the frontend uses camelCase.

export function leadRowToApi(row) {
  return {
    id: row.id,
    companyNumber: row.company_number,
    companyName: row.company_name,
    companyStatus: row.company_status,
    incorporatedOn: row.incorporated_on,
    sicCodes: row.sic_codes || [],
    address: row.address,
    locality: row.locality,
    region: row.region,
    postcode: row.postcode,
    segment: row.segment,
    contactName: row.contact_name,
    email: row.email,
    emailStatus: row.email_status,
    phone: row.phone,
    website: row.website,
    status: row.status,
    reviewRequired: row.review_required,
    notes: row.notes,
    clientId: row.client_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LEAD_FIELD_MAP = {
  companyNumber: "company_number",
  companyName: "company_name",
  companyStatus: "company_status",
  incorporatedOn: "incorporated_on",
  address: "address",
  locality: "locality",
  region: "region",
  postcode: "postcode",
  segment: "segment",
  contactName: "contact_name",
  email: "email",
  emailStatus: "email_status",
  phone: "phone",
  website: "website",
  status: "status",
  reviewRequired: "review_required",
  notes: "notes",
};

export function leadPatchToColumns(patch) {
  const out = {};
  for (const [apiKey, column] of Object.entries(LEAD_FIELD_MAP)) {
    if (Object.prototype.hasOwnProperty.call(patch, apiKey)) {
      out[column] = patch[apiKey];
    }
  }
  return out;
}
