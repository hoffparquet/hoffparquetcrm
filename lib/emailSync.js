import { sql } from "@/lib/db";
import { getMailboxes, openMailbox } from "@/lib/inboxGraph";
import { classifyEmail, makeSnippet } from "@/lib/enquiryFilter";

function todayOf(isoDate) {
  return String(isoDate || new Date().toISOString()).slice(0, 10);
}

// Adds an email enquiry to the CRM. If a client with the same email address
// already exists, the email is added to THEIR notes instead of creating a
// duplicate. Returns the client id.
export async function addEmailToCrm(row) {
  const email = String(row.sender_email || "").trim();
  const dateStr = todayOf(row.received_at);
  const noteBody =
    `Email enquiry received at ${row.mailbox} — "${row.subject || "(no subject)"}"` +
    (row.snippet ? `\n\n${row.snippet}` : "");

  let clientId = null;
  if (email) {
    const existing = await sql`select id from clients where lower(email) = ${email.toLowerCase()} limit 1`;
    if (existing.length > 0) clientId = existing[0].id;
  }

  if (!clientId) {
    const fallbackName = email ? email.split("@")[0] : "Email enquiry";
    const name = (row.sender_name || "").trim() || fallbackName;
    const created = await sql`
      insert into clients (name, email, source, stage, dates)
      values (
        ${name.slice(0, 200)}, ${email.slice(0, 200)}, 'Email Enquiry', 'new_lead',
        ${JSON.stringify({ contactDate: dateStr })}::jsonb
      )
      returning id
    `;
    clientId = created[0].id;
  }

  await sql`insert into notes (client_id, note_date, body) values (${clientId}, ${dateStr}, ${noteBody.slice(0, 3000)})`;
  await sql`update email_messages set client_id = ${clientId} where id = ${row.id}`;
  return clientId;
}

// Checks every configured inbox.
//   backfillDays: look back this many days (used for the one-off "check old
//     emails" run). In that mode emails are only RECORDED and checked for
//     replies — nothing is added to the CRM automatically.
//   otherwise: only mail that arrived since the last check is looked at, and
//     new flooring/service enquiries ARE added to the CRM.
export async function syncMailboxes({ backfillDays = 0 } = {}) {
  const results = [];
  const isBackfill = backfillDays > 0;

  for (const mailbox of getMailboxes()) {
    const result = { mailbox: mailbox.address, configured: mailbox.configured, newMessages: 0, newEnquiries: 0, clientsAdded: 0, repliesMatched: 0, error: null };
    if (!mailbox.configured) {
      results.push(result);
      continue;
    }

    try {
      const now = new Date();
      let since;
      if (isBackfill) {
        since = new Date(now.getTime() - backfillDays * 86400000);
      } else {
        const state = await sql`select last_synced from email_sync_state where mailbox = ${mailbox.address}`;
        // Very first routine run: start from "now", so old mail is never
        // added to the CRM by surprise. Otherwise overlap by 2 hours so
        // nothing slips through the gaps (duplicates are ignored anyway).
        since = state.length > 0 ? new Date(new Date(state[0].last_synced).getTime() - 2 * 3600000) : new Date(now.getTime() - 3600000);
      }
      const sinceIso = since.toISOString();

      const box = await openMailbox(mailbox);
      const incoming = await box.inboxSince(sinceIso, isBackfill ? 20 : 6);

      for (const msg of incoming) {
        const { isEnquiry } = classifyEmail(msg);
        const senderEmail = String(msg?.from?.emailAddress?.address || "").toLowerCase();
        const senderName = String(msg?.from?.emailAddress?.name || "");
        const inserted = await sql`
          insert into email_messages (
            mailbox, graph_id, conversation_id, sender_email, sender_name, subject, snippet, received_at, is_enquiry
          ) values (
            ${mailbox.address}, ${msg.id}, ${msg.conversationId || ""}, ${senderEmail}, ${senderName.slice(0, 200)},
            ${String(msg.subject || "").slice(0, 300)}, ${makeSnippet(msg)}, ${msg.receivedDateTime}, ${isEnquiry}
          )
          on conflict (mailbox, graph_id) do nothing
          returning *
        `;
        if (inserted.length === 0) continue; // already known
        result.newMessages++;
        if (isEnquiry) {
          result.newEnquiries++;
          if (!isBackfill) {
            await addEmailToCrm(inserted[0]);
            result.clientsAdded++;
          }
        }
      }

      // Which enquiries have since been answered? Look at what we SENT.
      const sent = await box.sentSince(sinceIso, isBackfill ? 20 : 6);
      const latestSentByConversation = new Map();
      for (const s of sent) {
        if (!s.conversationId) continue;
        const prev = latestSentByConversation.get(s.conversationId);
        if (!prev || s.sentDateTime > prev) latestSentByConversation.set(s.conversationId, s.sentDateTime);
      }
      const entries = Array.from(latestSentByConversation.entries()).slice(0, 600);
      for (const [conv, sentAt] of entries) {
        const updated = await sql`
          update email_messages
          set replied = true, replied_at = ${sentAt}
          where mailbox = ${mailbox.address} and conversation_id = ${conv}
            and replied = false and received_at < ${sentAt}
          returning id
        `;
        result.repliesMatched += updated.length;
      }

      if (!isBackfill) {
        await sql`
          insert into email_sync_state (mailbox, last_synced) values (${mailbox.address}, ${now.toISOString()})
          on conflict (mailbox) do update set last_synced = excluded.last_synced
        `;
      } else {
        // Make sure routine checks start from now if they've never run.
        await sql`
          insert into email_sync_state (mailbox, last_synced) values (${mailbox.address}, ${now.toISOString()})
          on conflict (mailbox) do nothing
        `;
      }
    } catch (err) {
      result.error = String(err?.message || err).slice(0, 300);
    }
    results.push(result);
  }
  return results;
}
