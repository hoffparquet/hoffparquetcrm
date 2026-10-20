"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, History, Check, UserPlus, Undo2, AlertTriangle } from "lucide-react";
import Topbar from "@/components/Topbar";
import { fmtDate } from "@/lib/constants";

const TABS = [
  { id: "needs", label: "Needs reply" },
  { id: "replied", label: "Replied" },
  { id: "other", label: "Other mail" },
  { id: "dismissed", label: "No reply needed" },
];

function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function ageLabel(iso) {
  const d = daysSince(iso);
  if (d <= 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

export default function InboxPage() {
  const [messages, setMessages] = useState(null);
  const [mailboxes, setMailboxes] = useState([]);
  const [tab, setTab] = useState("needs");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [mRes, cRes] = await Promise.all([fetch("/api/email/messages"), fetch("/api/email/sync")]);
      const m = await mRes.json();
      if (!mRes.ok) throw new Error(m.error || "Could not load emails.");
      setMessages(m);
      if (cRes.ok) setMailboxes((await cRes.json()).mailboxes || []);
      setError("");
    } catch (e) {
      setError(e.message);
      setMessages([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runSync = async (backfillDays) => {
    setBusy(backfillDays ? "backfill" : "check");
    setNote("");
    try {
      const res = await fetch("/api/email/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backfillDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed.");
      const parts = data.results.map((r) => {
        if (!r.configured) return `${r.mailbox}: not connected yet`;
        if (r.error) return `${r.mailbox}: problem — ${r.error}`;
        return backfillDays
          ? `${r.mailbox}: ${r.newMessages} emails read, ${r.newEnquiries} look like enquiries`
          : `${r.mailbox}: ${r.newEnquiries} new enquiries added to the CRM`;
      });
      setNote(parts.join("  •  "));
      await load();
    } catch (e) {
      setNote(e.message);
    }
    setBusy("");
  };

  const patch = async (id, body) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/email/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not update.");
      await load();
    } catch (e) {
      setNote(e.message);
    }
    setBusy("");
  };

  if (!messages) {
    return (
      <main className="hp-main" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Loader2 className="spin" size={20} /> Loading…
      </main>
    );
  }

  const groups = {
    needs: messages.filter((m) => m.isEnquiry && !m.replied && !m.dismissed),
    replied: messages.filter((m) => m.isEnquiry && m.replied && !m.dismissed),
    other: messages.filter((m) => !m.isEnquiry && !m.dismissed),
    dismissed: messages.filter((m) => m.dismissed),
  };
  const shown = groups[tab];
  const notConnected = mailboxes.filter((m) => !m.configured);

  return (
    <>
      <Topbar title="Email enquiries" />
      <main className="hp-main">
        {error && <p className="hp-login-error" style={{ marginBottom: 14 }}>{error}</p>}

        {notConnected.length > 0 && (
          <div className="hp-card" style={{ marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div className="hp-muted-small">
              Not connected yet: {notConnected.map((m) => m.address).join(", ")}. The connection codes still need adding in Vercel.
            </div>
          </div>
        )}

        <div className="hp-mail-actions">
          <button className="hp-btn hp-btn-primary" onClick={() => runSync(0)} disabled={!!busy}>
            {busy === "check" ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />} Check now
          </button>
          <button className="hp-btn hp-btn-secondary" onClick={() => runSync(90)} disabled={!!busy}>
            {busy === "backfill" ? <Loader2 className="spin" size={15} /> : <History size={15} />} Check last 90 days
          </button>
        </div>
        {note && <p className="hp-muted-small" style={{ marginBottom: 14 }}>{note}</p>}

        <div className="hp-table-wrap">
          <div className="hp-table-filters">
            {TABS.map((t) => (
              <button key={t.id} className={"hp-pill" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>
                {t.label} ({groups[t.id].length})
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="hp-empty">
              <h2>{tab === "needs" ? "Nothing waiting for a reply" : "Nothing here"}</h2>
              <p>
                {tab === "needs"
                  ? "Enquiries that arrive by email and haven't been answered will appear here."
                  : "Emails will appear here after the next check."}
              </p>
            </div>
          ) : (
            <div className="hp-mail-list">
              {shown.map((m) => {
                const overdue = tab === "needs" && daysSince(m.receivedAt) >= 3;
                return (
                  <div className="hp-mail-row" key={m.id}>
                    <div className="hp-mail-main">
                      <div className="hp-mail-top">
                        <span className="hp-table-name">{m.senderName || m.senderEmail}</span>
                        <span className={"hp-badge " + (overdue ? "hp-badge-amber" : "hp-badge-slate")}>
                          {ageLabel(m.receivedAt)}
                        </span>
                      </div>
                      <div className="hp-mail-subject">{m.subject || "(no subject)"}</div>
                      <div className="hp-table-sub">
                        {m.senderEmail} · to {m.mailbox} · {fmtDate(m.receivedAt)}
                      </div>
                      {m.snippet && <div className="hp-mail-snippet">{m.snippet.slice(0, 220)}{m.snippet.length > 220 ? "…" : ""}</div>}
                    </div>
                    <div className="hp-mail-buttons">
                      {m.clientId ? (
                        <Link className="hp-btn hp-btn-secondary" href={`/clients/${m.clientId}`}>
                          Open client
                        </Link>
                      ) : (
                        <button className="hp-btn hp-btn-secondary" onClick={() => patch(m.id, { addToCrm: true })} disabled={busy === m.id}>
                          <UserPlus size={14} /> Add to CRM
                        </button>
                      )}
                      {m.dismissed ? (
                        <button className="hp-btn hp-btn-ghost" onClick={() => patch(m.id, { dismissed: false })} disabled={busy === m.id}>
                          <Undo2 size={14} /> Restore
                        </button>
                      ) : (
                        !m.replied && (
                          <button className="hp-btn hp-btn-ghost" onClick={() => patch(m.id, { dismissed: true })} disabled={busy === m.id}>
                            <Check size={14} /> No reply needed
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
