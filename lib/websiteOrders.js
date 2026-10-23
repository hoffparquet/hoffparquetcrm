import { sql } from "@/lib/db";
import { graphRequest } from "@/lib/graphMail";

// Online orders from hoffparquet.co.uk (paid through Mollie).
//
// The table is created automatically the first time it's needed — there is no
// migration to run by hand. Orders that arrived before this table existed are
// copied in once from the "Website order …" notes on client cards.
//
// Status: new → packed → sent (or cancelled). Each change is time-stamped.

export const ORDER_STATUSES = ["new", "packed", "sent", "cancelled"];

let ready = null;

export function ensureOrdersTable() {
  if (!ready) {
    ready = (async () => {
      await sql`
        create table if not exists website_orders (
          id serial primary key,
          ref text not null,
          payment_id text unique not null,
          client_id uuid references clients(id) on delete set null,
          customer jsonb not null default '{}'::jsonb,
          items jsonb not null default '[]'::jsonb,
          total numeric not null default 0,
          vat numeric not null default 0,
          delivery numeric not null default 0,
          customer_notes text not null default '',
          status text not null default 'new',
          status_dates jsonb not null default '{}'::jsonb,
          paid_at timestamptz,
          created_at timestamptz not null default now()
        )
      `;
      await backfillFromNotes();
    })().catch((e) => {
      ready = null; // try again next time
      throw e;
    });
  }
  return ready;
}

// One-off: copy older website orders (only recorded as notes) into the table.
async function backfillFromNotes() {
  const notes = await sql`
    select n.client_id, n.body, n.created_at, c.name, c.email, c.phone, c.company_name, c.address
    from notes n join clients c on c.id = n.client_id
    where n.body like 'Website order %(Mollie tr_%'
  `;
  for (const n of notes) {
    const head = n.body.split("\n")[0];
    const m = head.match(/^Website order (\S+) — paid £([\d.,]+) online \(Mollie (tr_[A-Za-z0-9]+)\)/);
    if (!m) continue;
    const lines = n.body.split("\n").slice(1);
    const money = (s) => Number(String(s || "").replace(/[£,]/g, "")) || 0;
    const items = [];
    let vat = 0;
    let delivery = 0;
    let address = "";
    let customerNotes = "";
    for (const l of lines) {
      const vatM = l.match(/^• VAT.*— (£[\d.,]+)/);
      const delM = l.match(/^• Delivery — (£[\d.,]+)/);
      const itemM = l.match(/^• (.+?)(?: × (\d+))? — (£[\d.,]+)$/);
      if (vatM) vat = money(vatM[1]);
      else if (delM) delivery = money(delM[1]);
      else if (itemM) items.push({ description: itemM[1], quantity: Number(itemM[2] || 1), total: money(itemM[3]) });
      else if (l.startsWith("Deliver to: ")) address = l.slice(12);
      else if (l.startsWith("Customer notes: ")) customerNotes = l.slice(16);
    }
    const customer = { name: n.name, email: n.email, phone: n.phone, company: n.company_name, address: address || n.address };
    await sql`
      insert into website_orders (ref, payment_id, client_id, customer, items, total, vat, delivery, customer_notes, paid_at, created_at)
      values (${m[1]}, ${m[3]}, ${n.client_id}, ${JSON.stringify(customer)}::jsonb, ${JSON.stringify(items)}::jsonb,
              ${money(m[2])}, ${vat}, ${delivery}, ${customerNotes}, ${n.created_at}, ${n.created_at})
      on conflict (payment_id) do nothing
    `;
  }
}

