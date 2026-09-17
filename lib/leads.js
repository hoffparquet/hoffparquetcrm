// Target segments for lead research.
//
// Each segment is a group of official UK SIC codes — the industry codes
// every company gives Companies House when it registers. Searching by
// these is what lets us pull, say, "every active architecture practice
// registered in Edinburgh" rather than guessing from company names.
//
// Codes verified against the Companies House SIC list (UK SIC 2007).

export const SEGMENTS = [
  {
    id: "architects",
    label: "Architects",
    blurb: "Architecture practices — the people who write the specification.",
    sicCodes: ["71111", "71112"],
    sicLabels: {
      71111: "Architectural activities",
      71112: "Urban planning and landscape architectural activities",
    },
    reviewRequired: false,
  },
  {
    id: "interior_designers",
    label: "Interior designers",
    blurb: "Specialised design activities — interior designers register here.",
    sicCodes: ["74100"],
    sicLabels: { 74100: "Specialised design activities" },
    reviewRequired: false,
  },
  {
    id: "developers",
    label: "Property developers",
    blurb: "Companies developing building projects and holding their own property.",
    sicCodes: ["41100", "68100"],
    sicLabels: {
      41100: "Development of building projects",
      68100: "Buying and selling of own real estate",
    },
    reviewRequired: false,
  },
  {
    id: "builders",
    label: "Builders & contractors",
    blurb: "Construction firms building commercial and domestic properties.",
    sicCodes: ["41201", "41202"],
    sicLabels: {
      41201: "Construction of commercial buildings",
      41202: "Construction of domestic buildings",
    },
    reviewRequired: false,
  },
  {
    id: "fitout_joinery",
    label: "Fit-out & joinery",
    blurb:
      "Joinery and floor-covering firms. Some are trade customers who'd buy your oak and fit it themselves — some are direct competitors. Imported for review only; nothing here is contacted until you approve it one by one.",
    sicCodes: ["43320", "43330", "43390"],
    sicLabels: {
      43320: "Joinery installation",
      43330: "Floor and wall covering",
      43390: "Other building completion and finishing",
    },
    reviewRequired: true,
  },
  {
    id: "hospitality",
    label: "Hotels & restaurants",
    blurb: "Commercial spaces that refit regularly — hotels and licenced restaurants.",
    sicCodes: ["55100", "56101"],
    sicLabels: {
      55100: "Hotels and similar accommodation",
      56101: "Licenced restaurants",
    },
    reviewRequired: false,
  },
];

export function segmentById(id) {
  return SEGMENTS.find((s) => s.id === id) || null;
}

export function segmentLabel(id) {
  return segmentById(id)?.label || id || "—";
}

// Scotland first, then the rest of the UK — matches the plan.
export const LOCATION_PRESETS = [
  { group: "Scotland", places: ["Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Stirling", "Perth", "Inverness"] },
  { group: "North of England", places: ["Newcastle", "Leeds", "Manchester", "Liverpool", "York", "Sheffield"] },
  { group: "Rest of UK", places: ["London", "Birmingham", "Bristol", "Cardiff", "Oxford", "Cambridge", "Brighton"] },
];

export const LEAD_STATUSES = [
  { id: "new", label: "New", badge: "hp-badge-slate" },
  { id: "review", label: "Needs review", badge: "hp-badge-amber" },
  { id: "approved", label: "Approved", badge: "hp-badge-oak" },
  { id: "contacted", label: "Contacted", badge: "hp-badge-oak" },
  { id: "replied", label: "Replied", badge: "hp-badge-sage" },
  { id: "converted", label: "Converted", badge: "hp-badge-sage" },
  { id: "rejected", label: "Rejected", badge: "hp-badge-slate" },
];

export function statusMeta(id) {
  return LEAD_STATUSES.find((s) => s.id === id) || { id, label: id || "—", badge: "hp-badge-slate" };
}

// Turns a Companies House registered office address object into one line.
export function formatAddress(a) {
  if (!a) return "";
  return [a.address_line_1, a.address_line_2, a.locality, a.region, a.postal_code]
    .filter(Boolean)
    .join(", ");
}
