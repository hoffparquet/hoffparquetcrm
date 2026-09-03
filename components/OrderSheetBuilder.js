"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { QUOTE_UNITS, uid, todayISO } from "@/lib/constants";
import { api } from "@/lib/api";

export default function OrderSheetBuilder({ client, existing, onClose, onSaved }) {
  const [items, setItems] = useState(
    existing?.items?.length ? existing.items : [{ id: uid(), description: "", quantity: 1, unit: "m²" }]
  );
  const [targetDate, setTargetDate] = useState(existing?.targetDate || "");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [copyFromQuoteId, setCopyFromQuoteId] = useState(client.quotes?.[0]?.id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addItem = () => setItems([...items, { id: uid(), description: "", quantity: 1, unit: "m²" }]);
  const updateItem = (id, patch) => setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id) =>
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      return next.length ? next : [{ id: uid(), description: "", quantity: 1, unit: "m²" }];
    });

  const copyFromQuote = () => {
    const quote = (client.quotes || []).find((q) => q.id === copyFromQuoteId);
    if (!quote) return;
    const copied = quote.items
      .filter((it) => it.description.trim())
      .map((it) => ({ id: uid(), description: it.description, quantity: it.quantity, unit: it.unit }));
    if (copied.length) setItems(copied);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const orderSheet = {
        id: existing?.id,
        number: existing?.number || "",
        dateCreated: existing?.dateCreated || todayISO(),
        targetDate,
        notes,
        items: items.filter((it) => it.description.trim()),
      };
      const saved = await api.saveOrderSheet(client.id, orderSheet);
      onSaved(saved);
    } catch (err) {
      setError(err.message || "Couldn't save this order sheet — try again.");
      setSaving(false);
    }
  };

  return (
    <div className="hp-overlay" onClick={onClose}>
      <div className="hp-panel hp-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="hp-panel-head">
          <div>
            <h2>{existing ? `Edit order sheet ${existing.number || ""}` : "New order sheet"}</h2>
            <div className="hp-panel-sub">For {client.name} — materials only, no pricing</div>
          </div>
          <button className="hp-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="hp-panel-body">
          {client.quotes?.length > 0 && (
            <div className="hp-copy-from-quote">
              <div className="hp-field">
                <label>Copy items from a quote (replaces the list below)</label>
                <select value={copyFromQuoteId} onChange={(e) => setCopyFromQuoteId(e.target.value)}>
                  {client.quotes.map((q) => (
                    <option key={q.id} value={q.id}>{q.number || "Draft"}</option>
                  ))}
                </select>
              </div>
              <button className="hp-btn hp-btn-secondary" onClick={copyFromQuote}>Copy items</button>
            </div>
          )}

          <div className="hp-quote-items">
            <div className="hp-orderline-head">
              <span>Material description</span><span>Qty</span><span>Unit</span><span></span>
            </div>
            {items.map((it) => (
              <div className="hp-orderline-row" key={it.id}>
                <input
                  placeholder="e.g. European Oak herringbone flooring"
                  value={it.description}
                  onChange={(e) => updateItem(it.id, { description: e.target.value })}
                />
                <input type="number" value={it.quantity} onChange={(e) => updateItem(it.id, { quantity: e.target.value })} />
                <select value={it.unit} onChange={(e) => updateItem(it.id, { unit: e.target.value })}>
                  {QUOTE_UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
                <button className="hp-icon-btn hp-row-delete" onClick={() => removeItem(it.id)} title="Delete this row">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <div className="hp-item-btn-row">
              <button className="hp-btn hp-btn-ghost hp-add-item-btn" onClick={addItem}><Plus size={14} /> Add line item</button>
            </div>
          </div>

          <div className="hp-panel-grid">
            <div className="hp-field">
              <label>Needed on site / by (optional)</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>

          <div className="hp-field">
            <label>Notes for production (optional)</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Batching, colour matching, packaging or delivery instructions" />
          </div>

          {error && <p className="hp-login-error">{error}</p>}
          <div className="hp-panel-footer hp-panel-footer-end">
            <button className="hp-btn hp-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="hp-btn hp-btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save order sheet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
