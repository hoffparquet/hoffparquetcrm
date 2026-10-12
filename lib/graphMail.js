// Reads the outreach mailbox (sales@) through Microsoft Graph.
//
// READ-ONLY: this file only ever lists messages. It never sends, moves,
// deletes or marks anything as read.
//
// It uses the "Hoff CRM mail" app registered in Microsoft Entra. The four
// settings come from Vercel environment variables:
//   MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, OUTREACH_MAILBOX

const GRAPH = "https://graph.microsoft.com/v1.0";

export class MailError extends Error {}

export function mailConfig() {
  const cfg = {
    tenant: (process.env.MS_TENANT_ID || "").trim(),
    clientId: (process.env.MS_CLIENT_ID || "").trim(),
    secret: (process.env.MS_CLIENT_SECRET || "").trim(),
    mailbox: (process.env.OUTREACH_MAILBOX || "").trim().toLowerCase(),
  };
  const missing = [
    !cfg.tenant && "MS_TENANT_ID",
    !cfg.clientId && "MS_CLIENT_ID",
    !cfg.secret && "MS_CLIENT_SECRET",
    !cfg.mailbox && "OUTREACH_MAILBOX",
  ].filter(Boolean);
  if (missing.length) {
    throw new MailError(`Missing in Vercel environment variables: ${missing.join(", ")}.`);
  }
  return cfg;
}

let cachedToken = null; // { value, expires } — reused for ~50 minutes

async function getToken(cfg) {
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.value;
  const token = await fetchToken(cfg);
  cachedToken = { value: token, expires: Date.now() + 50 * 60 * 1000 };
  return token;
}

async function fetchToken(cfg) {
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.secret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetch(`https://login.microsoftonline.com/${cfg.tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    const code = (json.error_description || json.error || `HTTP ${res.status}`).split("\r\n")[0];
    throw new MailError(
      `Microsoft refused the CRM's sign-in (${code}). Check MS_TENANT_ID, MS_CLIENT_ID and that ` +
        `MS_CLIENT_SECRET is the secret's Value (not its Secret ID).`
    );
  }
  return json.access_token;
}

// Lists messages in one folder received/sent since `sinceIso`.
// Follows Microsoft's paging, but stops at `limit` so a run never times out.
export async function listMessages({ folder, dateField, sinceIso, select, limit = 200 }) {
  const cfg = mailConfig();
  const token = await getToken(cfg);

  const params = new URLSearchParams({
    $filter: `${dateField} ge ${sinceIso}`,
    $orderby: `${dateField} asc`,
    $select: select,
    $top: "50",
  });
  let url = `${GRAPH}/users/${encodeURIComponent(cfg.mailbox)}/mailFolders/${folder}/messages?${params}`;
  const out = [];

  while (url && out.length < limit) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.body-content-type="text"' },
      cache: "no-store",
    });
    if (res.status === 403) {
      throw new MailError(
        "Microsoft says the CRM isn't allowed to read this mailbox. In Entra → App registrations → " +
          "Hoff CRM mail → API permissions, check Mail.Read (Application) shows a green 'Granted' tick."
      );
    }
    if (res.status === 404) {
      throw new MailError(`Mailbox ${cfg.mailbox} wasn't found. Check OUTREACH_MAILBOX in Vercel.`);
    }
    if (!res.ok) throw new MailError(`Microsoft Graph returned an error (${res.status}).`);
    const json = await res.json();
    out.push(...(json.value || []));
    url = json["@odata.nextLink"] || null;
  }
  return { mailbox: cfg.mailbox, messages: out.slice(0, limit) };
}

// ---------- Writing to drafts (used by the draft finisher) ----------
//
// These need the Mail.ReadWrite (Application) permission on the
// "Hoff CRM mail" app in Entra. They only ever touch messages in the
// outreach mailbox's Drafts folder — nothing is sent or deleted.

