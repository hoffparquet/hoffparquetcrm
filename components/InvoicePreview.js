"use client";

import { useState } from "react";
import { X, Mail, Printer, Pencil, Trash2, CheckCircle2, Copy } from "lucide-react";
import { fmtMoney, fmtDate, itemsSubtotal, lineTotal } from "@/lib/constants";
import { api } from "@/lib/api";

export default function InvoicePreview({ client, settings, invoice, onClose, onEdit, onDeleted, onPaid }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const company = settings?.company || {};
  const subtotal = itemsSubtotal(invoice.items);
  const vatAmount = invoice.applyVat ? (subtotal * (Number(invoice.vatRate) || 0)) / 100 : 0;
  const total = subtotal + vatAmount;
  const hasBankDetails = company.bankName || company.accountNumber;

  const emailSubject = `Invoice ${invoice.number} from ${company.name || "Hoff Parquet"}`;
  const emailBody = [
    `Dear ${client.name},`,
    "",
    `Please find our invoice ${invoice.number} for ${invoice.type === "installation" ? "installation" : "the flooring products supplied"}, due ${fmtDate(invoice.dueDate)}.`,
    "",
    `Total due: ${fmtMoney(total)}${invoice.applyVat ? " (incl. VAT)" : ""}`,
    "",
    "Kind regards,",
    company.name || "Hoff Parquet",
    company.phone || "",
    company.email || "",
  ].join("\n");
  const mailtoHref = `mailto:${client.email || ""}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  const markPaid = async () => {
    setBusy(true);
    try {
      const updated = await api.markInvoicePaid(client.id, invoice.id);
      onPaid(updated);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.deleteInvoice(client.id, invoice.id);
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
            <h2>Invoice {invoice.number}</h2>
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
          <button className="hp-btn hp-btn-secondary" onClick={() => window.print()}>
            <Printer size={14} /> Print / Save as PDF
          </button>
          <button className="hp-btn hp-btn-secondary" onClick={onEdit}>
            <Pencil size={14} /> Edit
          </button>
          {invoice.status !== "paid" && (
            <button className="hp-btn hp-btn-secondary" onClick={markPaid} disabled={busy}>
              <CheckCircle2 size={14} /> Mark as paid
            </button>
          )}
          {!confirmDelete ? (
            <button className="hp-btn hp-btn-danger-ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} />
            </button>
          ) : (
            <span className="hp-confirm-clear">
              <span>Delete this invoice?</span>
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
                <h1>Invoice</h1>
                <div>{invoice.applyVat ? "VAT invoice" : "Invoice"} {invoice.number}</div>
                <div>For: {invoice.type === "installation" ? "Installation service" : "Products supplied"}</div>
                <div>Date issued: {fmtDate(invoice.dateIssued)}</div>
                {invoice.applyVat && <div>Date of supply: {fmtDate(invoice.dateOfSupply)}</div>}
                <div>Payment due: {fmtDate(invoice.dueDate)}</div>
              </div>
              <div className="hp-quote-client">
                <div className="hp-quote-client-label">Bill to</div>
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
                {invoice.items.map((it) => (
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
              {invoice.applyVat ? (
                <div><span>VAT ({invoice.vatRate}%)</span><span>{fmtMoney(vatAmount)}</span></div>
              ) : (
                <div className="hp-quote-novat"><span>VAT</span><span>Not charged — not VAT registered</span></div>
              )}
              <div className="hp-quote-total-row">
                <span>{invoice.status === "paid" ? "Total paid" : "Total due"}</span>
                <span>{fmtMoney(total)}</span>
              </div>
              {invoice.status === "paid" && <div className="hp-quote-novat"><span>Paid on</span><span>{fmtDate(invoice.paidDate)}</span></div>}
            </div>

            {hasBankDetails && invoice.status !== "paid" && (
              <div className="hp-quote-notes">
                <h3>Payment details</h3>
                <p>
                  {company.bankName && `${company.bankName}\n`}
                  {company.accountName && `Account name: ${company.accountName}\n`}
                  {company.sortCode && `Sort code: ${company.sortCode}\n`}
                  {company.accountNumber && `Account number: ${company.accountNumber}\n`}
                  {`Please use ${invoice.number} as the payment reference.`}
                </p>
              </div>
            )}

            {invoice.notes && (
              <div className="hp-quote-notes"><h3>Notes</h3><p>{invoice.notes}</p></div>
            )}
            <div className="hp-quote-terms"><h3>Payment terms</h3><p>{invoice.terms}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
