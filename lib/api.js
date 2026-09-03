async function handle(res) {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch (e) {
      // ignore — use default message
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listClients: () => fetch("/api/clients").then(handle),
  getClient: (id) => fetch(`/api/clients/${id}`).then(handle),
  createClient: (data) =>
    fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handle),
  updateClient: (id, patch) =>
    fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(handle),
  deleteClient: (id) => fetch(`/api/clients/${id}`, { method: "DELETE" }).then(handle),

  addNote: (clientId, body) =>
    fetch(`/api/clients/${clientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }).then(handle),

  listQuotes: (clientId) => fetch(`/api/clients/${clientId}/quotes`).then(handle),
  saveQuote: (clientId, quote) =>
    fetch(`/api/clients/${clientId}/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quote),
    }).then(handle),
  deleteQuote: (clientId, quoteId) =>
    fetch(`/api/clients/${clientId}/quotes/${quoteId}`, { method: "DELETE" }).then(handle),
  markQuoteSent: (clientId, quoteId) =>
    fetch(`/api/clients/${clientId}/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    }).then(handle),

  listInvoices: (clientId) => fetch(`/api/clients/${clientId}/invoices`).then(handle),
  saveInvoice: (clientId, invoice) =>
    fetch(`/api/clients/${clientId}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoice),
    }).then(handle),
  deleteInvoice: (clientId, invoiceId) =>
    fetch(`/api/clients/${clientId}/invoices/${invoiceId}`, { method: "DELETE" }).then(handle),
  markInvoicePaid: (clientId, invoiceId) =>
    fetch(`/api/clients/${clientId}/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    }).then(handle),

  listOrderSheets: (clientId) => fetch(`/api/clients/${clientId}/order-sheets`).then(handle),
  saveOrderSheet: (clientId, orderSheet) =>
    fetch(`/api/clients/${clientId}/order-sheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderSheet),
    }).then(handle),
  deleteOrderSheet: (clientId, orderId) =>
    fetch(`/api/clients/${clientId}/order-sheets/${orderId}`, { method: "DELETE" }).then(handle),
  markOrderSheetSent: (clientId, orderId) =>
    fetch(`/api/clients/${clientId}/order-sheets/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    }).then(handle),

  listProducts: () => fetch("/api/products").then(handle),
  saveProduct: (product) =>
    fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    }).then(handle),
  deleteProduct: (id) => fetch(`/api/products/${id}`, { method: "DELETE" }).then(handle),

  getSettings: () => fetch("/api/settings").then(handle),
  updateSettings: (patch) =>
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(handle),
};