export async function graphRequest(path, { method = "GET", body } = {}) {
  const cfg = mailConfig();
  const url = `${GRAPH}/users/${encodeURIComponent(cfg.mailbox)}${path}`;
  const call = async (token) =>
    fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  let res = await call(await getToken(cfg));
  if (res.status === 403 || res.status === 401) {
    // A saved login may pre-date a newly granted permission — get a fresh one and retry once.
    cachedToken = null;
    res = await call(await getToken(cfg));
  }
  if (res.status === 403) {
    let why = "";
    try { why = (await res.clone().json())?.error?.message || ""; } catch (e) {}
    throw new MailError(
      `Microsoft refused (permission missing${why ? `: ${why}` : ""}).` +
        " In Entra → App registrations → Hoff CRM mail → API permissions, make sure Mail.ReadWrite AND Mail.Send (Application) show a green 'Granted' tick."
    );
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error?.message || "";
    } catch (e) {}
    throw new MailError(`Microsoft Graph returned an error (${res.status}) ${detail}`.trim());
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Diagnostics: which Application permissions Microsoft has granted the CRM
// (read from the login token — contains no secrets).
export async function grantedRoles() {
  cachedToken = null;
  const token = await getToken(mailConfig());
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return payload.roles || [];
  } catch (e) {
    return ["(could not read token)"];
  }
}

// Diagnostics: send a tiny test email from the outreach mailbox to itself and
// return Microsoft's raw answer.
export async function sendSelfTest() {
  cachedToken = null;
  const cfg = mailConfig();
  const token = await getToken(cfg);
  const res = await fetch(`${GRAPH}/users/${encodeURIComponent(cfg.mailbox)}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: { subject: "CRM send test", body: { contentType: "Text", content: "Test from Hoff CRM." },
        toRecipients: [{ emailAddress: { address: cfg.mailbox } }] },
      saveToSentItems: false,
    }),
    cache: "no-store",
  });
  return { status: res.status, body: (await res.text()).slice(0, 600) };
}

// Diagnostics: run each sending step for one draft, sending the copy to the
// outreach mailbox itself (never to the customer). Returns raw statuses.
export async function stepTest(draftId) {
  cachedToken = null;
  const cfg = mailConfig();
  const token = await getToken(cfg);
  const base = `${GRAPH}/users/${encodeURIComponent(cfg.mailbox)}`;
  const go = async (path, method = "GET", body) => {
    const r = await fetch(base + path, { method, cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined });
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch (e) {}
    return { status: r.status, json: j, text: t.slice(0, 400), headers: { "www-authenticate": r.headers.get("www-authenticate") } };
  };
  const out = {};
  const m = await go(`/messages/${draftId}?$select=subject,body,toRecipients,categories`);
  out.getMessage = m.status;
  const a = await go(`/messages/${draftId}/attachments`);
  out.getAttachments = { status: a.status, count: a.json?.value?.length, sample: a.status !== 200 ? a.text : undefined };
  const atts = (a.json?.value || []).map((x) => ({ "@odata.type": "#microsoft.graph.fileAttachment", name: x.name,
    contentType: x.contentType, contentBytes: x.contentBytes, isInline: !!x.isInline, ...(x.contentId ? { contentId: x.contentId } : {}) }));
  const send = await go(`/sendMail`, "POST", { message: { subject: "[TEST copy] " + (m.json?.subject || ""), body: m.json?.body,
    toRecipients: [{ emailAddress: { address: cfg.mailbox } }], attachments: atts }, saveToSentItems: false });
  out.sendCopyToSelf = { status: send.status, text: send.text, auth: send.headers["www-authenticate"] };
  const sendNoAtt = await go(`/sendMail`, "POST", { message: { subject: "[TEST no attachments]", body: m.json?.body,
    toRecipients: [{ emailAddress: { address: cfg.mailbox } }] }, saveToSentItems: false });
  out.sendNoAttachmentsToSelf = { status: sendNoAtt.status, text: sendNoAtt.text };
  return out;
}

// Diagnostics: variations of sendMail to the outreach mailbox itself.
export async function variantTest() {
  cachedToken = null;
  const cfg = mailConfig();
  const token = await getToken(cfg);
  const send = async (label, extra) => {
    const r = await fetch(`${GRAPH}/users/${encodeURIComponent(cfg.mailbox)}/sendMail`, { method: "POST", cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { subject: "[TEST] " + label, body: { contentType: "Text", content: "test" },
        toRecipients: [{ emailAddress: { address: cfg.mailbox } }], ...(extra.message || {}) }, saveToSentItems: !!extra.save }) });
    return { label, status: r.status, text: (await r.text()).slice(0, 300) };
  };
  return [
    await send("saveToSentItems", { save: true }),
    await send("categories", { message: { categories: ["Outreach", "Town: London"] } }),
    await send("both", { save: true, message: { categories: ["Outreach"] } }),
  ];
}
