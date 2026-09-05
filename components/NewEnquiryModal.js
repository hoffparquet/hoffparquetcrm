"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PROJECT_TYPES, PROJECT_CATEGORIES, WOOD_SPECIES, SOURCES } from "@/lib/constants";
import { api } from "@/lib/api";

export default function NewEnquiryModal({ onClose, onCreated }) {
  const [f, setF] = useState({
    name: "", companyName: "", email: "", phone: "", address: "",
    projectType: PROJECT_TYPES[0], projectCategory: PROJECT_CATEGORIES[0], woodSpecies: WOOD_SPECIES[0],
    areaSqm: "", rooms: "", source: SOURCES[0], estimateValue: "", note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const client = await api.createClient(f);
      onCreated(client);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't save this enquiry — try again.");
      setSaving(false);
    }
  };

  return (
    <div className="hp-overlay" onClick={onClose}>
      <div className="hp-panel hp-panel-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="hp-panel-head">
          <h2>New enquiry</h2>
          <button className="hp-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="hp-panel-body">
          <div className="hp-panel-grid">
            <div className="hp-field hp-field-wide">
              <label>Client name *</label>
              <input value={f.name} onChange={set("name")} autoFocus />
            </div>
            <div className="hp-field hp-field-wide">
              <label>Company name (optional)</label>
              <input value={f.companyName} onChange={set("companyName")} />
            </div>
            <div className="hp-field">
              <label>Email</label>
              <input type="email" value={f.email} onChange={set("email")} />
            </div>
            <div className="hp-field">
              <label>Phone</label>
              <input type="tel" value={f.phone} onChange={set("phone")} />
            </div>
            <div className="hp-field hp-field-wide">
              <label>Site address</label>
              <input value={f.address} onChange={set("address")} />
            </div>
            <div className="hp-field">
              <label>Project type</label>
              <select value={f.projectType} onChange={set("projectType")}>
                {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="hp-field">
              <label>Project category</label>
              <select value={f.projectCategory} onChange={set("projectCategory")}>
                {PROJECT_CATEGORIES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="hp-field">
              <label>Wood species</label>
              <select value={f.woodSpecies} onChange={set("woodSpecies")}>
                {WOOD_SPECIES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="hp-field">
              <label>Area (m²)</label>
              <input type="number" value={f.areaSqm} onChange={set("areaSqm")} />
            </div>
            <div className="hp-field">
              <label>Rooms</label>
              <input value={f.rooms} onChange={set("rooms")} placeholder="e.g. Living room, hallway" />
            </div>
            <div className="hp-field">
              <label>Source</label>
              <select value={f.source} onChange={set("source")}>
                {SOURCES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="hp-field">
              <label>Estimate value (£)</label>
              <input type="number" value={f.estimateValue} onChange={set("estimateValue")} />
            </div>
            <div className="hp-field hp-field-wide">
              <label>Initial note</label>
              <textarea rows={3} value={f.note} onChange={set("note")} placeholder="What did they ask for?" />
            </div>
          </div>
          {error && <p className="hp-login-error">{error}</p>}
          <div className="hp-panel-footer hp-panel-footer-end">
            <button className="hp-btn hp-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="hp-btn hp-btn-primary" disabled={!f.name.trim() || saving} onClick={submit}>
              {saving ? "Creating…" : "Create enquiry"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
