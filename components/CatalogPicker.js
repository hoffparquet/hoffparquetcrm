"use client";

import { useState } from "react";
import { X, Search, ChevronDown } from "lucide-react";
import { fmtMoney, b2bPriceOf } from "@/lib/constants";

export default function CatalogPicker({ products, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [openProductId, setOpenProductId] = useState(products[0]?.id || null);
  const [tier, setTier] = useState("retail"); // "retail" | "b2b"
  const [section, setSection] = useState("all"); // "all" | "materials" | "labour"

  const q = query.trim().toLowerCase();
  const filtered = products
    .filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.woodSpecies || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        p.variations.some((v) => v.label.toLowerCase().includes(q))
      );
    })
    .filter((p) => {
      if (section === "materials") return p.category !== "Installation & Labour";
      if (section === "labour") return p.category === "Installation & Labour";
      return true;
    });

  return (
    <div className="hp-overlay" onClick={onClose}>
      <div className="hp-panel hp-panel-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="hp-panel-head">
          <h2>Add from catalog</h2>
          <button className="hp-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="hp-panel-body" style={{ paddingTop: 0 }}>
          <div className="hp-search hp-catalog-search">
            <Search size={15} />
            <input placeholder="Search products or specs…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          </div>

          <div className="hp-tier-toggle">
            <button className={"hp-pill" + (section === "all" ? " active" : "")} onClick={() => setSection("all")}>All</button>
            <button className={"hp-pill" + (section === "materials" ? " active" : "")} onClick={() => setSection("materials")}>Materials</button>
            <button className={"hp-pill" + (section === "labour" ? " active" : "")} onClick={() => setSection("labour")}>Installation &amp; Labour</button>
          </div>

          <div className="hp-tier-toggle">
            <button className={"hp-pill" + (tier === "retail" ? " active" : "")} onClick={() => setTier("retail")}>Retail price</button>
            <button className={"hp-pill" + (tier === "b2b" ? " active" : "")} onClick={() => setTier("b2b")}>B2B price (-15%)</button>
          </div>

          {filtered.length === 0 ? (
            <p className="hp-muted-small">No products match that search.</p>
          ) : (
            <div className="hp-catalog-list">
              {filtered.map((p) => {
                const isOpen = openProductId === p.id || !!q;
                return (
                  <div className="hp-catalog-product" key={p.id}>
                    <button className="hp-catalog-product-head" onClick={() => setOpenProductId(isOpen ? null : p.id)}>
                      <div>
                        <div className="hp-mini-list-name">{p.name}</div>
                        <div className="hp-mini-list-sub">{p.category} · {p.woodSpecies} · {p.variations.length} variations</div>
                      </div>
                      <ChevronDown size={16} style={{ transform: isOpen ? "rotate(180deg)" : "none" }} />
                    </button>
                    {isOpen && (
                      <div className="hp-catalog-variations">
                        {p.variations
                          .filter((v) => !q || v.label.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
                          .map((v) => {
                            const price = tier === "b2b" ? b2bPriceOf(v) : Number(v.price) || 0;
                            return (
                              <button
                                key={v.id}
                                className="hp-catalog-variation-row"
                                onClick={() => onPick({ description: `${p.name} — ${v.label}`, unit: p.unit, price })}
                              >
                                <span>{v.label}</span>
                                <span className="hp-catalog-variation-price">{fmtMoney(price)} / {p.unit}</span>
                              </button>
                            );
                          })}
                      </div>
                    )}
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
