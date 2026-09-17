// Same shape as lib/api.js, kept in its own file so the lead module
// doesn't touch anything the rest of the CRM depends on.

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

const post = (url, data) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handle);

export const leadApi = {
  list: () => fetch("/api/leads").then(handle),
  create: (lead) => post("/api/leads", lead),
  update: (id, patch) =>
    fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(handle),
  remove: (id) => fetch(`/api/leads/${id}`, { method: "DELETE" }).then(handle),
  convert: (id) => post(`/api/leads/${id}/convert`, {}),

  search: (params) => post("/api/leads/search", params),
  import: (params) => post("/api/leads/import", params),

  getSettings: () => fetch("/api/lead-settings").then(handle),
  saveSettings: (patch) =>
    fetch("/api/lead-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(handle),
  testKey: (companiesHouseKey) => post("/api/lead-settings", { companiesHouseKey }),

  checkEmailSetup: (domain) => post("/api/email-setup/check", { domain }),
};
