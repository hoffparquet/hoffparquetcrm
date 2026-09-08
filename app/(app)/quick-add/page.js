"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste } from "lucide-react";
import Topbar from "@/components/Topbar";
import { api } from "@/lib/api";
import { parseWeeblyOrderText } from "@/lib/parseOrder";

export default function QuickAddPage() {
  const router = useRouter();
  const [pasted, setPasted] = useState("");
  const [parsed, setParsed] = useState(false);
  const [f, setF] = useState({
    name: "", email: "", phone: "", address: "", note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const runParse = () => {
    if (!pasted.trim()) return;
    const r = parseWeeblyOrderText(pasted);

    const noteLines = [];
    if (r.samples) noteLines.push(`Samples ordered: ${r.samples}`);
    if (r.orderReference) noteLines.push(`Order reference: ${r.orderReference}`);
    if (r.billingName && r.billingName !== r.name) noteLines.push(`Billing name: ${r.billingName}`);
    if (r.billingEmail && r.billingEmail !== r.email) noteLines.push(`Billing email: ${r.billingEmail}`);

    setF({
      name: r.name || "",
      email: r.email || r.billingEmail || "",
      phone: r.phone || "",
      address: r.address || "",
      note: noteLines.join("\n"),
    });
    setParsed(true);
  };

  const startOver = () => {
    setPasted("");
    setParsed(false);
    setF({ name: "", email: "", phone: "", address: "", note: "" });
    setError("");
  };

  const submit = async () => {
    if (!f.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const client = await api.createClient({
        name: f.name,
        email: f.email,
        phone: f.phone,
        address: f.address,
        source: "Sample Order",
        note: f.note,
      });
      router.push(`/clients/${client.id}`);
    } catch (err) {
      setError(err.message || "Couldn't create this client — try again.");
      setSaving(false);
    }
  };

  return (
    <>
      <Topbar title="Add from Order" />
      <main className="hp-main">
        <div className="hp-card" style={{ maxWidth: 720 }}>
          <h2 className="hp-card-title">Paste a Weebly order</h2>
          <p className="hp-muted-small" style={{ marginBottom: 14 }}>
            Open the order in Weebly, select all the text on the page (Cmd/Ctrl+A) and copy it, then paste it below.
            This reads what it can — check the fields below before saving, since it won't always get everything
            exactly right.
          </p>

          {!parsed ? (
            <>
              <div className="hp-field hp-field-wide">
                <label>Paste the order page here</label>
                <textarea
                  rows={12}
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder="Click into the Weebly order, Cmd/Ctrl+A, Cmd/Ctrl+C, then paste here…"
                />
              </div>
              <div className="hp-panel-footer hp-panel-footer-end" style={{ borderTop: "none", paddingTop: 4 }}>
                <button className="hp-btn hp-btn-primary" onClick={runParse} disabled={!pasted.trim()}>
                  <ClipboardPaste size={14} /> Read this order
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="hp-panel-grid">
                <div className="hp-field hp-field-wide">
                  <label>Client name *</label>
                  <input value={f.name} onChange={set("name")} autoFocus />
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
                  <label>Address</label>
                  <input value={f.address} onChange={set("address")} />
                </div>
                <div className="hp-field hp-field-wide">
                  <label>Note (samples ordered, order reference, etc.)</label>
                  <textarea rows={4} value={f.note} onChange={set("note")} />
                </div>
              </div>
              {!f.name.trim() && (
                <p className="hp-login-error">Couldn't find a name automatically — please add one before saving.</p>
              )}
              {error && <p className="hp-login-error">{error}</p>}
              <div className="hp-panel-footer hp-panel-footer-end">
                <button className="hp-btn hp-btn-ghost" onClick={startOver}>Start over</button>
                <button className="hp-btn hp-btn-primary" disabled={!f.name.trim() || saving} onClick={submit}>
                  {saving ? "Creating…" : "Create client"}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
