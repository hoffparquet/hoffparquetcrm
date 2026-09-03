"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";
import Topbar from "@/components/Topbar";
import ProductEditor from "@/components/ProductEditor";
import { api } from "@/lib/api";
import { fmtMoney, b2bPriceOf } from "@/lib/constants";

export default function ProductsPage() {
  const [products, setProducts] = useState(null);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    api.listProducts().then(setProducts);
  }, []);

  if (!products) {
    return (
      <main className="hp-main" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Loader2 className="spin" size={20} /> Loading…
      </main>
    );
  }

  const q = query.trim().toLowerCase();
  const materialsCount = products.filter((p) => p.category !== "Installation & Labour").length;
  const labourCount = products.filter((p) => p.category === "Installation & Labour").length;
  const filtered = products
    .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.woodSpecies || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q))
    .filter((p) => {
      if (section === "materials") return p.category !== "Installation & Labour";
      if (section === "labour") return p.category === "Installation & Labour";
      return true;
    });

  const deleteProduct = async (p) => {
    if (!window.confirm(`Remove "${p.name}" from the catalog?`)) return;
    await api.deleteProduct(p.id);
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  };

  return (
    <>
      <Topbar title="Products" />
      <main className="hp-main">
        <div className="hp-products">
          <div className="hp-products-toolbar">
            <div className="hp-search">
              <Search size={15} />
              <input placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button className="hp-btn hp-btn-primary" onClick={() => { setEditing(null); setShowEditor(true); }}>
              <Plus size={15} /> Add product
            </button>
          </div>

          <div className="hp-table-filters hp-products-section-filter">
            <button className={"hp-pill" + (section === "all" ? " active" : "")} onClick={() => setSection("all")}>All ({products.length})</button>
            <button className={"hp-pill" + (section === "materials" ? " active" : "")} onClick={() => setSection("materials")}>Materials ({materialsCount})</button>
            <button className={"hp-pill" + (section === "labour" ? " active" : "")} onClick={() => setSection("labour")}>Installation &amp; Labour ({labourCount})</button>
          </div>

          {products.length === 0 ? (
            <div className="hp-empty">
              <div className="hp-empty-mark">HP</div>
              <h2>No products yet</h2>
              <p>Add a product with its size, grade and price variations so it can be picked with one click on quotes and invoices.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="hp-empty"><h2>No matching products</h2><p>Try a different search.</p></div>
          ) : (
            <div className="hp-product-list">
              {filtered.map((p) => {
                const isOpen = openId === p.id;
                const prices = p.variations.map((v) => Number(v.price) || 0);
                const min = prices.length ? Math.min(...prices) : 0;
                const max = prices.length ? Math.max(...prices) : 0;
                const b2bPrices = p.variations.map((v) => b2bPriceOf(v));
                const b2bMin = b2bPrices.length ? Math.min(...b2bPrices) : 0;
                const b2bMax = b2bPrices.length ? Math.max(...b2bPrices) : 0;
                return (
                  <div className="hp-product-card" key={p.id}>
                    <button className="hp-product-card-head" onClick={() => setOpenId(isOpen ? null : p.id)}>
                      <div>
                        <div className="hp-mini-list-name">{p.name}</div>
                        <div className="hp-mini-list-sub">
                          {p.category} · {p.woodSpecies} · {p.variations.length} variations
                          {prices.length > 0 && ` · Retail ${fmtMoney(min)}–${fmtMoney(max)} · B2B ${fmtMoney(b2bMin)}–${fmtMoney(b2bMax)} / ${p.unit}`}
                        </div>
                      </div>
                      <ChevronDown size={18} style={{ transform: isOpen ? "rotate(180deg)" : "none" }} />
                    </button>

                    {isOpen && (
                      <div className="hp-product-card-body">
                        {p.description && <p className="hp-muted-small">{p.description}</p>}
                        <div className="hp-product-meta-row">
                          {p.origin && <span><strong>Origin:</strong> {p.origin}</span>}
                          {p.finish && <span><strong>Finish:</strong> {p.finish}</span>}
                        </div>
                        {p.gradeNotes && <p className="hp-muted-small">{p.gradeNotes}</p>}

                        <table className="hp-table hp-variations-table">
                          <thead>
                            <tr><th>Specification</th><th>Retail / {p.unit}</th><th>B2B / {p.unit}</th></tr>
                          </thead>
                          <tbody>
                            {p.variations.map((v) => (
                              <tr key={v.id}>
                                <td>{v.label}</td>
                                <td>{fmtMoney(v.price)}</td>
                                <td className="hp-b2b-cell">{fmtMoney(b2bPriceOf(v))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {p.notes && <p className="hp-muted-small">{p.notes}</p>}

                        <div className="hp-product-card-actions">
                          <button className="hp-btn hp-btn-secondary" onClick={() => { setEditing(p); setShowEditor(true); }}>
                            <Pencil size={14} /> Edit
                          </button>
                          <button className="hp-btn hp-btn-danger-ghost" onClick={() => deleteProduct(p)}>
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showEditor && (
        <ProductEditor
          existing={editing}
          onClose={() => setShowEditor(false)}
          onSaved={(saved) => {
            setProducts((prev) =>
              prev.some((p) => p.id === saved.id) ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]
            );
            setShowEditor(false);
          }}
        />
      )}
    </>
  );
}
