"use client";

import { useState } from "react";
import { X, Search, Loader2, AlertTriangle, Check } from "lucide-react";
import { leadApi } from "@/lib/leadApi";
import { SEGMENTS, LOCATION_PRESETS } from "@/lib/leads";

// Slide-over panel: pick a target group and a place, see what Companies
// House has, tick the ones you want, import them. Nothing is saved until
// you press Import.
export default function LeadFinder({ onClose, onImported }) {
  const [segmentId, setSegmentId] = useState("architects");
  const [location, setLocation] = useState("Edinburgh");
  const [size, setSize] = useState(100);

  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(() => new Set());

  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(null);

  const segment = SEGMENTS.find((s) => s.id === segmentId);

  const runSearch = async () => {
    setSearching(true);
    setError("");
    setDone(null);
    setResults(null);
    try {
      const data = await leadApi.search({ segment: segmentId, location, size });
      setResults(data.results);
      setTotal(data.total);
      // Pre-tick everything that isn't already in the CRM.
      setSelected(new Set(data.results.filter((r) => !r.alreadyImported).map((r) => r.companyNumber)));
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  };

  const toggle = (companyNumber) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(companyNumber)) next.delete(companyNumber);
      else next.add(companyNumber);
      return next;
    });
  };

  const selectable = (results || []).filter((r) => !r.alreadyImported);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.companyNumber));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(selectable.map((r) => r.companyNumber)));
  };

  const runImport = async () => {
    const chosen = (results || []).filter((r) => selected.has(r.companyNumber) && !r.alreadyImported);
    if (chosen.length === 0) return;
    setImporting(true);
    setError("");
    try {
      const res = await leadApi.import({ segment: segmentId, location, leads: chosen });
      setDone(res);
      onImported?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="hp-overlay" onClick={onClose}>
      <div className="hp-panel hp-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="hp-panel-head">
          <div>
            <h2>Find companies</h2>
            <div className="hp-panel-sub">
              Searches the official Companies House register. Nothing is saved until you import.
            </div>
          </div>
          <button className="hp-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="hp-panel-body">
          <div>
            <label className="hp-lead-label">Target group</label>
            <div className="hp-lead-segments">
              {SEGMENTS.map((s) => (
                <button
                  key={s.id}
                  className={"hp-pill" + (s.id === segmentId ? " active" : "")}
                  onClick={() => setSegmentId(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {segment && (
              <p className="hp-muted-small" style={{ marginTop: 8 }}>
                {segment.blurb}
                <br />
                <span style={{ fontSize: 11.5 }}>
                  SIC codes: {segment.sicCodes.map((c) => `${c} (${segment.sicLabels[c]})`).join(" · ")}
                </span>
              </p>
            )}
            {segment?.reviewRequired && (
              <div className="hp-lead-warning">
                <AlertTriangle size={15} />
                <span>
                  These come in marked <strong>Needs review</strong>. They&apos;re never treated as ready to
                  contact — you approve them one at a time.
                </span>
              </div>
            )}
          </div>

          <div className="hp-panel-grid">
            <div className="hp-field hp-field-wide">
              <label>Town or city</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Edinburgh"
              />
              <div className="hp-lead-presets">
                {LOCATION_PRESETS.map((group) => (
                  <div key={group.group}>
                    <span className="hp-lead-preset-group">{group.group}</span>
                    {group.places.map((p) => (
                      <button key={p} className="hp-lead-preset" onClick={() => setLocation(p)}>
                        {p}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="hp-field">
              <label>How many to fetch</label>
              <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          <div>
            <button className="hp-btn hp-btn-primary" onClick={runSearch} disabled={searching}>
              {searching ? <Loader2 size={15} className="spin" /> : <Search size={15} />}
              {searching ? "Searching…" : "Search Companies House"}
            </button>
          </div>

          {error && <div className="hp-lead-error">{error}</div>}

          {done && (
            <div className="hp-lead-success">
              <Check size={16} />
              <span>
                Imported {done.imported} {done.imported === 1 ? "company" : "companies"}
                {done.skipped > 0 && ` — ${done.skipped} skipped (already in your list)`}.
              </span>
            </div>
          )}

          {results && (
            <>
              <div className="hp-lead-results-head">
                <div>
                  <strong>{total.toLocaleString("en-GB")}</strong> active {segment?.label.toLowerCase()} match
                  {total === 1 ? "es" : ""} in {location || "the UK"}. Showing the first {results.length}.
                </div>
                <button className="hp-btn hp-btn-secondary" onClick={toggleAll} disabled={selectable.length === 0}>
                  {allSelected ? "Clear all" : "Select all"}
                </button>
              </div>

              <div className="hp-lead-results">
                {results.length === 0 && (
                  <p className="hp-muted-small">
                    Nothing came back. Try a different town, or a broader one — Companies House matches on the
                    registered office address, which for some firms is their accountant&apos;s office.
                  </p>
                )}
                {results.map((r) => (
                  <label
                    key={r.companyNumber}
                    className={"hp-lead-result" + (r.alreadyImported ? " disabled" : "")}
                  >
                    <input
                      type="checkbox"
                      disabled={r.alreadyImported}
                      checked={selected.has(r.companyNumber)}
                      onChange={() => toggle(r.companyNumber)}
                    />
                    <div>
                      <div className="hp-lead-result-name">{r.companyName}</div>
                      <div className="hp-lead-result-sub">
                        {r.address || "No address on file"}
                        {r.incorporatedOn && ` · since ${r.incorporatedOn.slice(0, 4)}`}
                      </div>
                    </div>
                    {r.alreadyImported && <span className="hp-badge hp-badge-slate">Already added</span>}
                  </label>
                ))}
              </div>

              <div className="hp-panel-footer hp-panel-footer-end">
                <button className="hp-btn hp-btn-ghost" onClick={onClose}>
                  Close
                </button>
                <button
                  className="hp-btn hp-btn-primary"
                  onClick={runImport}
                  disabled={importing || selected.size === 0}
                >
                  {importing ? <Loader2 size={15} className="spin" /> : null}
                  Import {selected.size > 0 ? selected.size : ""} to leads
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
