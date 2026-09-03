"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Topbar from "@/components/Topbar";
import NewEnquiryModal from "@/components/NewEnquiryModal";
import { api } from "@/lib/api";
import { STAGES, fmtMoney } from "@/lib/constants";

export default function PipelinePage() {
  const [clients, setClients] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [dragOverStage, setDragOverStage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    api.listClients().then(setClients);
  }, []);

  const moveToStage = async (clientId, stageId) => {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, stage: stageId } : c)));
    try {
      await api.updateClient(clientId, { stage: stageId });
    } catch (e) {
      // reload on failure so the board doesn't silently drift from the server
      api.listClients().then(setClients);
    }
  };

  if (!clients) {
    return (
      <main className="hp-main" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Loader2 className="spin" size={20} /> Loading…
      </main>
    );
  }

  return (
    <>
      <Topbar title="Pipeline" onNew={() => setShowNew(true)} />
      <main className="hp-main">
        {clients.length === 0 ? (
          <div className="hp-empty">
            <div className="hp-empty-mark">HP</div>
            <h2>No enquiries yet</h2>
            <p>Add your first enquiry to see it move through the pipeline.</p>
          </div>
        ) : (
          <div className="hp-kanban">
            {STAGES.map((stage) => {
              const inStage = clients.filter((c) => c.stage === stage.id);
              const value = inStage.reduce((s, c) => s + (Number(c.estimateValue) || 0), 0);
              return (
                <div
                  key={stage.id}
                  className={"hp-kcol" + (dragOverStage === stage.id ? " drag-over" : "")}
                  onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
                  onDragLeave={() => setDragOverStage((s) => (s === stage.id ? null : s))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) moveToStage(id, stage.id);
                    setDragOverStage(null);
                  }}
                >
                  <div className="hp-kcol-head">
                    <div className="hp-kcol-title">{stage.label}</div>
                    <div className="hp-kcol-meta">{inStage.length} · {fmtMoney(value)}</div>
                  </div>
                  <div className="hp-kcol-body">
                    {inStage.length === 0 && <div className="hp-kcol-empty">No projects here</div>}
                    {inStage.map((c) => (
                      <div
                        key={c.id}
                        className="hp-kcard"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                        onClick={() => router.push(`/clients/${c.id}`)}
                      >
                        <div className="hp-kcard-name">{c.name}</div>
                        {c.companyName && <div className="hp-kcard-company">{c.companyName}</div>}
                        <div className="hp-kcard-tags">
                          <span className="hp-tag">{c.projectType || "—"}</span>
                          <span className="hp-tag hp-tag-alt">{c.woodSpecies || "—"}</span>
                        </div>
                        <div className="hp-kcard-foot">
                          <span>{c.areaSqm ? `${c.areaSqm} m²` : "—"}</span>
                          <span>{c.estimateValue ? fmtMoney(c.estimateValue) : "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      {showNew && (
        <NewEnquiryModal
          onClose={() => setShowNew(false)}
          onCreated={(client) => setClients((prev) => [client, ...prev])}
        />
      )}
    </>
  );
}
