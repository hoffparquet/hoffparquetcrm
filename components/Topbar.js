"use client";

import { Plus } from "lucide-react";

export default function Topbar({ title, onNew }) {
  return (
    <header className="hp-topbar">
      <div>
        <h1 className="hp-view-title">{title}</h1>
      </div>
      <div className="hp-topbar-actions">
        {onNew && (
          <button className="hp-btn hp-btn-primary" onClick={onNew}>
            <Plus size={15} /> New enquiry
          </button>
        )}
      </div>
    </header>
  );
}
