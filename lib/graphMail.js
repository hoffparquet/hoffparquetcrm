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

async function getToken(cfg) {
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
