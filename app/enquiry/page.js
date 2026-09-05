"use client";

import { useState } from "react";
import { PROJECT_TYPES, WOOD_SPECIES } from "@/lib/constants";

const PROJECT_TYPE_OPTIONS = ["Not sure yet", ...PROJECT_TYPES];
const WOOD_SPECIES_OPTIONS = ["Not sure yet", ...WOOD_SPECIES];

export default function PublicEnquiryPage() {
  const [f, setF] = useState({
    name: "", companyName: "", email: "", phone: "",
    projectType: "", woodSpecies: "", areaSqm: "", rooms: "", message: "",
    website: "", // honeypot — real visitors never see or fill this in
  });
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [error, setError] = useState("");

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.email.trim()) return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/public/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong — please try again, or call us directly.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch (err) {
      setError("Something went wrong — please try again, or call us directly.");
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="hp-enquiry-shell">
        <div className="hp-enquiry-card">
          <div className="hp-login-brand">
            <div className="hp-login-mark">HP</div>
            <div className="hp-login-name">Hoff Parquet</div>
          </div>
          <h1 className="hp-enquiry-title">Thank you</h1>
          <p className="hp-muted-small">
            We&apos;ve received your enquiry and will be in touch shortly. If it&apos;s urgent, you can also call us
            on 0131 385 7779.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="hp-enquiry-shell">
      <div className="hp-enquiry-card">
        <div className="hp-login-brand">
          <div className="hp-login-mark">HP</div>
          <div className="hp-login-name">Hoff Parquet</div>
        </div>
        <h1 className="hp-enquiry-title">Tell us about your project</h1>
        <p className="hp-muted-small" style={{ marginBottom: 20 }}>
          Share a few details and our team will get back to you with samples, pricing, or trade terms.
        </p>

        <form onSubmit={submit}>
          <div className="hp-panel-grid">
            <div className="hp-field">
              <label>Name *</label>
              <input value={f.name} onChange={set("name")} required />
            </div>
            <div className="hp-field">
              <label>Company / trade name</label>
              <input value={f.companyName} onChange={set("companyName")} />
            </div>
            <div className="hp-field">
              <label>Email *</label>
              <input type="email" value={f.email} onChange={set("email")} required />
            </div>
            <div className="hp-field">
              <label>Phone</label>
              <input type="tel" value={f.phone} onChange={set("phone")} />
            </div>
            <div className="hp-field">
              <label>Project type</label>
              <select value={f.projectType} onChange={set("projectType")}>
                {PROJECT_TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="hp-field">
              <label>Wood species</label>
              <select value={f.woodSpecies} onChange={set("woodSpecies")}>
                {WOOD_SPECIES_OPTIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="hp-field">
              <label>Approx. area (m²)</label>
              <input type="number" value={f.areaSqm} onChange={set("areaSqm")} />
            </div>
            <div className="hp-field">
              <label>Room(s)</label>
              <input value={f.rooms} onChange={set("rooms")} placeholder="e.g. Living room, hallway" />
            </div>
            <div className="hp-field hp-field-wide">
              <label>Tell us about your project</label>
              <textarea rows={4} value={f.message} onChange={set("message")} placeholder="Materials you're after, timescales, anything else useful" />
            </div>
          </div>

          {/* Honeypot — hidden from real visitors via CSS, invisible to screen readers */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
            <label htmlFor="website">Leave this field blank</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
          </div>

          {error && <p className="hp-login-error">{error}</p>}

          <button type="submit" className="hp-btn hp-btn-primary" disabled={status === "sending" || !f.name.trim() || !f.email.trim()} style={{ marginTop: 16, width: "100%", justifyContent: "center" }}>
            {status === "sending" ? "Sending…" : "Send enquiry"}
          </button>
        </form>
      </div>
    </div>
  );
}
