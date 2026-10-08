import { sql } from "@/lib/db";
import { listMessages, mailConfig } from "@/lib/graphMail";
import { getLeadSettings, saveLeadSettings } from "@/lib/companiesHouse";
import { SEGMENTS, LOCATION_PRESETS } from "@/lib/leads";

// Checks the outreach mailbox (sales@) and updates the CRM.
//
//  1. SENT ITEMS — every outreach email you've sent becomes (or updates) a
//     lead marked "Contacted", grouped by the town the agent tagged it with.
//  2. INBOX — when one of those companies replies:
//       * a normal reply   → they become a client at "Initial Contact",
//                            with the reply copied into the client's notes
//       * "unsubscribe"    → lead marked Rejected (never contact again)
//       * a bounce         → lead's email marked invalid
//       * out-of-office    → ignored
//
// SAFETY: this only ever ADDS rows or fills in EMPTY fields. It never
// deletes a client or lead, never overwrites details you've typed, and
// never moves a client that's already further along the pipeline.
// Every processed email is logged, so running it twice does nothing new.

const OUTREACH_CATEGORY = "outreach";
const SUBJECT_PREFIX = (process.env.OUTREACH_SUBJECT || "Bespoke wood flooring").toLowerCase();

const GENERIC_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.co.uk", "live.com",
  "live.co.uk", "msn.com", "yahoo.com", "yahoo.co.uk", "icloud.com", "me.com", "aol.com",
  "btinternet.com", "sky.com", "virginmedia.com", "protonmail.com", "proton.me", "mail.com",
]);

const lower = (s) => (s || "").trim().toLowerCase();
const domainOf = (email) => lower(email).split("@")[1] || "";
const today = () => new Date().toISOString().slice(0, 10);

// The agent tags each draft with Outlook categories like
// "Outreach", "Town: Edinburgh", "Group: Architects", "Company: Smith Design Ltd".
function readTags(categories = []) {
  const tags = { isOutreach: false, town: "", group: "", company: "" };
  for (const c of categories) {
    if (lower(c) === OUTREACH_CATEGORY) tags.isOutreach = true;
    const m = /^\s*(town|group|company)\s*:\s*(.+?)\s*$/i.exec(c || "");
    if (m) tags[m[1].toLowerCase()] = m[2];
  }
  return tags;
}

function segmentFromGroup(group) {
  const g = lower(group);
  if (!g) return "";
  const hit = SEGMENTS.find(
    (s) => lower(s.label) === g || s.id === g.replace(/\s+/g, "_") || lower(s.label).startsWith(g.slice(0, 6))
  );
  return hit ? hit.id : "";
}

function regionForTown(town) {
  const t = lower(town);
  const hit = LOCATION_PRESETS.find((p) => p.places.some((place) => lower(place) === t));
  return hit ? hit.group : "";
}

