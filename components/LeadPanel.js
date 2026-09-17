"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, ExternalLink, Loader2, UserPlus, Trash2 } from "lucide-react";
import { leadApi } from "@/lib/leadApi";
import { LEAD_STATUSES, segmentLabel, segmentById } from "@/lib/leads";

// Slide-over for one lead: fill in the contact details Companies House
// doesn't publish, move it through the statuses, or turn it into a client.
export default function LeadPanel({ lead, onClose, onChanged }) {
  const router = useRouter();
  const [form, setForm] = useState({
    contactName: lead.contactName || "",
    email: lead.email || "",
    phone: lead.phone || "",
    website: lead.website || "",
    status: lead.status || "new",
    notes: lead.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await leadApi.update(lead.id, form);
      onChanged?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const convert = async () => {
    setConverting(true);
    setError("");
    try {
      const res = await leadApi.convert(lead.id);
      onChanged?.();
      router.push(`/clients/${res.client.id}`);
    } catch (e) {
      setError(e.message);
      setConverting(false);
    }
  };

  const remove = async () => {
    setError("");
    try {
      await leadApi.remove(lead.id);
      onChanged?.();
      onClose();
    } catch (e) {
      setError(e.message);
    }
  };

  const segment = segmentById(lead.segment);

  return (
    <div className="hp-overlay" onClick={onClose}>
      <div className="hp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="hp-panel-head">
          <div>
            <h2>{lead.companyName}</h2>
            <div className="hp-panel-sub">
              {segmentLabel(lead.segment)}
              {lead.companyNumber && ` · Company no. ${lead.companyNumber}`}
            </div>
          </div>
          <button className="hp-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="hp-panel-body">
          <div className="hp-card" style={{ padding: "14px 16px" }}>
            <div className="hp-muted-small" style={{ lineHeight: 1.6 }}>
              {lead.address || "No registered address on file"}
              <br />
              {lead.incorporatedOn && <>Incorporated {lead.incorporatedOn} · </>}
              {lead.companyStatus || "status unknown"}
              {lead.sicCodes?.length > 0 && (
                <>
                  <br />
                  SIC: {lead.sicCodes.join(", ")}
                </>
              )}
            </div>
            {lead.companyNumber && (
              <a
                className="hp-btn hp-btn-secondary"
                style={{ marginTop: 10 }}
                href={`https://find-and-update.company-information.service.gov.uk/company/${lead.companyNumber}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={14} /> View on Companies House
              </a>
            )}
          </div>

          {segment?.reviewRequired && lead.status === "review" && (
            <div className="hp-lead-warning">
              <span>
                Fit-out and joinery firm — could be a trade customer, could be a competitor. Look them up before
                approving.
              </span>
            </div>
          )}

          <div className="hp-panel-grid">
            <div className="hp-field">
              <label>Contact name</label>
              <input value={form.contactName} onChange={set("contactName")} placeholder="Who you'd write to" />
            </div>
            <div className="hp-field">
              <label>Status</label>
              <select value={form.status} onChange={set("status")}>
                {LEAD_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="hp-field">
              <label>Email</label>
              <input value={form.email} onChange={set("email")} placeholder="Not published by Companies House" />
            </div>
            <div className="hp-field">
              <label>Phone</label>
              <input value={form.phone} onChange={set("phone")} />
            </div>
            <div className="hp-field hp-field-wide">
              <label>Website</label>
              <input value={form.website} onChange={set("website")} placeholder="hoffparquet.co.uk" />
            </div>
            <div className="hp-field hp-field-wide">
              <label>Notes</label>
              <textarea rows={4} value={form.notes} onChange={set("notes")} />
            </div>
          </div>

          {error && <div className="hp-lead-error">{error}</div>}

          {lead.clientId ? (
            <div className="hp-lead-success">
              <span>Already a client.</span>
              <button className="hp-btn hp-btn-secondary" onClick={() => router.push(`/clients/${lead.clientId}`)}>
                Open client
              </button>
            </div>
          ) : (
            <div className="hp-card" style={{ padding: "14px 16px" }}>
              <div className="hp-card-title" style={{ marginBottom: 6 }}>
                Ready to do business?
              </div>
              <p className="hp-muted-small" style={{ margin: "0 0 10px" }}>
                Creates a real client in your pipeline at Initial Contact, carrying everything known about this
                company across. The lead stays here, marked converted.
              </p>
              <button className="hp-btn hp-btn-primary" onClick={convert} disabled={converting}>
                {converting ? <Loader2 size={15} className="spin" /> : <UserPlus size={15} />}
                Convert to client
              </button>
            </div>
          )}

          <div className="hp-panel-footer hp-panel-footer-end">
            <button className="hp-btn hp-btn-danger-ghost" onClick={remove}>
              <Trash2 size={14} /> Delete lead
            </button>
            <button className="hp-btn hp-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="hp-btn hp-btn-primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : null} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
