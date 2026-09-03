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

  getSettings: () => fetch("/api/settings").then(handle),
  updateSettings: (patch) =>
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(handle),
};