export async function recordOrder({ ref, paymentId, clientId, customer, items, total, vat, delivery, notes, paidAt }) {
  await ensureOrdersTable();
  const rows = await sql`
    insert into website_orders (ref, payment_id, client_id, customer, items, total, vat, delivery, customer_notes, paid_at)
    values (${ref}, ${paymentId}, ${clientId}, ${JSON.stringify(customer)}::jsonb, ${JSON.stringify(items)}::jsonb,
            ${Number(total) || 0}, ${Number(vat) || 0}, ${Number(delivery) || 0}, ${notes || ""}, ${paidAt || new Date().toISOString()})
    on conflict (payment_id) do nothing
    returning id
  `;
  return rows[0]?.id || null;
}

export function orderRowToApi(r) {
  return {
    id: r.id,
    ref: r.ref,
    paymentId: r.payment_id,
    clientId: r.client_id,
    customer: r.customer || {},
    items: r.items || [],
    total: Number(r.total),
    vat: Number(r.vat),
    delivery: Number(r.delivery),
    customerNotes: r.customer_notes,
    status: r.status,
    statusDates: r.status_dates || {},
    paidAt: r.paid_at,
    createdAt: r.created_at,
  };
}

// ---- email alert to the office --------------------------------------------------------------

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const gbp = (n) => "£" + Number(n || 0).toFixed(2);

// Sends "New website order" to info@ (ORDER_ALERT_EMAIL can change it) from the CRM's mailbox.
// Never throws — a failed email must not lose the order.
export async function sendOrderAlert(order, crmOrigin) {
  const to = (process.env.ORDER_ALERT_EMAIL || "info@hoffparquet.co.uk").trim();
  try {
    const c = order.customer || {};
    const rows = (order.items || [])
      .map((i) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${esc(i.description)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${esc(i.quantity || 1)}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${gbp(i.total)}</td></tr>`)
      .join("");
    const link = crmOrigin ? `${crmOrigin.replace(/\/$/, "")}/orders` : "";
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#2f2f2f;max-width:560px">
<h2 style="font-weight:400;margin:0 0 4px">New website order ${esc(order.ref)}</h2>
<p style="margin:0 0 16px;color:#777">Paid ${gbp(order.total)} online (Mollie ${esc(order.paymentId)})</p>
<table style="width:100%;border-collapse:collapse">${rows}
${order.vat ? `<tr><td style="padding:6px 0">VAT</td><td></td><td style="padding:6px 0;text-align:right">${gbp(order.vat)}</td></tr>` : ""}
<tr><td style="padding:6px 0">Delivery</td><td></td><td style="padding:6px 0;text-align:right">${order.delivery ? gbp(order.delivery) : "Free"}</td></tr>
<tr><td style="padding:8px 0;font-weight:bold">Total paid</td><td></td><td style="padding:8px 0;text-align:right;font-weight:bold">${gbp(order.total)}</td></tr>
</table>
<h3 style="font-weight:400;margin:20px 0 6px">Post to</h3>
<p style="margin:0;line-height:1.6">${esc(c.name)}${c.company ? `<br>${esc(c.company)}` : ""}<br>${esc(c.address)}<br>${esc(c.phone)}<br>${esc(c.email)}</p>
${order.notes ? `<h3 style="font-weight:400;margin:20px 0 6px">Customer notes</h3><p style="margin:0">${esc(order.notes)}</p>` : ""}
${link ? `<p style="margin:24px 0 0"><a href="${esc(link)}" style="background:#9A5B33;color:#fff;padding:10px 16px;text-decoration:none;border-radius:4px">Open online orders in the CRM</a></p>` : ""}
</div>`;
    await graphRequest(`/sendMail`, {
      method: "POST",
      body: {
        message: {
          subject: `New website order ${order.ref} — ${gbp(order.total)} — ${c.name || "customer"}`,
          body: { contentType: "HTML", content: html },
          toRecipients: [{ emailAddress: { address: to } }],
          ...(c.email ? { replyTo: [{ emailAddress: { address: c.email, name: c.name || c.email } }] } : {}),
        },
        saveToSentItems: false,
      },
    });
    return true;
  } catch (e) {
    console.error("Order alert email failed:", e.message);
    return false;
  }
}
