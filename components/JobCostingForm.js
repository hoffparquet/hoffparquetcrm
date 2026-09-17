"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, Boxes } from "lucide-react";
import { QUOTE_UNITS, fmtMoney, uid, todayISO } from "@/lib/constants";
import { api } from "@/lib/api";
import LabourItemPicker from "@/components/LabourItemPicker";

function blankItem() {
  return { id: uid(), description: "", quantity: 1, unit: "linear m", costPerUnit: "", chargePerUnit: "" };
}

export default function JobCostingForm({ existing, onClose, onSaved }) {
  const [clients, setClients] = useState(null);
  const [clientId, setClientId] = useState(existing?.clientId || "");
  const [projectName, setProjectName] = useState(existing?.projectName || "");
  const [jobDate, setJobDate] = useState(existing?.jobDate || todayISO());
  const [fitterName, setFitterName] = useState(existing?.fitterName || "");
  const [items, setItems] = useState(existing?.items?.length ? existing.items : [blankItem()]);
  const [notes, setNotes] = useState(existing?.notes || "");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listClients().then(setClients);
  }, []);

  const addItem = () => setItems([...items, blankItem()]);
  const updateItem = (id, patch) => setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id) =>
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      return next.length ? next : [blankItem()];
    });

  const pickFromCatalog = (picked) => {
    setItems((prev) => {
      const blank = prev.find((it) => !it.description.trim());
      const newItem = { id: uid(), quantity: 1, ...picked };
      return blank ? prev.map((it) => (it.id === blank.id ? newItem : it)) : [...prev, newItem];
    });
    setShowPicker(false);
  };

  const totalCost = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.costPerUnit) || 0), 0);
  const totalCharge = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.chargePerUnit) || 0), 0);
  const margin = totalCharge - totalCost;
  const marginPct = totalCharge > 0 ? (margin / totalCharge) * 100 : 0;

  const save = async () => {
    if (!projectName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const saved = await api.saveInstallationJob({
        id: existing?.id,
        clientId: clientId || null,
        projectName,
        jobDate,
        fitterName,
        notes,
        items: items.filter((it) => it.description.trim()),
      });
      onSaved(saved);
    } catch (err) {
      setError(err.message || "Couldn't save this job — try again.");
      setSaving(false);
    }
  };

  return (
    <div className="hp-overlay" onClick={onClose}>
      <div className="hp-panel hp-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="hp-panel-head">
          <h2>{existing ? "Edit job" : "New job"}</h2>
          <button className="hp-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="hp-panel-body">
          <div className="hp-panel-grid">
            <div className="hp-field hp-field-wide">
              <label>Project name *</label>
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Herringbone hallway + living room" autoFocus />
            </div>
            <div className="hp-field">
              <label>Client (optional)</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">No client linked</option>
                {(clients || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.companyName ? ` — ${c.companyName}` : ""}</option>
                ))}
              </select>
            </div>
            <div className="hp-field">
              <label>Job date</label>
              <input type="date" value={jobDate} onChange={(e) => setJobDate(e.target.value)} />
            </div>
            <div className="hp-field">
              <label>Fitter</label>
              <input value={fitterName} onChange={(e) => setFitterName(e.target.value)} placeholder="Who did the work" />
            </div>
          </div>

          <div className="hp-quote-items">
            <div className="hp-quote-items-head hp-quote-items-head-disc">
              <span>Description</span><span>Qty</span><span>Unit</span><span>Cost/unit (£)</span><span>Charge/unit (£)</span><span>Margin</span><span></span>
            </div>
            {items.map((it) => {
              const lineCost = (Number(it.quantity) || 0) * (Number(it.costPerUnit) || 0);
              const lineCharge = (Number(it.quantity) || 0) * (Number(it.chargePerUnit) || 0);
              return (
                <div className="hp-quote-item-row hp-quote-item-row-disc" key={it.id}>
                  <input
                    placeholder="e.g. Herringbone parquet installation"
                    value={it.description}
                    onChange={(e) => updateItem(it.id, { description: e.target.value })}
                  />
                  <input type="number" value={it.quantity} onChange={(e) => updateItem(it.id, { quantity: e.target.value })} />
                  <select value={it.unit} onChange={(e) => updateItem(it.id, { unit: e.target.value })}>
                    {QUOTE_UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <input type="number" value={it.costPerUnit} onChange={(e) => updateItem(it.id, { costPerUnit: e.target.value })} />
                  <input type="number" value={it.chargePerUnit} onChange={(e) => updateItem(it.id, { chargePerUnit: e.target.value })} />
                  <span className="hp-quote-item-amount">{fmtMoney(lineCharge - lineCost)}</span>
                  <button className="hp-icon-btn hp-row-delete" onClick={() => removeItem(it.id)} title="Delete this row"><Trash2 size={15} /></button>
                </div>
              );
            })}
            <div className="hp-item-btn-row">
              <button className="hp-btn hp-btn-ghost hp-add-item-btn" onClick={addItem}><Plus size={14} /> Add line item</button>
              <button className="hp-btn hp-btn-secondary hp-add-item-btn" onClick={() => setShowPicker(true)}><Boxes size={14} /> Add from labour catalog</button>
            </div>
          </div>

          <div className="hp-quote-builder-totals">
            <div className="hp-quote-builder-sums">
              <div><span>Total paid to fitters</span><span>{fmtMoney(totalCost)}</span></div>
              <div><span>Total charged</span><span>{fmtMoney(totalCharge)}</span></div>
              <div className="hp-quote-total-row">
                <span>Left to us</span>
                <span className={margin < 0 ? "hp-margin-negative" : ""}>{fmtMoney(margin)} ({marginPct.toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          <div className="hp-field">
            <label>Notes (optional)</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering about this job" />
          </div>

          {error && <p className="hp-login-error">{error}</p>}
          <div className="hp-panel-footer hp-panel-footer-end">
            <button className="hp-btn hp-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="hp-btn hp-btn-primary" disabled={!projectName.trim() || saving} onClick={save}>
              {saving ? "Saving…" : "Save job"}
            </button>
          </div>
        </div>
      </div>

      {showPicker && <LabourItemPicker onPick={pickFromCatalog} onClose={() => setShowPicker(false)} />}
    </div>
  );
}
