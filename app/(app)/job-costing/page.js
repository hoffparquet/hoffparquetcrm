"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Topbar from "@/components/Topbar";
import JobCostingForm from "@/components/JobCostingForm";
import { api } from "@/lib/api";
import { fmtMoney, fmtDate } from "@/lib/constants";

function StatCard({ label, value }) {
  return (
    <div className="hp-stat-card">
      <div className="hp-stat-value">{value}</div>
      <div className="hp-stat-label">{label}</div>
    </div>
  );
}

function jobTotals(job) {
  const totalCost = job.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.costPerUnit) || 0), 0);
  const totalCharge = job.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.chargePerUnit) || 0), 0);
  return { totalCost, totalCharge, margin: totalCharge - totalCost };
}

export default function JobCostingPage() {
  const [jobs, setJobs] = useState(null);
  const [clients, setClients] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    api.listInstallationJobs().then(setJobs);
    api.listClients().then(setClients);
  }, []);

  if (!jobs || !clients) {
    return (
      <main className="hp-main" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Loader2 className="spin" size={20} /> Loading…
      </main>
    );
  }

  const clientName = (id) => clients.find((c) => c.id === id)?.name || "—";

  const grand = jobs.reduce(
    (acc, j) => {
      const t = jobTotals(j);
      acc.cost += t.totalCost;
      acc.charge += t.totalCharge;
      return acc;
    },
    { cost: 0, charge: 0 }
  );
  const grandMargin = grand.charge - grand.cost;

  const deleteJob = async (id) => {
    await api.deleteInstallationJob(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setConfirmDeleteId(null);
  };

  return (
    <>
      <Topbar title="Job Costing" onNew={() => { setEditing(null); setShowForm(true); }} />
      <main className="hp-main">
        <p className="hp-muted-small" style={{ marginBottom: 14 }}>
          What we actually pay fitters per named project, versus what we charge — separate from the catalog-level
          Labour Margins view, since real jobs can vary from the standard rates.
        </p>

        {jobs.length === 0 ? (
          <div className="hp-empty">
            <div className="hp-empty-mark">HP</div>
            <h2>No jobs logged yet</h2>
            <p>Add a job to start tracking what you pay fitters against what you charge.</p>
          </div>
        ) : (
          <>
            <div className="hp-stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
              <StatCard label="Total paid to fitters" value={fmtMoney(grand.cost)} />
              <StatCard label="Total charged" value={fmtMoney(grand.charge)} />
              <StatCard label="Left to us" value={fmtMoney(grandMargin)} />
            </div>

            <div className="hp-table-wrap">
              <table className="hp-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Fitter</th>
                    <th>Paid to fitter</th>
                    <th>Charged</th>
                    <th>Left to us</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => {
                    const t = jobTotals(j);
                    return (
                      <tr key={j.id} onClick={() => { setEditing(j); setShowForm(true); }}>
                        <td>
                          <div className="hp-table-name">{j.projectName || "Untitled job"}</div>
                        </td>
                        <td className="hp-table-sub">{j.clientId ? clientName(j.clientId) : "—"}</td>
                        <td className="hp-table-sub">{fmtDate(j.jobDate)}</td>
                        <td className="hp-table-sub">{j.fitterName || "—"}</td>
                        <td>{fmtMoney(t.totalCost)}</td>
                        <td>{fmtMoney(t.totalCharge)}</td>
                        <td className={t.margin < 0 ? "hp-margin-negative" : ""}>{fmtMoney(t.margin)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {confirmDeleteId === j.id ? (
                            <span className="hp-confirm-clear">
                              <button className="hp-btn hp-btn-danger" onClick={() => deleteJob(j.id)}>Confirm</button>
                              <button className="hp-btn hp-btn-ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                            </span>
                          ) : (
                            <button className="hp-icon-btn" onClick={() => setConfirmDeleteId(j.id)} title="Delete this job">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {showForm && (
        <JobCostingForm
          existing={editing}
          onClose={() => setShowForm(false)}
          onSaved={(saved) => {
            setJobs((prev) => (prev.some((j) => j.id === saved.id) ? prev.map((j) => (j.id === saved.id ? saved : j)) : [saved, ...prev]));
            setShowForm(false);
          }}
        />
      )}
    </>
  );
}
