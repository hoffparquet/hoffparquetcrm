// The database uses snake_case columns; the frontend (carried over from the
// original CRM) uses camelCase fields. These functions translate between them
// so nothing else in the app has to think about the difference.

export function clientRowToApi(row, notes = [], quotes = [], invoices = []) {
  return {
    id: row.id,
    name: row.name,
    companyName: row.company_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    projectType: row.project_type,
    woodSpecies: row.wood_species,
    areaSqm: row.area_sqm,
    rooms: row.rooms,
    source: row.source,
    estimateValue: row.estimate_value,
    depositAmount: row.deposit_amount,
    paidInFull: row.paid_in_full,
    installationDate: row.installation_date,
    stage: row.stage,
    dates: row.dates || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: notes.map(noteRowToApi),
    quotes: quotes.map(quoteRowToApi),
    invoices: invoices.map(invoiceRowToApi),
  };
}

export function noteRowToApi(row) {
  return { id: row.id, date: row.note_date, text: row.body };
}

export function quoteRowToApi(row) {
  return {
    id: row.id,
    number: row.number,
    dateCreated: row.date_created,
    validUntil: row.valid_until,
    items: row.items || [],
    applyVat: row.apply_vat,
    vatRate: Number(row.vat_rate),
    terms: row.terms,
    notes: row.notes,
    scope: row.scope,
    status: row.status,
  };
}

export function invoiceRowToApi(row) {
  return {
    id: row.id,
    number: row.number,
    type: row.type,
    dateIssued: row.date_issued,
    dateOfSupply: row.date_of_supply,
    dueDate: row.due_date,
    items: row.items || [],
    applyVat: row.apply_vat,
    vatRate: Number(row.vat_rate),
    terms: row.terms,
    notes: row.notes,
    status: row.status,
    paidDate: row.paid_date,
  };
}

// Maps a partial API-shaped patch object to { column: value } pairs,
// only including keys that were actually present in the patch.
const CLIENT_FIELD_MAP = {
  name: "name",
  companyName: "company_name",
  email: "email",
  phone: "phone",
  address: "address",
  projectType: "project_type",
  woodSpecies: "wood_species",
  areaSqm: "area_sqm",
  rooms: "rooms",
  source: "source",
  estimateValue: "estimate_value",
  depositAmount: "deposit_amount",
  paidInFull: "paid_in_full",
  installationDate: "installation_date",
  stage: "stage",
  dates: "dates",
};

export function clientPatchToColumns(patch) {
  const out = {};
  for (const [apiKey, column] of Object.entries(CLIENT_FIELD_MAP)) {
    if (Object.prototype.hasOwnProperty.call(patch, apiKey)) {
      out[column] = patch[apiKey];
    }
  }
  return out;
}
