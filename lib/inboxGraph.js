// Reads mail from Microsoft 365 using Microsoft Graph, with an "app" login
// (no person signing in, no email password involved).
//
// Each inbox lives in its own Microsoft account, so each one has its own
// three settings, stored in Vercel's Environment Variables:
//   info@hoffparquet.co.uk -> MS_PARQUET_TENANT_ID / MS_PARQUET_CLIENT_ID / MS_PARQUET_CLIENT_SECRET
//   info@hofftimber.com    -> MS_TIMBER_TENANT_ID  / MS_TIMBER_CLIENT_ID  / MS_TIMBER_CLIENT_SECRET
// An inbox with any of its three settings missing is simply skipped.

const GRAPH = "https://graph.microsoft.com/v1.0";

const MAILBOX_DEFS = [
  // info@hoffparquet.co.uk is in the same Microsoft account as sales@, so it
  // can use the CRM's existing MS_TENANT_ID / MS_CLIENT_ID / MS_CLIENT_SECRET
  // login (used for outreach) unless MS_PARQUET_* settings are added instead.
  { address: "info@hoffparquet.co.uk", prefix: "MS_PARQUET", fallbackPrefix: "MS" },
  { address: "info@hofftimber.com", prefix: "MS_TIMBER" },
];

export function getMailboxes() {
  return MAILBOX_DEFS.map((d) => {
    const read = (name) =>
      (process.env[`${d.prefix}_${name}`] || (d.fallbackPrefix ? process.env[`${d.fallbackPrefix}_${name}`] : "") || "").trim();
    const tenantId = read("TENANT_ID");
    const clientId = read("CLIENT_ID");
    const clientSecret = read("CLIENT_SECRET");
    return {
      address: d.address,
      prefix: d.prefix,
      tenantId,
      clientId,
      clientSecret,
      configured: !!(tenantId && clientId && clientSecret),
    };
  });
}

async function getToken(mailbox) {
  const res = await fetch(`https://login.microsoftonline.com/${mailbox.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: mailbox.clientId,
      client_secret: mailbox.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Microsoft login failed for ${mailbox.address}: ${data.error_description || data.error || res.status}`);
  }
  return data.access_token;
}

// Follows Microsoft's "next page" links, up to maxPages, so a big backlog
// can't run forever inside one request.
async function fetchPages(firstUrl, token, maxPages) {
  const out = [];
  let url = firstUrl;
  for (let page = 0; url && page < maxPages; page++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: 'outlook.body-content-type="text"',
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || `Microsoft Graph error ${res.status}`);
    }
    out.push(...(data.value || []));
    url = data["@odata.nextLink"] || null;
  }
  return out;
}

function mailUrl(address, folder, params) {
  const qs = new URLSearchParams(params).toString();
  return `${GRAPH}/users/${encodeURIComponent(address)}/mailFolders/${folder}/messages?${qs}`;
}

export async function openMailbox(mailbox) {
  const token = await getToken(mailbox);
  return {
    // Incoming mail received since a date (newest first).
    async inboxSince(sinceIso, maxPages = 10) {
      return fetchPages(
        mailUrl(mailbox.address, "inbox", {
          $filter: `receivedDateTime ge ${sinceIso}`,
          $orderby: "receivedDateTime desc",
          $top: "50",
          $select: "id,conversationId,subject,from,receivedDateTime,body,internetMessageHeaders,isDraft",
        }),
        token,
        maxPages
      );
    },
    // Mail WE sent since a date — used to spot which enquiries were answered.
    async sentSince(sinceIso, maxPages = 10) {
      return fetchPages(
        mailUrl(mailbox.address, "sentitems", {
          $filter: `sentDateTime ge ${sinceIso}`,
          $orderby: "sentDateTime desc",
          $top: "100",
          $select: "id,conversationId,sentDateTime",
        }),
        token,
        maxPages
      );
    },
  };
}
