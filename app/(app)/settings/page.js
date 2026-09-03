"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import Topbar from "@/components/Topbar";
import { api } from "@/lib/api";

const DEFAULT_COMPANY = {
  name: "Hoff Parquet",
  address: "",
  phone: "",
  email: "",
  website: "",
  companyNumber: "",
  vatNumber: "",
  vatRegistered: false,
  logo: "",
  bankName: "",
  accountName: "",
  sortCode: "",
  accountNumber: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [company, setCompany] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s);
      setCompany({ ...DEFAULT_COMPANY, ...(s.company || {}) });
    });
  }, []);

  // Saves after a short pause in typing, rather than on every keystroke —
  // this field set is edited more like a form than the quick single-value
  // updates elsewhere in the app, so a small debounce keeps it from sending
  // a request per character.
  const persist = (nextCompany) => {
    setCompany(nextCompany);
    setSaved(false);
    setError("");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.updateSettings({ company: nextCompany });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setError(err.message || "Couldn't save — try again.");
      }
    }, 500);
  };

  const update = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    persist({ ...company, [field]: value });
  };

  const onLogoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => persist({ ...company, logo: reader.result });
    reader.readAsDataURL(file);
  };

  if (!company) {
    return (
      <main className="hp-main" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Loader2 className="spin" size={20} /> Loading…
      </main>
    );
  }

  return (
    <>
      <Topbar title="Settings" />
      <main className="hp-main">
        <div className="hp-settings">
          <section className="hp-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h2 className="hp-card-title">Quotation &amp; invoice letterhead</h2>
              {saved && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--sage)" }}>
                  <CheckCircle2 size={14} /> Saved
                </span>
              )}
            </div>
            <p className="hp-muted-small">
              These details appear on every quote and invoice you create, so keep them current. This isn&apos;t
              legal or tax advice — worth a quick check with your accountant that the VAT and company details match
              what HMRC and Companies House hold for you.
            </p>

            <div className="hp-logo-row">
              <div className="hp-logo-preview">
                {company.logo ? <img src={company.logo} alt="Company logo" /> : <span>No logo</span>}
              </div>
              <label className="hp-btn hp-btn-secondary hp-upload-btn">
                <Upload size={14} /> Upload logo
                <input type="file" accept="image/*" onChange={onLogoFile} hidden ref={fileInputRef} />
              </label>
            </div>

            <div className="hp-panel-grid" style={{ marginTop: 14 }}>
              <div className="hp-field hp-field-wide">
                <label>Business name</label>
                <input value={company.name} onChange={update("name")} />
              </div>
              <div className="hp-field hp-field-wide">
                <label>Address</label>
                <input value={company.address} onChange={update("address")} />
              </div>
              <div className="hp-field">
                <label>Phone</label>
                <input value={company.phone} onChange={update("phone")} />
              </div>
              <div className="hp-field">
                <label>Email for quotes</label>
                <input type="email" value={company.email} onChange={update("email")} placeholder="quotes@hoffparquet.co.uk" />
              </div>
              <div className="hp-field hp-field-wide">
                <label>Website</label>
                <input value={company.website} onChange={update("website")} />
              </div>
              <div className="hp-field">
                <label>Companies House number (if applicable)</label>
                <input value={company.companyNumber} onChange={update("companyNumber")} />
              </div>
              <div className="hp-field">
                <label>VAT registration number</label>
                <input
                  value={company.vatNumber}
                  disabled={!company.vatRegistered}
                  placeholder="GB 123 4567 89"
                  onChange={update("vatNumber")}
                />
              </div>
              <label className="hp-checkbox">
                <input type="checkbox" checked={company.vatRegistered} onChange={update("vatRegistered")} />
                VAT registered — show VAT on quotations and invoices
              </label>
            </div>

            <h3 className="hp-settings-subhead">Payment details for invoices</h3>
            <p className="hp-muted-small">Shown on unpaid invoices so clients know where to send payment. Leave blank to omit.</p>
            <div className="hp-panel-grid" style={{ marginTop: 10 }}>
              <div className="hp-field">
                <label>Bank name</label>
                <input value={company.bankName} onChange={update("bankName")} />
              </div>
              <div className="hp-field">
                <label>Account name</label>
                <input value={company.accountName} onChange={update("accountName")} />
              </div>
              <div className="hp-field">
                <label>Sort code</label>
                <input value={company.sortCode} placeholder="00-00-00" onChange={update("sortCode")} />
              </div>
              <div className="hp-field">
                <label>Account number</label>
                <input value={company.accountNumber} onChange={update("accountNumber")} />
              </div>
            </div>

            {error && <p className="hp-login-error" style={{ marginTop: 12 }}>{error}</p>}
          </section>
        </div>
      </main>
    </>
  );
}
