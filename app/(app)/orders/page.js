"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, Package, Send, RotateCcw, X } from "lucide-react";
import Topbar from "@/components/Topbar";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/constants";

const fmtMoney = (n) => (Number(n) || 0).toLocaleString("en-GB", { style: "currency", currency: "GBP" });

// Online orders paid on hoffparquet.co.uk. New orders also arrive by email to info@.
const STATUS = {
  new: { label: "New", badge: "hp-badge-amber" },
  packed: { label: "Packed", badge: "hp-badge-slate" },
  sent: { label: "Sent", badge: "hp-badge-sage" },
  cancelled: { label: "Cancelled", badge: "hp-badge-oak" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("open");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listWebsiteOrders().then(setOrders).catch((e) => setError(e.message));
  }, []);

  const setStatus = async (order, status) => {
    setBusy(true);
    try {
      const updated = await api.setWebsiteOrderStatus(order.id, status);
      setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
      setOpen((o) => (o && o.id === updated.id ? updated : o));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <main className="hp-main"><div className="hp-empty"><h2>Could not load orders</h2><p>{error}</p></div></main>;
  if (!orders) {
    return (
      <main className="hp-main" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Loader2 className="spin" size={20} /> Loading…
      </main>
    );
  }

  const q = query.trim().toLowerCase();
  const count = (f) => orders.filter((o) => (f === "open" ? o.status === "new" || o.status === "packed" : f === "all" || o.status === f)).length;
  const filtered = orders.filter((o) => {
    const inFilter = filter === "all" || (filter === "open" ? o.status === "new" || o.status === "packed" : o.status === filter);
    const text = `${o.ref} ${o.customer.name || ""} ${o.customer.email || ""} ${o.items.map((i) => i.description).join(" ")}`.toLowerCase();
    return inFilter && (!q || text.includes(q));
  });
  const itemsSummary = (o) => {
    const first = o.items[0]?.description || "—";
    return o.items.length > 1 ? `${first} + ${o.items.length - 1} more` : first;
  };

  return (
    <>
      <Topbar title="Online orders" />
      <main className="hp-main">
        <div className="hp-search" style={{ marginBottom: 16, maxWidth: 360 }}>
          <Search size={15} />
          <input placeholder="Search orders…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <div className="hp-table-wrap">
          <div className="hp-table-filters">
            {[["open", "To do"], ["new", "New"], ["packed", "Packed"], ["sent", "Sent"], ["cancelled", "Cancelled"], ["all", "All"]].map(([f, label]) => (
              <button key={f} className={"hp-pill" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>
                {label} ({count(f)})
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="hp-empty">
              <h2>{orders.length ? "No orders here" : "No online orders yet"}</h2>
              <p>{orders.length ? "Try another filter." : "Paid orders from hoffparquet.co.uk appear here automatically, and you get an email for each one."}</p>
            </div>
          ) : (
            <table className="hp-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} onClick={() => setOpen(o)}>
                    <td>
                      <div className="hp-table-name">{o.ref}</div>
                      <div className="hp-table-sub">{fmtDate(o.paidAt || o.createdAt)}</div>
                    </td>
                    <td>
                      <div>{o.customer.name || "—"}</div>
                      <div className="hp-table-sub">{o.customer.postcode || o.customer.email || ""}</div>
                    </td>
                    <td>{itemsSummary(o)}</td>
                    <td>{fmtMoney(o.total)}</td>
                    <td><span className={"hp-badge " + (STATUS[o.status] || STATUS.new).badge}>{(STATUS[o.status] || STATUS.new).label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {open && (
        <div className="hp-modal-backdrop" onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, background: "rgba(20,16,10,.35)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px,100%)", height: "100%", overflow: "auto", background: "var(--paper-raised, #fff)", padding: 24, boxShadow: "0 0 40px rgba(0,0,0,.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>Order {open.ref}</h2>
                <div className="hp-table-sub">Paid {fmtDate(open.paidAt || open.createdAt)} · Mollie {open.paymentId}</div>
              </div>
              <button className="hp-btn hp-btn-ghost" onClick={() => setOpen(null)} aria-label="Close"><X size={16} /></button>
            </div>

            <div style={{ margin: "14px 0" }}>
              <span className={"hp-badge " + (STATUS[open.status] || STATUS.new).badge}>{(STATUS[open.status] || STATUS.new).label}</span>
              {Object.entries(open.statusDates || {}).map(([k, v]) => (
                <span key={k} className="hp-table-sub" style={{ marginLeft: 10 }}>{(STATUS[k] || {}).label || k}: {fmtDate(v)}</span>
              ))}
            </div>

            <table className="hp-table" style={{ marginBottom: 12 }}>
              <tbody>
                {open.items.map((i, n) => (
                  <tr key={n}><td>{i.description}</td><td style={{ textAlign: "center" }}>× {i.quantity || 1}</td><td style={{ textAlign: "right" }}>{fmtMoney(i.total)}</td></tr>
                ))}
                {open.vat > 0 && <tr><td>VAT</td><td /><td style={{ textAlign: "right" }}>{fmtMoney(open.vat)}</td></tr>}
                <tr><td>Delivery</td><td /><td style={{ textAlign: "right" }}>{open.delivery > 0 ? fmtMoney(open.delivery) : "Free"}</td></tr>
                <tr><td><strong>Total paid</strong></td><td /><td style={{ textAlign: "right" }}><strong>{fmtMoney(open.total)}</strong></td></tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: 14, margin: "18px 0 6px" }}>Post to</h3>
            <div style={{ lineHeight: 1.6 }}>
              {open.customer.name}<br />
              {open.customer.company && <>{open.customer.company}<br /></>}
              {open.customer.address}<br />
              {open.customer.phone && <><a href={`tel:${open.customer.phone}`}>{open.customer.phone}</a><br /></>}
              {open.customer.email && <a href={`mailto:${open.customer.email}`}>{open.customer.email}</a>}
            </div>
            {open.customerNotes && (<><h3 style={{ fontSize: 14, margin: "18px 0 6px" }}>Customer notes</h3><p style={{ margin: 0 }}>{open.customerNotes}</p></>)}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 22 }}>
              {open.status === "new" && <button className="hp-btn hp-btn-primary" disabled={busy} onClick={() => setStatus(open, "packed")}><Package size={15} /> Mark packed</button>}
              {(open.status === "new" || open.status === "packed") && <button className="hp-btn hp-btn-primary" disabled={busy} onClick={() => setStatus(open, "sent")}><Send size={15} /> Mark sent</button>}
              {open.status !== "new" && <button className="hp-btn hp-btn-secondary" disabled={busy} onClick={() => setStatus(open, "new")}><RotateCcw size={15} /> Back to new</button>}
              {open.status !== "cancelled" && <button className="hp-btn hp-btn-danger-ghost" disabled={busy} onClick={() => confirm("Mark this order as cancelled? (Refund it in Mollie separately.)") && setStatus(open, "cancelled")}>Cancelled</button>}
              {open.clientId && <Link className="hp-btn hp-btn-secondary" href={`/clients/${open.clientId}`}>Open client card</Link>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
