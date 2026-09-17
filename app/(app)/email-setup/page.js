"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, X as XIcon, ShieldCheck, RefreshCw } from "lucide-react";
import Topbar from "@/components/Topbar";
import { leadApi } from "@/lib/leadApi";

function Row({ label, result }) {
  if (!result) return null;
  return (
    <div className={"hp-check-row" + (result.pass ? " pass" : " fail")}>
      <div className="hp-check-icon">{result.pass ? <Check size={15} /> : <XIcon size={15} />}</div>
      <div className="hp-check-body">
        <div className="hp-check-label">{label}</div>
        <div className="hp-check-detail">{result.detail}</div>
        {!result.pass && result.fix && <div className="hp-check-fix">{result.fix}</div>}
      </div>
    </div>
  );
}

export default function EmailSetupPage() {
  const [settings, setSettings] = useState(null);
  const [domain, setDomain] = useState("");
  const [key, setKey] = useState("");
  const [keyState, setKeyState] = useState(null);
  const [savingKey, setSavingKey] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    leadApi
      .getSettings()
      .then((s) => {
        setSettings(s);
        setDomain(s.sendingDomain || "");
      })
      .catch((e) => setError(e.message));
  }, []);

  const testAndSaveKey = async () => {
    setSavingKey(true);
    setKeyState(null);
    setError("");
    try {
      const test = await leadApi.testKey(key);
      if (!test.ok) {
        setKeyState({ ok: false, message: test.error });
        return;
      }
      const saved = await leadApi.saveSettings({ companiesHouseKey: key });
      setSettings(saved);
      setKey("");
      setKeyState({ ok: true, message: "Key works and is saved." });
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingKey(false);
    }
  };

  const saveDomain = async () => {
    setSavingDomain(true);
    setError("");
    try {
      const saved = await leadApi.saveSettings({ sendingDomain: domain });
      setSettings(saved);
      setDomain(saved.sendingDomain);
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingDomain(false);
    }
  };

  const runCheck = async () => {
    setChecking(true);
    setError("");
    setCheck(null);
    try {
      const res = await leadApi.checkEmailSetup(domain);
      setCheck(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setChecking(false);
    }
  };

  if (!settings) {
    return (
      <>
        <Topbar title="Email & leads setup" />
        <main className="hp-main" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Loader2 className="spin" size={20} /> Loading…
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title="Email & leads setup" />
      <main className="hp-main">
        <div className="hp-settings">
          {error && <div className="hp-lead-error">{error}</div>}

          <div className="hp-card">
            <h2 className="hp-card-title">Companies House API key</h2>
            <p className="hp-muted-small" style={{ margin: "0 0 12px" }}>
              This is what lets the Leads page search the company register. It&apos;s free, from
              developer.company-information.service.gov.uk. Paste it here and it&apos;s saved straight to your
              database — no redeploy needed.
            </p>

            {settings.companiesHouseKeySet && (
              <div className="hp-email-connected" style={{ marginBottom: 12 }}>
                <div>
                  <div className="hp-email-connected-label">Key saved</div>
                  <div className="hp-email-connected-value">Ending {settings.companiesHouseKeyHint}</div>
                </div>
              </div>
            )}

            <div className="hp-field">
              <label>{settings.companiesHouseKeySet ? "Replace the key" : "Paste your key"}</label>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Paste the REST API key here"
                autoComplete="off"
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="hp-btn hp-btn-primary" onClick={testAndSaveKey} disabled={savingKey || !key.trim()}>
                {savingKey ? <Loader2 size={15} className="spin" /> : <ShieldCheck size={15} />}
                Test and save
              </button>
            </div>
            {keyState && (
              <div className={keyState.ok ? "hp-lead-success" : "hp-lead-error"} style={{ marginTop: 10 }}>
                {keyState.message}
              </div>
            )}
          </div>

          <div className="hp-card">
            <h2 className="hp-card-title">Sending domain</h2>
            <p className="hp-muted-small" style={{ margin: "0 0 12px" }}>
              The separate domain you send outreach from — never hofftimber.com. Cold email attracts complaints,
              and you don&apos;t want those landing on the address your invoices go out from.
            </p>
            <div className="hp-field">
              <label>Domain</label>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="hoffparquet-trade.co.uk"
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="hp-btn hp-btn-secondary" onClick={saveDomain} disabled={savingDomain}>
                {savingDomain ? <Loader2 size={15} className="spin" /> : null} Save domain
              </button>
            </div>
          </div>

          <div className="hp-card">
            <div className="hp-panel-notes-head">
              <h2 className="hp-card-title" style={{ margin: 0 }}>
                Email authentication check
              </h2>
              <button
                className="hp-btn hp-btn-primary"
                onClick={runCheck}
                disabled={checking || !settings.sendingDomain}
              >
                {checking ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
                Run check
              </button>
            </div>
            <p className="hp-muted-small" style={{ margin: "0 0 12px" }}>
              Reads the live DNS records for your sending domain and tells you whether SPF, DKIM and DMARC are
              actually right. Get these wrong and your outreach goes to junk. DNS changes can take up to 24 hours
              to show up here.
            </p>

            {!settings.sendingDomain && (
              <p className="hp-muted-small">Save a sending domain above first.</p>
            )}

            {check && (
              <>
                <div className={"hp-check-summary" + (check.allPass ? " pass" : " fail")}>
                  {check.allPass
                    ? `${check.domain} is set up correctly. Safe to start sending.`
                    : `${check.domain} isn't ready yet — fix the red items below.`}
                </div>

                <Row label="SPF — says which servers may send as you" result={check.spf} />

                <div className={"hp-check-row" + (check.dkim.pass ? " pass" : " fail")}>
                  <div className="hp-check-icon">
                    {check.dkim.pass ? <Check size={15} /> : <XIcon size={15} />}
                  </div>
                  <div className="hp-check-body">
                    <div className="hp-check-label">DKIM — signs your mail so it can&apos;t be forged</div>
                    {check.dkim.selectors.map((s) => (
                      <div key={s.selector} style={{ marginTop: 4 }}>
                        <div className="hp-check-detail">
                          <strong>{s.selector}</strong>: {s.detail}
                        </div>
                        {!s.pass && <div className="hp-check-fix">{s.fix}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <Row label="DMARC — tells inboxes what to do with fakes" result={check.dmarc} />
                <Row label="MX — so replies can reach you" result={check.mx} />
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
