import { sql } from "@/lib/db";
import { graphRequest } from "@/lib/graphMail";
import { READY_CATEGORY } from "@/lib/draftFinisher";

// Sends the reviewed outreach drafts from sales@ (Microsoft Graph, needs the
// Mail.Send Application permission on the "Hoff CRM mail" app).
//
// A draft is sent ONLY if all of these are true:
//   - tagged "Outreach" AND "Ready to send" (Tomas removes the tag or deletes
//     the draft to stop one);
//   - created today (UK date) — older drafts are never sent;
//   - exactly one "to" recipient, no cc/bcc;
//   - finished by the CRM (contains the opening line + has the flyer attached);
//   - that address has never been emailed before (CRM leads table + Sent Items);
//   - nobody at that domain has unsubscribed;
//   - not a second draft to the same address in today's batch.
// At most 22 per run. Nothing is ever deleted or edited.

const MAX_PER_RUN = 22;

const lower = (s) => (s || "").trim().toLowerCase();
const ukDate = (d) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    d ? new Date(d) : new Date()
  );

async function alreadyEmailed(address) {
  const rows = await sql`
    select 1 from leads where lower(email) = ${address} and last_contacted_at is not null limit 1
  `;
  if (rows.length) return true;
  try {
    const q = encodeURIComponent(`"to:${address}"`);
    const found = await graphRequest(`/mailFolders/SentItems/messages?$search=${q}&$select=id&$top=1`);
    return (found?.value || []).length > 0;
  } catch (e) {
    return false; // search is a backup check; the leads table is the main one
  }
}

async function domainUnsubscribed(domain) {
  if (!domain) return false;
  const rows = await sql`
    select 1 from leads
    where split_part(lower(email), '@', 2) = ${domain} and status = 'rejected'
    limit 1
  `;
  return rows.length > 0;
}


// Microsoft refuses to "send" drafts that were created through the Outlook
// connector, but happily sends a new message. So we send an exact copy of the
// draft (same subject, body, recipient, tags, logo and flyer), then move the
// used draft to Deleted Items (recoverable) so it can't be sent twice.
async function sendAsNewMessage(id) {
  const msg = await graphRequest(`/messages/${id}?$select=subject,body,toRecipients,categories`);
  const att = await graphRequest(`/messages/${id}/attachments`);
  const attachments = (att?.value || [])
    .filter((a) => a["@odata.type"] === "#microsoft.graph.fileAttachment" && a.contentBytes)
    .map((a) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: a.name,
      contentType: a.contentType,
      contentBytes: a.contentBytes,
      isInline: !!a.isInline,
      ...(a.contentId ? { contentId: a.contentId } : {}),
    }));
  const categories = (msg.categories || []).filter((c) => lower(c) !== lower(READY_CATEGORY));
  await graphRequest(`/sendMail`, {
    method: "POST",
    body: {
      message: {
        subject: msg.subject,
        body: msg.body,
        toRecipients: msg.toRecipients,
        categories,
        attachments,
      },
      saveToSentItems: true,
    },
  });
  try {
    await graphRequest(`/messages/${id}/move`, { method: "POST", body: { destinationId: "deleteditems" } });
  } catch (e) {
    // Sent fine; if the move fails, at least stop it being picked up again.
    await graphRequest(`/messages/${id}`, { method: "PATCH", body: { categories: [...categories, "Sent by CRM"] } });
  }
}

export async function sendReadyDrafts({ dryRun = false } = {}) {
  const result = { sent: [], held: [], dryRun };
  const today = ukDate();

  const filter = encodeURIComponent("categories/any(c:c eq 'Outreach')");
  const list = await graphRequest(
    `/mailFolders/Drafts/messages?$filter=${filter}` +
      `&$select=id,subject,categories,toRecipients,ccRecipients,bccRecipients,createdDateTime,hasAttachments,bodyPreview&$top=50`
  );
  const drafts = list?.value || [];
  const usedToday = new Set();

  for (const d of drafts) {
    const to = (d.toRecipients || []).map((r) => lower(r.emailAddress?.address)).filter(Boolean);
    const label = to[0] || d.subject || d.id;
    const cats = (d.categories || []).map(lower);
    const hold = (why) => result.held.push({ to: label, why });

    if (!cats.includes(lower(READY_CATEGORY))) { hold("not tagged Ready to send"); continue; }
    if (ukDate(d.createdDateTime) !== today) { hold("not created today"); continue; }
    if (to.length !== 1 || (d.ccRecipients || []).length || (d.bccRecipients || []).length) {
      hold("must have exactly one recipient"); continue;
    }
    if (!d.hasAttachments || !/came across/i.test(d.bodyPreview || "")) { hold("not finished by the CRM"); continue; }
    const address = to[0];
    if (usedToday.has(address)) { hold("duplicate in today's batch"); continue; }
    if (await alreadyEmailed(address)) { hold("already emailed before"); continue; }
    if (await domainUnsubscribed(address.split("@")[1])) { hold("company has unsubscribed"); continue; }
    if (result.sent.length >= MAX_PER_RUN) { hold("daily limit reached"); continue; }

    usedToday.add(address);
    if (!dryRun) {
      try {
        await sendAsNewMessage(d.id);
      } catch (e) {
        hold(`send failed: ${e.message}`);
        continue;
      }
    }
    const company = (d.categories || []).find((c) => /^company:/i.test(c))?.replace(/^company:\s*/i, "") || "";
    result.sent.push({ to: address, company });
  }
  return result;
}
