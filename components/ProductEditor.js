"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { PROJECT_TYPES, WOOD_SPECIES, QUOTE_UNITS, uid } from "@/lib/constants";
import { api } from "@/lib/api";

export default function ProductEditor({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || "");
  const [category, setCategory] = useState(existing?.category || PROJECT_TYPES[0]);
  const [woodSpecies, setWoodSpecies] = useState(existing?.woodSpecies || WOOD_SPECIES[0]);
  const [unit, setUnit] = useState(existing?.unit || "m²");
  const [description, setDescription] = useState(existing?.description || "");
  const [origin, setOrigin] = useState(existing?.origin || "");
  const [finish, setFinish] = useState(existing?.finish || "");
  const [gradeNotes, setGradeNotes] = useState(existing?.gradeNotes || "");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [variations, setVariations] = useState(
    existing?.variations?.length ? existing.variations : [{ id: uid(), label: "", price: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addVariation = () => setVariations([...variations, { id: uid(), label: "", price: "" }]);
  const updateVariation = (id, patch) => setVariations(variations.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const removeVariation = (id) => setVariations(variations.filter((v) => v.id !== id));

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const saved = await api.saveProduct({
        id: existing?.id,
        name: name.trim(),
        category,
        woodSpecies,
        unit,
        description,
        origin,
        finish,
        gradeNotes,
        notes,
        variations: variations.filter((v) => v.label.trim() || v.price),
      });
      onSaved(saved);
    } catch (err) {
      setError(err.message || "Couldn't save this product — try again.");
      setSaving(false);
    }
  };

  return (
    <div className="hp-overlay" onClick={onClose}>
      <div className="hp-panel hp-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="hp-panel-head">
          <h2>{existing ? "Edit product" : "Add product"}</h2>
          <button className="hp-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="hp-panel-body">
          <div className="hp-panel-grid">
            <div className="hp-field hp-field-wide">
              <label>Product name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineered Ash Planks" autoFocus />
            </div>
            <div className="hp-field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="hp-field">
              <label>Wood species</label>
              <select value={woodSpecies} onChange={(e) => setWoodSpecies(e.target.value)}>
                {WOOD_SPECIES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="hp-field">
              <label>Pricing unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {QUOTE_UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="hp-field hp-field-wide">
              <label>Description</label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="hp-field">
              <label>Origin (optional)</label>
              <input value={origin} onChange={(e) => setOrigin(e.target.value)} />
            </div>
            <div className="hp-field">
              <label>Finish (optional)</label>
              <input value={finish} onChange={(e) => setFinish(e.target.value)} />
            </div>
            <div className="hp-field hp-field-wide">
              <label>Grade notes (optional)</label>
              <textarea rows={2} value={gradeNotes} onChange={(e) => setGradeNotes(e.target.value)} />
            </div>
            <div className="hp-field hp-field-wide">
              <label>Other notes (optional)</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery times, trade pricing, samples, etc." />
            </div>
          </div>

          <div className="hp-quote-items">
            <div className="hp-variation-items-head hp-variation-items-head-cost">
              <span>Specification (size, thickness, grade, colour…)</span>
              <span>Cost (£)</span>
              <span>Retail (£)</span>
              <span>B2B (£)</span>
              <span></span>
            </div>
            {variations.map((v) => (
              <div className="hp-variation-item-row hp-variation-item-row-cost" key={v.id}>
                <input
                  placeholder="e.g. 16mm / 200mm / 1800-2700mm — Select"
                  value={v.label}
                  onChange={(e) => updateVariation(v.id, { label: e.target.value })}
                />
                <input
                  type="number"
                  value={v.costPrice ?? ""}
                  placeholder="unknown"
                  onChange={(e) => updateVariation(v.id, { costPrice: e.target.value })}
                />
                <input type="number" value={v.price} onChange={(e) => updateVariation(v.id, { price: e.target.value })} />
                <input
                  type="number"
                  value={v.b2bPrice ?? ""}
                  placeholder={v.price ? `${Math.round(Number(v.price) * 0.85 * 100) / 100}` : "auto -15%"}
                  onChange={(e) => updateVariation(v.id, { b2bPrice: e.target.value })}
                />
                <button className="hp-icon-btn" onClick={() => removeVariation(v.id)} disabled={variations.length === 1}>
                  <X size={15} />
                </button>
              </div>
            ))}
            <button className="hp-btn hp-btn-ghost hp-add-item-btn" onClick={addVariation}>
              <Plus size={14} /> Add variation
            </button>
            <p className="hp-muted-small">
              Leave B2B blank to auto-calculate as 15% below retail. Cost is what we pay — leave it blank if you
              don&apos;t know it yet; it won&apos;t appear in the Margins view until it&apos;s filled in.
            </p>
          </div>

          {error && <p className="hp-login-error">{error}</p>}
          <div className="hp-panel-footer hp-panel-footer-end">
            <button className="hp-btn hp-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="hp-btn hp-btn-primary" disabled={!name.trim() || saving} onClick={save}>
              {saving ? "Saving…" : "Save product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
