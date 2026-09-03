"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, StickyNote } from "lucide-react";
import Topbar from "@/components/Topbar";
import NewEnquiryModal from "@/components/NewEnquiryModal";
import { api } from "@/lib/api";
import { STAGES, fmtMoney, fmtDate, itemsSubtotal } from "@/lib/constants";

export default function DashboardPage() {
  const [clients, setClients] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    api.listClients().then(setClients).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="hp-main"><p className="hp-login-error">{error}</p></div>;
  if (!clients) {
    return (
      <div className="hp-main" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Loader2 className="spin" size={20} /> Loading…
      </div>
    );
  }

  const active = clients.filter((c) => c.stage !== "completed");
  const pipelineValue = active.reduce((s, c) => s + (Number(c.estimateValue) || 0), 0);
  const awaitingPayment = clients.filter((c) => !c.paidInFull && c.stage !== "completed").length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const installsThisMonth = clients.filter((c) => c.installationDate && c.installationDate.slice(0, 7) === thisMonth).length;

  const outstandingInvoices = clients.reduce((sum, c) => {
    return (
      sum +
      (c.invoices || [])
        .filter((inv) => inv.status !== "paid")
        .reduce((s, inv) => {
          const sub = itemsSubtotal(inv.items);
          return s + sub + (inv.applyVat ? (sub * (Number(inv.vatRate) || 0)) / 100 : 0);
        }, 0)
    );
  }, 0);

  const stageCounts = STAGES.map((s) => ({ ...s, count: clients.filter((c) => c.stage === s.id).length }));
  const maxCount = Math.max(1, ...stageCounts.map((s) => s.count));

  const recentNotes = clients
    .flatMap((c) => (c.notes || []).map((n) => ({ ...n, client: c })))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);

  return (
    <>
      <Topbar title="Dashboard" onNew={() => setShowNew(true)} />
      <main className="hp-main">
        {clients.length === 0 ? (
          <div className="hp-empty">
            <div className="hp-empty-mark">HP</div>
            <h2>No enquiries yet</h2>
            <p>Add your first enquiry to start filling this workspace.</p>
          </div>
        ) : (
          <div className="hp-dash">
            <div className="hp-stat-grid">
              <StatCard label="Active projects" value={active.length} />
              <StatCard label="Pipeline value" value={fmtMoney(pipelineValue)} />
              <StatCard label="Awaiting payment" value={awaitingPayment} />
              <StatCard label="Installs this month" value={installsThisMonth} />
              <StatCard label="Outstanding invoices" value={fmtMoney(outstandingInvoices)} />
            </div>

            <div className="hp-dash-grid">
              <section className="hp-card">
                <h2 className="hp-card-title">Pipeline by stage</h2>
                <div className="hp-stage-bars">
                  {stageCounts.map((s) => (
                    <div key={s.id} className="hp-stage-bar-row">
                      <div className="hp-stage-bar-label">{s.short}</div>
                      <div className="hp-stage-bar-track">
                        <div className="hp-stage-bar-fill" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                      </div>
                      <div className="hp-stage-bar-count">{s.count}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="hp-card hp-card-wide">
                <h2 className="hp-card-title">Recent activity</h2>
                {recentNotes.length === 0 ? (
                  <p className="hp-muted-small">No activity logged yet.</p>
                ) : (
                  <ul className="hp-activity-list">
                    {recentNotes.map((n) => (
                      <li key={n.id} onClick={() => router.push(`/clients/${n.client.id}`)}>
                        <StickyNote size={13} strokeWidth={1.8} />
                        <div>
                          <span className="hp-activity-name">{n.client.name}</span> — {n.text}
                          <div className="hp-activity-date">{fmtDate(n.date)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
      {showNew && (
        <NewEnquiryModal
          onClose={() => setShowNew(false)}
          onCreated={(client) => router.push(`/clients/${client.id}`)}
        />
      )}
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="hp-stat-card">
      <div className="hp-stat-value">{value}</div>
      <div className="hp-stat-label">{label}</div>
    </div>
  );
}
