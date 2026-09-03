"use client";

import { useState } from "react";
import { X, Plus, Trash2, Boxes } from "lucide-react";
import { QUOTE_UNITS, DEFAULT_TERMS, fmtMoney, itemsSubtotal, lineTotal, uid, todayISO, addDays } from "@/lib/constants";
import { api } from "@/lib/api";
import CatalogPicker from "@/components/CatalogPicker";

export default function QuoteBuilder({ client, products, existing, onClose, onSaved }) {
  const [items, setItems] = useState(
    existing?.items?.length ? existing.items : [{ id: uid(), description: "", quantity: 1, unit: "m²", unitPrice: "", discountPercent: "" }]
  );
  const [validUntil, setValidUntil] = useState(existing?.validUntil || addDays(todayISO(), 30));
  const [applyVat, setApplyVat] = useState(existing ? existing.applyVat : false);
  const [vatRate, setVatRate] = useState(existing?.vatRate ?? 20);
  const [terms, setTerms] = useState(existing?.terms || DEFAULT_TERMS);
  const [notes, setNotes] = useState(existing?.notes || "");
  const [scope, setScope] = useState(existing?.scope || "products");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);

  const addFromCatalog = (item) => {
    setItems((prev) => {
      const blank = prev.find((it) => !it.description.trim() && !it.unitPrice);
      const newItem = { id: uid(), description: item.description, quantity: 1, unit: item.unit, unitPrice: item.price, discountPercent: "" };
      return blank ? prev.map((it) => (it.id === blank.id ? newItem : it)) : [...prev, newItem];
    });
    setShowCatalog(false);
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
      const quote = {
        id: existing?.id,
        number: existing?.number || "",
        dateCreated: existing?.dateCreated || todayISO(),
        validUntil,
        items: items.filter((it) => it.description.trim() || it.unitPrice),
        applyVat,
        vatRate,
        terms,
        notes,
        scope,
        status: existing?.status || "draft",
      };
      const saved = await api.saveQuote(client.id, quote);
      onSaved(saved);
    } catch (err) {
      setError(err.message || "Couldn't save this quote — try again.");
      setSaving(false);
    }
  };

  return (
    <div className="hp-overlay" onClick={onClose}>
      <div className="hp-panel hp-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="hp-panel-head">
          <div>
            <h2>{existing ? `Edit quotation ${existing.number || ""}` : "New quotation"}</h2>
            <div className="hp-panel-sub">For {client.name}</div>
          </div>
          <button className="hp-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="hp-panel-body">
          <div className="hp-field hp-field-wide">
            <label>Quote covers</label>
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="products">Products only</option>
              <option value="products_and_installation">Products &amp; installation</option>
            </select>
          </div>

          <div className="hp-quote-items">
            <div className="hp-quote-items-head hp-quote-items-head-disc">
              <span>Description</span><span>Qty</span><span>Unit</span><span>Unit price (£)</span><span>Disc %</span><span>Amount</span><span></span>
            </div>
            {items.map((it) => (
              <div className="hp-quote-item-row hp-quote-item-row-disc" key={it.id}>
                <input placeholder="e.g. European Oak herringbone, supply & fit" value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} />
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
              <button className="hp-btn hp-btn-secondary hp-add-item-btn" onClick={() => setShowCatalog(true)}><Boxes size={14} /> Add from catalog</button>
            </div>
          </div>

          <div className="hp-quote-builder-totals">
            <div className="hp-field">
              <label>Valid until</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
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
            <label>Terms — reviewed by you, not legal advice</label>
            <textarea rows={6} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>

          {error && <p className="hp-login-error">{error}</p>}
          <div className="hp-panel-footer hp-panel-footer-end">
            <button className="hp-btn hp-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="hp-btn hp-btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save quotation"}
            </button>
          </div>
        </div>
      </div>

      {showCatalog && (
        <CatalogPicker products={products || []} onPick={addFromCatalog} onClose={() => setShowCatalog(false)} />
      )}
    </div>
  );
}
