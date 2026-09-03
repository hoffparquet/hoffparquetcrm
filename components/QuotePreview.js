"use client";

import { useState } from "react";
import { X, Mail, Printer, Pencil, Trash2, CheckCircle2, Copy, Receipt } from "lucide-react";
import { fmtMoney, fmtDate, itemsSubtotal, lineTotal } from "@/lib/constants";
import { api } from "@/lib/api";
import { printWithTitle } from "@/lib/print";

export default function QuotePreview({ client, settings, quote, onClose, onEdit, onDeleted, onSent, onDraftInvoice }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const company = settings?.company || {};
  const subtotal = itemsSubtotal(quote.items);
  const vatAmount = quote.applyVat ? (subtotal * (Number(quote.vatRate) || 0)) / 100 : 0;
  const total = subtotal + vatAmount;

  const emailSubject = `Quotation ${quote.number} from ${company.name || "Hoff Parquet"}`;
  const emailBody = [
    `Dear ${client.name},`,
    "",
    `Please find our quotation ${quote.number}, valid until ${fmtDate(quote.validUntil)}.`,
    "",
    `Total: ${fmtMoney(total)}${quote.applyVat ? " (incl. VAT)" : ""}`,
    "",
    "Kind regards,",
    company.name || "Hoff Parquet",
    company.phone || "",
    company.email || "",
  ].join("\n");
  const mailtoHref = `mailto:${client.email || ""}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  const markSent = async () => {
    setBusy(true);
    try {
      const updated = await api.markQuoteSent(client.id, quote.id);
      onSent(updated);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.deleteQuote(client.id, quote.id);
      onDeleted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hp-overlay" onClick={onClose}>
      <div className="hp-panel hp-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="hp-panel-head hp-no-print">
          <div>
            <h2>Quotation {quote.number}</h2>
            <div className="hp-panel-sub">For {client.name}</div>
          </div>
          <button className="hp-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="hp-quote-actions hp-no-print">
          <a className="hp-btn hp-btn-secondary" href={mailtoHref}>
            <Mail size={14} /> Email to client
          </a>
          <button className="hp-btn hp-btn-secondary" onClick={() => navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`)}>
            <Copy size={14} /> Copy message text
          </button>
          <button className="hp-btn hp-btn-secondary" onClick={() => printWithTitle(`Quotation ${quote.number || "draft"}`)}>
            <Printer size={14} /> Print / Save as PDF
          </button>
          <button className="hp-btn hp-btn-secondary" onClick={onEdit}>
            <Pencil size={14} /> Edit
          </button>
          <button className="hp-btn hp-btn-secondary" onClick={onDraftInvoice}>
            <Receipt size={14} /> Draft products invoice from this
          </button>
          {quote.status !== "sent" && (
            <button className="hp-btn hp-btn-secondary" onClick={markSent} disabled={busy}>
              <CheckCircle2 size={14} /> Mark as sent
            </button>
          )}
          {!confirmDelete ? (
            <button className="hp-btn hp-btn-danger-ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} />
            </button>
          ) : (
            <span className="hp-confirm-clear">
              <span>Delete this quote?</span>
              <button className="hp-btn hp-btn-danger" onClick={doDelete} disabled={busy}>Confirm</button>
              <button className="hp-btn hp-btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </span>
          )}
        </div>

        <div className="hp-print-area">
          <div className="hp-quote-sheet">
            <div className="hp-quote-letterhead">
              {company.logo && <img src={company.logo} alt={company.name} className="hp-quote-logo" />}
              <div className="hp-quote-company">
                <div>{company.address}</div>
                <div>{[company.phone, company.email].filter(Boolean).join(" · ")}</div>
                <div>{company.website}</div>
                {company.companyNumber && <div>Company No. {company.companyNumber}</div>}
                {company.vatRegistered && company.vatNumber && <div>VAT No. {company.vatNumber}</div>}
              </div>
            </div>

            <div className="hp-quote-meta">
              <div>
                <h1>Quotation</h1>
                <div>Quote {quote.number}</div>
                <div>Date: {fmtDate(quote.dateCreated)}</div>
                <div>Valid until: {fmtDate(quote.validUntil)}</div>
                <div>Covers: {quote.scope === "products_and_installation" ? "Products & installation" : "Products only"}</div>
              </div>
              <div className="hp-quote-client">
                <div className="hp-quote-client-label">Prepared for</div>
                <div>{client.name}</div>
                {client.companyName && <div>{client.companyName}</div>}
                {client.address && <div>{client.address}</div>}
                {client.email && <div>{client.email}</div>}
                {client.phone && <div>{client.phone}</div>}
              </div>
            </div>

            <table className="hp-quote-table">
              <thead>
                <tr><th>Description</th><th>Qty</th><th>Unit</th><th>Unit price</th><th>Disc %</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {quote.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.description || "—"}</td>
                    <td>{it.quantity}</td>
                    <td>{it.unit}</td>
                    <td>{fmtMoney(it.unitPrice)}</td>
                    <td>{Number(it.discountPercent) ? `${Number(it.discountPercent)}%` : "—"}</td>
                    <td>{fmtMoney(lineTotal(it))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="hp-quote-totals">
              <div><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
              {quote.applyVat ? (
                <div><span>VAT ({quote.vatRate}%)</span><span>{fmtMoney(vatAmount)}</span></div>
              ) : (
                <div className="hp-quote-novat"><span>VAT</span><span>Not charged — not VAT registered</span></div>
              )}
              <div className="hp-quote-total-row"><span>Total</span><span>{fmtMoney(total)}</span></div>
            </div>

            {quote.notes && (
              <div className="hp-quote-notes"><h3>Notes</h3><p>{quote.notes}</p></div>
            )}
            <div className="hp-quote-terms"><h3>Terms</h3><p>{quote.terms}</p></div>
            <div className="hp-quote-footer">This is a quotation, not a tax invoice.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
