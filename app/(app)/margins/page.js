"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, ChevronDown } from "lucide-react";
import Topbar from "@/components/Topbar";
import { api } from "@/lib/api";
import { fmtMoney, hasCost, marginAmount, marginPercent } from "@/lib/constants";

function StatCard({ label, value }) {
  return (
    <div className="hp-stat-card">
      <div className="hp-stat-value">{value}</div>
      <div className="hp-stat-label">{label}</div>
    </div>
  );
}

export default function MarginsPage() {
  const [products, setProducts] = useState(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);

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

  const scoped = products.filter((p) => p.id.startsWith("seed-riga-") || p.id.startsWith("seed-amberwood-"));

  const q = query.trim().toLowerCase();
  const matches = (p) => !q || p.name.toLowerCase().includes(q) || (p.woodSpecies || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q);

  const withCost = scoped.filter((p) => matches(p) && p.variations.some((v) => hasCost(v)));
  const withoutCost = scoped.filter((p) => matches(p) && !p.variations.some((v) => hasCost(v)));

  const allCostedVariations = scoped.flatMap((p) => p.variations.filter((v) => hasCost(v)));
  const avgMarginPct = allCostedVariations.length
    ? allCostedVariations.reduce((s, v) => s + marginPercent(v), 0) / allCostedVariations.length
    : null;
  const totalVariations = scoped.reduce((s, p) => s + p.variations.length, 0);

  return (
    <>
      <Topbar title="Margins" />
      <main className="hp-main">
        <div className="hp-margins">
          {scoped.length === 0 ? (
            <div className="hp-empty">
              <h2>No Riga Parket or Amber Wood products yet</h2>
              <p>This view is scoped to Riga Parket and Amber Wood suppliers for now.</p>
            </div>
          ) : (
            <>
              <p className="hp-muted-small" style={{ marginBottom: 14 }}>
                Scoped to Riga Parket and Amber Wood supplier products for now. Hoff&apos;s own branded lines
                aren&apos;t included yet.
              </p>
              <div className="hp-stat-grid hp-margins-stats">
                <StatCard label="Variations with cost data" value={`${allCostedVariations.length} / ${totalVariations}`} />
                <StatCard label="Average margin" value={avgMarginPct === null ? "—" : `${avgMarginPct.toFixed(1)}%`} />
                <StatCard label="Products fully priced" value={`${withCost.length} / ${scoped.length}`} />
              </div>

              <div className="hp-search" style={{ marginBottom: 16, maxWidth: 360 }}>
                <Search size={15} />
                <input placeholder="Search Riga Parket or Amber Wood products…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>

              {withCost.length === 0 ? (
                <div className="hp-empty">
                  <h2>No cost prices yet</h2>
                  <p>Add a cost price to any product&apos;s variations (Products → Edit) to start seeing margins here.</p>
                </div>
              ) : (
                <div className="hp-product-list">
                  {withCost.map((p) => {
                    const costed = p.variations.filter((v) => hasCost(v));
                    const pct = costed.reduce((s, v) => s + marginPercent(v), 0) / costed.length;
                    const isOpen = openId === p.id;
                    return (
                      <div className="hp-product-card" key={p.id}>
                        <button className="hp-product-card-head" onClick={() => setOpenId(isOpen ? null : p.id)}>
                          <div>
                            <div className="hp-mini-list-name">{p.name}</div>
                            <div className="hp-mini-list-sub">
                              {p.category} · {costed.length}/{p.variations.length} variations priced · avg margin {pct.toFixed(1)}%
                            </div>
                          </div>
                          <ChevronDown size={18} style={{ transform: isOpen ? "rotate(180deg)" : "none" }} />
                        </button>
                        {isOpen && (
                          <div className="hp-product-card-body">
                            <table className="hp-table hp-margins-table">
                              <thead>
                                <tr><th>Specification</th><th>Cost / {p.unit}</th><th>Sell / {p.unit}</th><th>Margin</th><th>Margin %</th></tr>
                              </thead>
                              <tbody>
                                {p.variations.map((v) => {
                                  const costOk = hasCost(v);
                                  return (
                                    <tr key={v.id} className={costOk ? "" : "hp-margins-row-nocost"}>
                                      <td>{v.label}</td>
                                      <td>{costOk ? fmtMoney(v.costPrice) : "—"}</td>
                                      <td>{fmtMoney(v.price)}</td>
                                      <td>{costOk ? fmtMoney(marginAmount(v)) : "—"}</td>
                                      <td className={costOk ? (marginPercent(v) < 0 ? "hp-margin-negative" : "") : ""}>
                                        {costOk ? `${marginPercent(v).toFixed(1)}%` : "no cost set"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {withoutCost.length > 0 && (
                <section className="hp-card hp-margins-nocost-section">
                  <h2 className="hp-card-title">No cost data yet</h2>
                  <p className="hp-muted-small">
                    These products only have a sell price on file — add a cost price from Products → Edit to bring
                    them into the margin view above.
                  </p>
                  <ul className="hp-mini-list">
                    {withoutCost.map((p) => (
                      <li key={p.id} style={{ cursor: "default" }}>
                        <div>
                          <div className="hp-mini-list-name">{p.name}</div>
                          <div className="hp-mini-list-sub">{p.category} · {p.variations.length} variations</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
