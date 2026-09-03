export const STAGES = [
  { id: "new_lead", label: "Initial Contact", short: "Contact" },
  { id: "samples_ordered", label: "Samples Ordered", short: "Samples Ordered" },
  { id: "samples_posted", label: "Samples Posted", short: "Samples Posted" },
  { id: "quotation_sent", label: "Quotation Sent", short: "Quote Sent" },
  { id: "order_placed", label: "Order Placed", short: "Order Placed" },
  { id: "paid", label: "Paid", short: "Paid" },
  { id: "in_production", label: "Submitted to Production", short: "Production" },
  { id: "workshop_delivery", label: "Delivered to Workshop", short: "At Workshop" },
  { id: "client_delivery", label: "Delivered to Client", short: "At Client" },
  { id: "install_booked", label: "Installation Booked", short: "Booked" },
  { id: "completed", label: "Installation Completed", short: "Completed" },
];

export const PROJECT_TYPES = [
  "Herringbone", "Chevron", "Versailles Panel", "Wide Plank", "Traditional Strip",
  "Mansion Weave", "Engineered Wood Flooring", "Solid Wood Flooring",
  "Bespoke Wood Flooring", "Stair Cladding", "Installation & Labour",
  "Repair & Restoration", "Other",
];

export const WOOD_SPECIES = [
  "European Oak", "French Oak", "Walnut", "Ash", "Maple", "Wenge",
  "Reclaimed Oak", "Douglas Fir", "Larch", "Pine", "Other",
];

export const SOURCES = [
  "Referral", "Website Enquiry", "Showroom Visit", "Architect / Designer",
  "Trade Partner", "Repeat Client", "Other",
];

export const QUOTE_UNITS = ["m²", "linear m", "step", "item", "hour", "day"];

export const DEFAULT_TERMS = [
  "This quotation is valid for the period stated above; prices may change after that date.",
  "Payment for materials is required in advance of order confirmation, except where otherwise agreed in writing.",
  "Goods remain the property of Hoff Parquet until paid for in full.",
  "Lead times are estimates and may vary depending on the supplier and finish selected.",
  "This quotation covers supply only, unless installation is listed as a line item above.",
  "Please check all measurements before confirming your order — final quantities are based on the site survey.",
].join("\n");

export const DEFAULT_INVOICE_TERMS_PRODUCTS = [
  "Payment for materials is due in advance, except where otherwise agreed in writing.",
  "Goods remain the property of Hoff Parquet until paid for in full.",
  "Please quote the invoice number as your payment reference.",
].join("\n");

export const DEFAULT_INVOICE_TERMS_INSTALLATION = [
  "Payment for installation is due on delivery of materials to site and completion of the installation works, except where otherwise agreed in writing.",
  "This invoice covers installation labour for the works completed on site.",
  "Please quote the invoice number as your payment reference.",
].join("\n");

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const todayISO = () => new Date().toISOString().slice(0, 10);

export function addDays(iso, n) {
  const d = new Date((iso || todayISO()) + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + (String(iso).length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
}

export function stageIndex(stageId) {
  const i = STAGES.findIndex((s) => s.id === stageId);
  return i === -1 ? 0 : i;
}

export function lineTotal(it) {
  const gross = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
  const discount = Number(it.discountPercent) || 0;
  return gross * (1 - discount / 100);
}

export function itemsSubtotal(items) {
  return (items || []).reduce((sum, it) => sum + lineTotal(it), 0);
}

export function b2bPriceOf(variation) {
  if (variation.b2bPrice !== undefined && variation.b2bPrice !== null && variation.b2bPrice !== "") {
    return Number(variation.b2bPrice);
  }
  return Math.round(Number(variation.price || 0) * 0.85 * 100) / 100;
}

export function hasCost(variation) {
  return variation.costPrice !== undefined && variation.costPrice !== null && variation.costPrice !== "";
}

export function marginAmount(variation) {
  if (!hasCost(variation)) return null;
  return (Number(variation.price) || 0) - Number(variation.costPrice);
}

export function marginPercent(variation) {
  if (!hasCost(variation)) return null;
  const sell = Number(variation.price) || 0;
  if (sell === 0) return null;
  return (marginAmount(variation) / sell) * 100;
}
