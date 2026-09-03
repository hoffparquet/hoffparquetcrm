"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import {
  QUOTE_UNITS, DEFAULT_INVOICE_TERMS_PRODUCTS, DEFAULT_INVOICE_TERMS_INSTALLATION,
  fmtMoney, itemsSubtotal, lineTotal, uid, todayISO, addDays,
} from "@/lib/constants";
import { api } from "@/lib/api";

export default function InvoiceBuilder({ client, existing, defaultType, onClose, onSaved }) {
  const [type, setType] = useState(existing?.type || defaultType || "products");
  const [items, setItems] = useState(
    existing?.items?.length ? existing.items : [{ id: uid(), description: "", quantity: 1, unit: "m²", unitPrice: "", discountPercent: "" }]
  );
  const [dateIssued, setDateIssued] = useState(existing?.dateIssued || todayISO());
  const [dateOfSupply, setDateOfSupply] = useState(existing?.dateOfSupply || existing?.dateIssued || todayISO());
  const [dueDate, setDueDate] = useState(existing?.dueDate || addDays(todayISO(), 14));
  const [applyVat, setApplyVat] = useState(existing ? !!existing.applyVat : false);
  const [vatRate, setVatRate] = useState(existing?.vatRate ?? 20);
  const [notes, setNotes] = useState(existing?.notes || "");
  const [terms, setTerms] = useState(
    existing?.terms ||
      ((existing?.type || defaultType) === "installation" ? DEFAULT_INVOICE_TERMS_INSTALLATION : DEFAULT_INVOICE_TERMS_PRODUCTS)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const changeType = (t) => {
    setType(t);
    if (!existing?.terms) {
      setTerms(t === "installation" ? DEFAULT_INVOICE_TERMS_INSTALLATION : DEFAULT_INVOICE_TERMS_PRODUCTS);
    }
  };

  const addItem = () => setItems([...items, { id: uid(), description: "", quantity: 1, unit: "m²", unitPrice: "", discountPercent: "" }]);
  const updateItem = (id, patch) => setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id) =>
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      return next.length ? next : [{ id: uid(), description: "", quantity: 1, unit: "m²", unitPrice: "", discountPercent: "" }];
    });

  const subtotal = itemsSubtotal(items);
  const vatAmount = applyVat ? (subtotal * (Number(vatRate) || 0)) / 100 : 0;
  const total = subtotal + vatAmount;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const invoice = {
        id: existing?.id,
        number: existing?.number || "",
        type,
        dateIssued,
        dateOfSupply,
        dueDate,
        items: items.filter((it) => it.description.trim() || it.unitPrice),
        applyVat,
        vatRate,
        terms,
        notes,
      };
      const saved = await api.saveInvoice(client.id, invoice);
      onSaved(saved);
    } catch (err) {
      setError(err.message || "Couldn't save this invoice — try again.");
      setSaving(false);
    }
  };

  return (
    <div className="hp-overlay" onClick={onClose}>
      <div className="hp-panel hp-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="hp-panel-head">
          <div>
            <h2>{existing?.number ? `Edit invoice ${existing.number}` : "New invoice"}</h2>
            <div className="hp-panel-sub">For {client.name}</div>
          </div>
          <button className="hp-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="hp-panel-body">
          <div className="hp-field hp-field-wide">
            <label>Invoice for</label>
            <select value={type} onChange={(e) => changeType(e.target.value)}>
              <option value="products">Products</option>
              <option value="installation">Installation service</option>
            </select>
          </div>

          <div className="hp-panel-grid">
            <div className="hp-field">
              <label>Date issued</label>
              <input type="date" value={dateIssued} onChange={(e) => setDateIssued(e.target.value)} />
            </div>
            <div className="hp-field">
              <label>Payment due</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            {applyVat && (
              <div className="hp-field hp-field-wide">
                <label>Date of supply (for VAT purposes)</label>
                <input type="date" value={dateOfSupply} onChange={(e) => setDateOfSupply(e.target.value)} />
              </div>
            )}
          </div>

          <div className="hp-quote-items">
            <div className="hp-quote-items-head hp-quote-items-head-disc">
              <span>Description</span><span>Qty</span><span>Unit</span><span>Unit price (£)</span><span>Disc %</span><span>Amount</span><span></span>
            </div>
            {items.map((it) => (
              <div className="hp-quote-item-row hp-quote-item-row-disc" key={it.id}>
                <input
                  placeholder={type === "installation" ? "e.g. Supply of fitting labour" : "e.g. European Oak herringbone flooring"}
                  value={it.description}
                  onChange={(e) => updateItem(it.id, { description: e.target.value })}
                />
                <input type="number" value={it.quantity} onChange={(e) => updateItem(it.id, { quantity: e.target.value })} />
                <select value={it.unit} onChange={(e) => updateItem(it.id, { unit: e.target.value })}>
                  {QUOTE_UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
                <input type="number" value={it.unitPrice} onChange={(e) => updateItem(it.id, { unitPrice: e.target.value })} />
                <input type="number" value={it.discountPercent} placeholder="0" onChange={(e) => updateItem(it.id, { discountPercent: e.target.value })} />
                <span className="hp-quote-item-amount">{fmtMoney(lineTotal(it))}</span>
                <button className="hp-icon-btn hp-row-delete" onClick={() => removeItem(it.id)} title="Delete this row"><Trash2 size={15} /></button>
              </div>
            ))}
            <div className="hp-item-btn-row">
              <button className="hp-btn hp-btn-ghost hp-add-item-btn" onClick={addItem}><Plus size={14} /> Add line item</button>
            </div>
          </div>

          <div className="hp-quote-builder-totals">
            <label className="hp-checkbox">
              <input type="checkbox" checked={applyVat} onChange={(e) => setApplyVat(e.target.checked)} /> Apply VAT
            </label>
            {applyVat && (
              <div className="hp-field" style={{ maxWidth: 100 }}>
                <label>VAT rate %</label>
                <input type="number" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
              </div>
            )}
            <div className="hp-quote-builder-sums">
              <div><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
              {applyVat && <div><span>VAT ({vatRate}%)</span><span>{fmtMoney(vatAmount)}</span></div>}
              <div className="hp-quote-total-row"><span>Total</span><span>{fmtMoney(total)}</span></div>
            </div>
          </div>

          <div className="hp-field">
            <label>Notes to client (optional)</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="hp-field">
            <label>Payment terms — reviewed by you, not legal advice</label>
            <textarea rows={5} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>

          {error && <p className="hp-login-error">{error}</p>}
          <div className="hp-panel-footer hp-panel-footer-end">
            <button className="hp-btn hp-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="hp-btn hp-btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save invoice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
