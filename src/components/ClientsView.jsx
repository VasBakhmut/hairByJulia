import { useMemo, useState } from "react";
import { LockSimple, MagnifyingGlass, Plus, UserPlus } from "@phosphor-icons/react";
import { useAppActions, useAppState } from "../store/AppContext.jsx";
import { formatShortDate } from "../lib/format.js";

export function ClientsView() {
  const { clients } = useAppState();
  const actions = useAppActions();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...clients].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [clients, query]);

  return (
    <section className="page-view clients-view">
      <div className="page-view-head">
        <div className="page-search">
          <MagnifyingGlass />
          <input placeholder="Search clients…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="page-view-actions">
          <button className="outline" onClick={() => actions.setAddClientOpen(true)}>
            <UserPlus /> Add client
          </button>
          <button className="primary" onClick={() => actions.openAssistant()}>
            <Plus /> New booking
          </button>
        </div>
      </div>
      <div className="client-list">
        {filtered.map((c) => {
          const latest = c.visits[0];
          return (
            <button key={c.id} className="client-row" onClick={() => actions.openClientPanel(c.id)}>
              <div className="client-row-name">
                <b>
                  {c.name} {c.prefersPrivate && <LockSimple size={13} title="Private — no double-booking during their downtime" />}
                </b>
                <small>{c.phone}</small>
              </div>
              {latest && (
                <div className="client-row-latest">
                  <span>{latest.service || "Untitled visit"}</span>
                  <small>{formatShortDate(latest.date)}</small>
                </div>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && <p className="empty-hint">No clients match &ldquo;{query}&rdquo;.</p>}
      </div>
    </section>
  );
}
