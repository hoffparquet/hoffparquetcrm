"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import Topbar from "@/components/Topbar";
import NewEnquiryModal from "@/components/NewEnquiryModal";
import { api } from "@/lib/api";
import { STAGES, stageIndex, fmtMoney, fmtDate } from "@/lib/constants";

export default function ClientsPage() {
  const [clients, setClients] = useState(null);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.listClients().then(setClients);
  }, []);

  if (!clients) {
    return (
      <main className="hp-main" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Loader2 className="spin" size={20} /> Loading…
      </main>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = clients.filter((c) => {
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q);
    const matchesStage = stageFilter === "all" || c.stage === stageFilter;
    return matchesQuery && matchesStage;
  });

  return (
    <>
      <Topbar title="Clients" onNew={() => setShowNew(true)} />
      <main className="hp-main">
        <div className="hp-search" style={{ marginBottom: 16, maxWidth: 360 }}>
          <Search size={15} />
          <input placeholder="Search clients…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <div className="hp-table-wrap">
          <div className="hp-table-filters">
            <button className={"hp-pill" + (stageFilter === "all" ? " active" : "")} onClick={() => setStageFilter("all")}>
              All ({clients.length})
            </button>
            {STAGES.map((s) => (
              <button key={s.id} className={"hp-pill" + (stageFilter === s.id ? " active" : "")} onClick={() => setStageFilter(s.id)}>
                {s.short}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="hp-empty">
              <h2>No matching clients</h2>
              <p>Try a different search or clear the stage filter.</p>
            </div>
          ) : (
            <table className="hp-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Stage</th>
                  <th>Value</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const stage = STAGES[stageIndex(c.stage)];
                  return (
                    <tr key={c.id} onClick={() => router.push(`/clients/${c.id}`)}>
                      <td>
                        <div className="hp-table-name">{c.name}</div>
                        <div className="hp-table-sub">{c.companyName || c.email || c.phone || "No contact details"}</div>
                      </td>
                      <td>
                        <div>{c.projectType || "—"}</div>
                        <div className="hp-table-sub">{c.woodSpecies || "—"}</div>
                      </td>
                      <td><span className="hp-badge hp-badge-oak">{stage.short}</span></td>
                      <td>{c.estimateValue ? fmtMoney(c.estimateValue) : "—"}</td>
                      <td className="hp-table-sub">{fmtDate(c.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
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
