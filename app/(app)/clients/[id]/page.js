"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Trash2, Plus } from "lucide-react";
import Topbar from "@/components/Topbar";
import QuoteBuilder from "@/components/QuoteBuilder";
import QuotePreview from "@/components/QuotePreview";
import { api } from "@/lib/api";
import { STAGES, stageIndex, PROJECT_TYPES, WOOD_SPECIES, SOURCES, fmtDate, fmtMoney, itemsSubtotal } from "@/lib/constants";

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [settings, setSettings] = useState(null);
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [previewQuote, setPreviewQuote] = useState(null);

  const load = useCallback(() => {
    api.getClient(id).then(setClient);
  }, [id]);

  useEffect(() => {
    load();
    api.getSettings().then(setSettings);
  }, [load]);

  if (!client) {
    return (
      <main className="hp-main" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Loader2 className="spin" size={20} /> Loading…
      </main>
    );
  }

  const currentIdx = stageIndex(client.stage);

  const patchField = async (patch) => {
    setClient((prev) => ({ ...prev, ...patch }));
    await api.updateClient(id, patch);
  };

  const setStage = async (stageId) => {
    setClient((prev) => ({ ...prev, stage: stageId }));
    await api.updateClient(id, { stage: stageId });
  };

  const addNote = async () => {
    if (!note.trim()) return;
    const created = await api.addNote(id, note.trim());
    setClient((prev) => ({ ...prev, notes: [created, ...prev.notes] }));
    setNote("");
  };

  const deleteClient = async () => {
    await api.deleteClient(id);
    router.push("/clients");
  };

  return (
    <>
      <Topbar title={client.name} />
      <main className="hp-main">
        <div className="hp-card" style={{ marginBottom: 16 }}>
          <div className="hp-stepper" style={{ padding: 0, marginBottom: 20 }}>
            {STAGES.map((s, i) => (
              <button
                key={s.id}
                className={"hp-step" + (i <= currentIdx ? " done" : "") + (i === currentIdx ? " current" : "")}
                onClick={() => setStage(s.id)}
                title={s.label}
              >
                <span className="hp-step-dot">{i < currentIdx ? <CheckCircle2 size={12} /> : i + 1}</span>
                <span className="hp-step-label">{s.short}</span>
              </button>
            ))}
          </div>

          <div className="hp-panel-grid">
            <Field label="Client name" value={client.name} onChange={(v) => patchField({ name: v })} />
            <Field label="Company name" value={client.companyName} onChange={(v) => patchField({ companyName: v })} />
            <Field label="Email" value={client.email} onChange={(v) => patchField({ email: v })} />
            <Field label="Phone" value={client.phone} onChange={(v) => patchField({ phone: v })} />
            <Field label="Site address" value={client.address} onChange={(v) => patchField({ address: v })} wide />
            <SelectField label="Project type" value={client.projectType} options={PROJECT_TYPES} onChange={(v) => patchField({ projectType: v })} />
            <SelectField label="Wood species" value={client.woodSpecies} options={WOOD_SPECIES} onChange={(v) => patchField({ woodSpecies: v })} />
            <Field label="Area (m²)" value={client.areaSqm} onChange={(v) => patchField({ areaSqm: v })} type="number" />
            <Field label="Rooms" value={client.rooms} onChange={(v) => patchField({ rooms: v })} />
            <SelectField label="Source" value={client.source} options={SOURCES} onChange={(v) => patchField({ source: v })} />
            <Field label="Estimate value (£)" value={client.estimateValue} onChange={(v) => patchField({ estimateValue: v })} type="number" />
            <Field label="Deposit taken (£)" value={client.depositAmount} onChange={(v) => patchField({ depositAmount: v })} type="number" />
            <Field label="Target installation date" value={client.installationDate} onChange={(v) => patchField({ installationDate: v })} type="date" />
            <label className="hp-checkbox">
              <input type="checkbox" checked={client.paidInFull} onChange={(e) => patchField({ paidInFull: e.target.checked })} />
              Paid in full
            </label>
          </div>
        </div>

        <div className="hp-card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Activity &amp; notes</h3>
          <div className="hp-note-input">
            <input
              placeholder="Add a note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNote()}
            />
            <button className="hp-btn hp-btn-secondary" onClick={addNote}>Add</button>
          </div>
          <ul className="hp-notes-list">
            {client.notes.map((n) => (
              <li key={n.id}>
                <span className="hp-note-date">{fmtDate(n.date)}</span>
                <span>{n.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="hp-card" style={{ marginBottom: 16 }}>
          <div className="hp-panel-notes-head">
            <h3 style={{ margin: 0 }}>Quotations</h3>
            <button className="hp-btn hp-btn-secondary" onClick={() => { setEditingQuote(null); setShowQuoteBuilder(true); }}>
              <Plus size={14} /> New quotation
            </button>
          </div>
          {client.quotes.length === 0 ? (
            <p className="hp-muted-small">No quotations yet for this client.</p>
          ) : (
            <ul className="hp-quote-list">
              {client.quotes.map((q) => {
                const total = itemsSubtotal(q.items) * (q.applyVat ? 1 + (Number(q.vatRate) || 0) / 100 : 1);
                return (
                  <li key={q.id} onClick={() => setPreviewQuote(q)}>
                    <div>
                      <div className="hp-mini-list-name">{q.number || "Draft"}</div>
                      <div className="hp-mini-list-sub">{fmtDate(q.dateCreated)} · valid until {fmtDate(q.validUntil)}</div>
                    </div>
                    <div className="hp-quote-list-right">
                      <span className={"hp-badge " + (q.status === "sent" ? "hp-badge-sage" : "hp-badge-slate")}>
                        {q.status === "sent" ? "Sent" : "Draft"}
                      </span>
                      <span className="hp-mini-list-date">{fmtMoney(total)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="hp-card">
          {!confirmDelete ? (
            <button className="hp-btn hp-btn-danger-ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Delete record
            </button>
          ) : (
            <div className="hp-confirm-clear">
              <span>Delete this client record? This can't be undone.</span>
              <button className="hp-btn hp-btn-danger" onClick={deleteClient}>Confirm delete</button>
              <button className="hp-btn hp-btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          )}
        </div>
      </main>

      {showQuoteBuilder && (
        <QuoteBuilder
          client={client}
          existing={editingQuote}
          onClose={() => setShowQuoteBuilder(false)}
          onSaved={(saved) => {
            setClient((prev) => ({
              ...prev,
              quotes: prev.quotes.some((q) => q.id === saved.id)
                ? prev.quotes.map((q) => (q.id === saved.id ? saved : q))
                : [saved, ...prev.quotes],
            }));
            setShowQuoteBuilder(false);
            setPreviewQuote(saved);
          }}
        />
      )}

      {previewQuote && (
        <QuotePreview
          client={client}
          settings={settings}
          quote={previewQuote}
          onClose={() => setPreviewQuote(null)}
          onEdit={() => { setEditingQuote(previewQuote); setPreviewQuote(null); setShowQuoteBuilder(true); }}
          onDeleted={() => {
            setClient((prev) => ({ ...prev, quotes: prev.quotes.filter((q) => q.id !== previewQuote.id) }));
            setPreviewQuote(null);
          }}
          onSent={(updated) => {
            setClient((prev) => ({ ...prev, quotes: prev.quotes.map((q) => (q.id === updated.id ? updated : q)) }));
            setPreviewQuote(updated);
          }}
        />
      )}
    </>
  );
}

function Field({ label, value, onChange, type = "text", wide }) {
  return (
    <div className={"hp-field" + (wide ? " hp-field-wide" : "")}>
      <label>{label}</label>
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div className="hp-field">
      <label>{label}</label>
      <select value={value || options[0]} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
