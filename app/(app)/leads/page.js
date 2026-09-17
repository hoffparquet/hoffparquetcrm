"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Plus, Building2 } from "lucide-react";
import { leadApi } from "@/lib/leadApi";
import { SEGMENTS, LEAD_STATUSES, segmentLabel, statusMeta } from "@/lib/leads";
import LeadFinder from "@/components/LeadFinder";
import LeadPanel from "@/components/LeadPanel";

function StatCard({ label, value }) {
  return (
    <div className="hp-stat-card">
      <div className="hp-stat-value">{value}</div>
      <div className="hp-stat-label">{label}</div>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState(null);
  const [query, setQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [finderOpen, setFinderOpen] = useState(false);
  const [openLead, setOpenLead] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    leadApi
      .list()
      .then(setLeads)
      .catch((e) => {
        setError(e.message);
        setLeads([]);
      });
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!leads) return [];
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (segmentFilter !== "all" && l.segment !== segmentFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.companyName.toLowerCase().includes(q) ||
        (l.locality || "").toLowerCase().includes(q) ||
        (l.contactName || "").toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q)
      );
    });
  }, [leads, query, segmentFilter, statusFilter]);

  if (!leads) {
    return (
      <>
        <header className="hp-topbar">
          <div>
            <h1 className="hp-view-title">Leads</h1>
          </div>
        </header>
        <main className="hp-main" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Loader2 className="spin" size={20} /> Loading…
        </main>
      </>
    );
  }

  const counts = {
    total: leads.length,
    review: leads.filter((l) => l.status === "review").length,
    approved: leads.filter((l) => l.status === "approved").length,
    withEmail: leads.filter((l) => l.email).length,
    converted: leads.filter((l) => l.status === "converted").length,
  };

  return (
    <>
      <header className="hp-topbar">
        <div>
          <h1 className="hp-view-title">Leads</h1>
        </div>
        <div className="hp-topbar-actions">
          <div className="hp-search">
            <Search size={15} />
            <input
              placeholder="Search leads…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="hp-btn hp-btn-primary" onClick={() => setFinderOpen(true)}>
            <Plus size={15} /> Find companies
          </button>
        </div>
      </header>

      <main className="hp-main">
        {error && <div className="hp-lead-error">{error}</div>}

        {leads.length === 0 ? (
          <div className="hp-empty">
            <div className="hp-empty-mark">
              <Building2 size={22} />
            </div>
            <h2>No leads yet</h2>
            <p>
              Press <strong>Find companies</strong> to search the Companies House register for architects,
              designers, developers and builders in a town of your choosing.
            </p>
            <button className="hp-btn hp-btn-primary" onClick={() => setFinderOpen(true)}>
              <Plus size={15} /> Find companies
            </button>
          </div>
        ) : (
          <>
            <div className="hp-stat-grid hp-margins-stats" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
              <StatCard label="Total leads" value={counts.total} />
              <StatCard label="Awaiting your review" value={counts.review} />
              <StatCard label="Approved for outreach" value={counts.approved} />
              <StatCard label="With an email address" value={counts.withEmail} />
              <StatCard label="Became clients" value={counts.converted} />
            </div>

            <div className="hp-table-wrap">
              <div className="hp-table-filters">
                <button
                  className={"hp-pill" + (segmentFilter === "all" ? " active" : "")}
                  onClick={() => setSegmentFilter("all")}
                >
                  All groups
                </button>
                {SEGMENTS.map((s) => (
                  <button
                    key={s.id}
                    className={"hp-pill" + (segmentFilter === s.id ? " active" : "")}
                    onClick={() => setSegmentFilter(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="hp-table-filters">
                <button
                  className={"hp-pill" + (statusFilter === "all" ? " active" : "")}
                  onClick={() => setStatusFilter("all")}
                >
                  Any status
                </button>
                {LEAD_STATUSES.map((s) => (
                  <button
                    key={s.id}
                    className={"hp-pill" + (statusFilter === s.id ? " active" : "")}
                    onClick={() => setStatusFilter(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <table className="hp-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Group</th>
                    <th>Where</th>
                    <th>Contact</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const meta = statusMeta(l.status);
                    return (
                      <tr key={l.id} onClick={() => setOpenLead(l)}>
                        <td>
                          <div className="hp-table-name">{l.companyName}</div>
                          {l.companyNumber && <div className="hp-table-sub">No. {l.companyNumber}</div>}
                        </td>
                        <td>{segmentLabel(l.segment)}</td>
                        <td>
                          {l.locality || "—"}
                          {l.postcode && <div className="hp-table-sub">{l.postcode}</div>}
                        </td>
                        <td>
                          {l.email || l.contactName ? (
                            <>
                              <div>{l.contactName || "—"}</div>
                              {l.email && <div className="hp-table-sub">{l.email}</div>}
                            </>
                          ) : (
                            <span className="hp-table-sub">No email yet</span>
                          )}
                        </td>
                        <td>
                          <span className={"hp-badge " + meta.badge}>{meta.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <span className="hp-table-sub">Nothing matches those filters.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {finderOpen && <LeadFinder onClose={() => setFinderOpen(false)} onImported={load} />}
      {openLead && (
        <LeadPanel lead={openLead} onClose={() => setOpenLead(null)} onChanged={load} />
      )}
    </>
  );
}
