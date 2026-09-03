"use client";

import { useState } from "react";
import { X, Mail, Printer, Pencil, Trash2, CheckCircle2, Copy } from "lucide-react";
import { fmtDate } from "@/lib/constants";
import { api } from "@/lib/api";
import { printWithTitle } from "@/lib/print";

export default function OrderSheetPreview({ client, settings, orderSheet, onClose, onEdit, onDeleted, onSent }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const company = settings?.company || {};

  const emailSubject = `Order sheet ${orderSheet.number} — ${client.name}`;
  const emailBody = [
    `Order sheet ${orderSheet.number} for ${client.name}.`,
    "",
    ...orderSheet.items.map((it) => `- ${it.description} — ${it.quantity} ${it.unit}`),
    "",
    orderSheet.targetDate ? `Needed on site by: ${fmtDate(orderSheet.targetDate)}` : "",
    orderSheet.notes ? `Notes: ${orderSheet.notes}` : "",
  ].filter(Boolean).join("\n");
  const mailtoHref = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  const markSent = async () => {
    setBusy(true);
    try {
      const updated = await api.markOrderSheetSent(client.id, orderSheet.id);
      onSent(updated);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.deleteOrderSheet(client.id, orderSheet.id);
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
            <h2>Order sheet {orderSheet.number}</h2>
            <div className="hp-panel-sub">For {client.name}</div>
          </div>
          <button className="hp-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="hp-quote-actions hp-no-print">
          <a className="hp-btn hp-btn-secondary" href={mailtoHref}>
            <Mail size={14} /> Email to production
          </a>
          <button className="hp-btn hp-btn-secondary" onClick={() => navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`)}>
            <Copy size={14} /> Copy message text
          </button>
          <button className="hp-btn hp-btn-secondary" onClick={() => printWithTitle(`Order sheet ${orderSheet.number || "draft"}`)}>
            <Printer size={14} /> Print / Save as PDF
          </button>
          <button className="hp-btn hp-btn-secondary" onClick={onEdit}>
            <Pencil size={14} /> Edit
          </button>
          {orderSheet.status !== "sent" && (
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
              <span>Delete this order sheet?</span>
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
                <div className="hp-order-tag">Production order sheet</div>
              </div>
            </div>

            <div className="hp-quote-meta">
              <div>
                <h1>Order Sheet</h1>
                <div>{orderSheet.number}</div>
                <div>Date: {fmtDate(orderSheet.dateCreated)}</div>
                {orderSheet.targetDate && <div>Needed on site by: {fmtDate(orderSheet.targetDate)}</div>}
              </div>
              <div className="hp-quote-client">
                <div className="hp-quote-client-label">Client / job</div>
                <div>{client.name}</div>
                {client.companyName && <div>{client.companyName}</div>}
                {client.address && <div>{client.address}</div>}
                {client.rooms && <div>{client.rooms}</div>}
              </div>
            </div>

            <table className="hp-quote-table hp-orderline-table">
              <thead>
                <tr><th>Material description</th><th>Qty</th><th>Unit</th></tr>
              </thead>
              <tbody>
                {orderSheet.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.description || "—"}</td>
                    <td>{it.quantity}</td>
                    <td>{it.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {orderSheet.notes && (
              <div className="hp-quote-notes"><h3>Notes for production</h3><p>{orderSheet.notes}</p></div>
            )}

            <div className="hp-quote-footer">Materials picking list only — no pricing or customer specification included.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
