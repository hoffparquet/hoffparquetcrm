"use client";

import { useEffect, useState } from "react";
import { X, Search } from "lucide-react";
import { fmtMoney } from "@/lib/constants";
import { api } from "@/lib/api";

// A separate picker from the shared CatalogPicker used on quotes/invoices/
// order sheets — this one is scoped to Installation & Labour items only,
// and surfaces BOTH the cost price (what we pay the fitter) and the retail
// price (what we'd normally charge), since a job costing line needs both.
export default function LabourItemPicker({ onPick, onClose }) {
  const [products, setProducts] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.listProducts().then((all) => setProducts(all.filter((p) => p.category === "Installation & Labour")));
  }, []);

  const q = query.trim().toLowerCase();

  return (
    <div className="hp-overlay" onClick={onClose}>
      <div className="hp-panel hp-panel-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="hp-panel-head">
          <h2>Add labour item</h2>
          <button className="hp-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="hp-panel-body" style={{ paddingTop: 0 }}>
          <div className="hp-search hp-catalog-search">
            <Search size={15} />
            <input placeholder="Search labour items…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          </div>

          {!products ? (
            <p className="hp-muted-small">Loading…</p>
          ) : (
            <div className="hp-catalog-list">
              {products.map((p) => {
                const variations = p.variations.filter((v) => !q || v.label.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
                if (variations.length === 0) return null;
                return (
                  <div className="hp-catalog-product" key={p.id}>
                    <div className="hp-mini-list-name" style={{ padding: "8px 4px" }}>{p.name}</div>
                    <div className="hp-catalog-variations">
                      {variations.map((v) => (
                        <button
                          key={v.id}
                          className="hp-catalog-variation-row"
                          onClick={() =>
                            onPick({
                              description: `${p.name} — ${v.label}`,
                              unit: p.unit,
                              costPerUnit: v.costPrice ?? "",
                              chargePerUnit: v.price ?? "",
                            })
                          }
                        >
                          <span>{v.label}</span>
                          <span className="hp-catalog-variation-price">
                            {v.costPrice != null ? `cost ${fmtMoney(v.costPrice)}` : "cost not set"} · charge {fmtMoney(v.price)} / {p.unit}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