function companyFromDomain(domain) {
  const stem = (domain || "").split(".")[0] || "";
  return stem
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// Keeps only the new text of a reply — cuts off the quoted original email,
// so our own "unsubscribe" footer can't be mistaken for their answer.
function replyText(preview) {
  const text = preview || "";
  const cut = text.search(/(\bFrom:|\bSent:|-----Original|_{8,}|\bOn .{5,80} wrote:)/i);
  return (cut >= 0 ? text.slice(0, cut) : text).trim();
}

function classify(msg) {
  const from = lower(msg.from?.emailAddress?.address);
  const subject = msg.subject || "";
  if (/mailer-daemon|postmaster|microsoftexchange/.test(from) ||
      /^(undeliverable|delivery (status notification|has failed)|mail delivery (failed|subsystem)|returned mail)/i.test(subject)) {
    return "bounce";
  }
  if (/^(automatic reply|auto[- ]?reply|autoreply|out of (the )?office)/i.test(subject)) return "auto";
  const text = `${subject}\n${replyText(msg.bodyPreview)}`;
  if (/\b(unsubscribe|remove (me|us)|stop emailing|do not (contact|email)|don'?t (contact|email))\b/i.test(text)) {
    return "unsubscribe";
  }
  return "reply";
}

// Claims a message in the log. Returns false if it was already processed.
async function claim(messageId, kind) {
  const rows = await sql`
    insert into outreach_mail_log (message_id, kind) values (${messageId}, ${kind})
    on conflict (message_id) do nothing
    returning message_id
  `;
  return rows.length > 0;
}

async function finishLog(messageId, { leadId = null, clientId = null, summary = "" }) {
  await sql`
    update outreach_mail_log
    set lead_id = ${leadId}, client_id = ${clientId}, summary = ${summary}
    where message_id = ${messageId}
  `;
}

// If processing fails part-way, release the claim so the next run retries it.
async function release(messageId) {
  await sql`delete from outreach_mail_log where message_id = ${messageId}`;
}

// ---------- 1. Sent items ----------

async function recordSent(msg, result) {
  const tags = readTags(msg.categories);
  const isOutreach = tags.isOutreach || lower(msg.subject).startsWith(SUBJECT_PREFIX);
  if (!isOutreach) return;
  if (!(await claim(msg.id, "sent"))) return;

  try {
    const sentAt = msg.sentDateTime || new Date().toISOString();
    const recipients = (msg.toRecipients || []).map((r) => lower(r.emailAddress?.address)).filter(Boolean);
    let lastLeadId = null;

    for (const email of recipients) {
      const domain = domainOf(email);
      const segment = segmentFromGroup(tags.group);
      const region = regionForTown(tags.town);
      const existing = await sql`select * from leads where lower(email) = ${email} limit 1`;

      if (existing.length) {
        const lead = existing[0];
        // Only fills EMPTY fields; only moves early statuses forward to "contacted".
        await sql`
          update leads set
            status = case when status in ('new','review','approved') then 'contacted' else status end,
            last_contacted_at = greatest(coalesce(last_contacted_at, ${sentAt}::timestamptz), ${sentAt}::timestamptz),
            outreach_conversation_id = case when outreach_conversation_id = '' then ${msg.conversationId || ""} else outreach_conversation_id end,
            locality = case when locality = '' then ${tags.town} else locality end,
            region = case when region = '' then ${region} else region end,
            segment = case when segment = '' then ${segment} else segment end,
            company_name = case when company_name = '' then ${tags.company} else company_name end,
            updated_at = now()
          where id = ${lead.id}
        `;
        lastLeadId = lead.id;
        result.leadsUpdated += 1;
      } else {
        const guessed = !tags.company;
        const companyName = tags.company || companyFromDomain(domain) || email;
        const website = domain && !GENERIC_DOMAINS.has(domain) ? `https://www.${domain}` : "";
        const note = [
          `Added automatically from outreach email sent ${sentAt.slice(0, 10)}.`,
          guessed ? "Company name was guessed from the email address — please check." : null,
        ].filter(Boolean).join(" ");
        const rows = await sql`
          insert into leads (
            company_name, locality, region, segment, email, website,
            status, notes, last_contacted_at, outreach_conversation_id
          ) values (
            ${companyName}, ${tags.town}, ${region}, ${segment}, ${email}, ${website},
            'contacted', ${note}, ${sentAt}::timestamptz, ${msg.conversationId || ""}
          )
          returning id
        `;
        lastLeadId = rows[0].id;
        result.leadsAdded += 1;
      }
    }
    await finishLog(msg.id, { leadId: lastLeadId, summary: `Sent to ${recipients.join(", ")}` });
  } catch (e) {
    await release(msg.id);
    result.errors.push(`Sent email "${msg.subject}": ${e.message}`);
  }
}

// ---------- 2. Inbox ----------

async function findLeadForReply(msg) {
  const from = lower(msg.from?.emailAddress?.address);
  if (msg.conversationId) {
    const byConv = await sql`
      select * from leads where outreach_conversation_id = ${msg.conversationId} limit 1
    `;
    if (byConv.length) return byConv[0];
  }
  if (!from) return null;
  const byEmail = await sql`select * from leads where lower(email) = ${from} limit 1`;
  if (byEmail.length) return byEmail[0];

  // A colleague at the same company replied from a different address.
  const domain = domainOf(from);
  if (domain && !GENERIC_DOMAINS.has(domain)) {
    const byDomain = await sql`
      select * from leads
      where split_part(lower(email), '@', 2) = ${domain}
        and status in ('contacted','replied','converted')
      order by last_contacted_at desc nulls last
      limit 1
    `;
    if (byDomain.length) return byDomain[0];
  }
  return null;
}

async function appendLeadNote(leadId, line) {
  await sql`
    update leads
    set notes = case when notes = '' then ${line} else notes || E'\n' || ${line} end,
        updated_at = now()
    where id = ${leadId}
  `;
}

async function addClientNote(clientId, body) {
  await sql`insert into notes (client_id, note_date, body) values (${clientId}, ${today()}, ${body})`;
}

async function handleInbound(msg, mailbox, result) {
  const from = lower(msg.from?.emailAddress?.address);
  if (!from || from === mailbox) return;

  const lead = await findLeadForReply(msg);
  if (!lead) return; // not one of ours — leave it alone

  const kind = classify(msg);
  if (!(await claim(msg.id, kind === "auto" ? "ignored" : kind))) return;

  try {
    const when = (msg.receivedDateTime || new Date().toISOString()).slice(0, 10);

    if (kind === "auto") {
      await finishLog(msg.id, { leadId: lead.id, summary: "Out-of-office / automatic reply" });
      return;
    }

    if (kind === "bounce") {
      await sql`update leads set email_status = 'invalid', updated_at = now() where id = ${lead.id}`;
      await appendLeadNote(lead.id, `${when}: outreach email bounced — address looks invalid.`);
      await finishLog(msg.id, { leadId: lead.id, summary: "Bounced" });
      result.bounces += 1;
      return;
    }

    if (kind === "unsubscribe") {
      await sql`update leads set status = 'rejected', last_reply_at = now(), updated_at = now() where id = ${lead.id}`;
      await appendLeadNote(lead.id, `${when}: asked not to be contacted again (${from}). Do not email.`);
      if (lead.client_id) {
        await addClientNote(lead.client_id, `Asked not to receive marketing emails (${from}, ${when}).`);
      }
      await finishLog(msg.id, { leadId: lead.id, clientId: lead.client_id, summary: "Unsubscribed" });
      result.unsubscribes += 1;
      return;
    }

    // A real reply.
    const senderName = (msg.from?.emailAddress?.name || "").trim();
    const noteBody = [
      `Replied to outreach email on ${when}.`,
      `From: ${senderName ? `${senderName} <${from}>` : from}`,
      `Subject: ${msg.subject || "(no subject)"}`,
      "",
      replyText(msg.bodyPreview) || "(see the full email in sales@)",
    ].join("\n");

    let clientId = lead.client_id;
    let created = false;

    if (!clientId) {
      // Already a client under that email? Link to them rather than duplicating.
      const existing = await sql`select id from clients where lower(email) = ${from} limit 1`;
      if (existing.length) clientId = existing[0].id;
    }

    if (!clientId) {
      const contactName =
        senderName && !senderName.includes("@") ? senderName : lead.contact_name || lead.company_name;
      const rows = await sql`
        insert into clients (
          name, company_name, email, phone, address,
          project_category, source, stage, dates
        ) values (
          ${contactName}, ${lead.company_name}, ${from}, ${lead.phone || ""}, ${lead.address || ""},
          'Commercial', 'Trade Partner', 'new_lead',
          ${JSON.stringify({ contactDate: today() })}::jsonb
        )
        returning id
      `;
      clientId = rows[0].id;
      created = true;

      const background = [
        "Came from email outreach (sales@).",
        lead.locality ? `Location: ${lead.locality}${lead.region ? `, ${lead.region}` : ""}` : null,
        lead.website ? `Website: ${lead.website}` : null,
        lead.company_number ? `Companies House number: ${lead.company_number}` : null,
        lead.notes ? `Lead notes: ${lead.notes}` : null,
      ].filter(Boolean).join("\n");
      await addClientNote(clientId, background);
    }

    await addClientNote(clientId, noteBody);
    await sql`
      update leads set
        status = case when status = 'rejected' then status else 'converted' end,
        client_id = ${clientId},
        contact_name = case when contact_name = '' then ${senderName} else contact_name end,
        last_reply_at = now(),
        updated_at = now()
      where id = ${lead.id}
    `;
    await finishLog(msg.id, { leadId: lead.id, clientId, summary: created ? "Reply — new client" : "Reply — note added" });
    if (created) result.clientsCreated += 1;
    else result.notesAdded += 1;
  } catch (e) {
    await release(msg.id);
    result.errors.push(`Reply from ${from}: ${e.message}`);
  }
}

// ---------- Run ----------

export async function syncOutreachMailbox() {
  const startedAt = new Date().toISOString();
  const result = {
    leadsAdded: 0, leadsUpdated: 0, clientsCreated: 0, notesAdded: 0,
    unsubscribes: 0, bounces: 0, errors: [],
  };

  const { mailbox } = mailConfig();
  const settings = await getLeadSettings();
  // Look back a couple of days past the last run, as a safety margin — the
  // log stops anything being processed twice. First run looks back 30 days.
  const last = settings.mailLastSync ? new Date(settings.mailLastSync) : null;
  const since = new Date((last ? last.getTime() - 2 * 864e5 : Date.now() - 30 * 864e5)).toISOString();

  const sent = await listMessages({
    folder: "SentItems",
    dateField: "sentDateTime",
    sinceIso: since,
    select: "id,subject,toRecipients,sentDateTime,categories,conversationId",
  });
  for (const msg of sent.messages) await recordSent(msg, result);

  const inbox = await listMessages({
    folder: "Inbox",
    dateField: "receivedDateTime",
    sinceIso: since,
    select: "id,subject,from,receivedDateTime,bodyPreview,conversationId",
  });
  for (const msg of inbox.messages) await handleInbound(msg, mailbox, result);

  await saveLeadSettings({ mailLastSync: startedAt, mailLastResult: { ...result, at: startedAt } });
  return { ...result, at: startedAt, mailbox };
}
