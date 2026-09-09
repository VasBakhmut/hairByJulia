import { useMemo, useState } from "react";
import { CreditCard, Money, Plus, X } from "@phosphor-icons/react";
import { useAppActions, useAppState } from "../store/AppContext.jsx";
import { NOW, startOfWeek } from "../lib/format.js";

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function inRange(iso, start, end) {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}
function dayLabel(iso) {
  const d = new Date(iso);
  if (d.toDateString() === NOW.toDateString()) return "Today";
  const yesterday = new Date(NOW);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
function dayKeyOf(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function FinanceView() {
  const { transactions, clients } = useAppState();
  const [formOpen, setFormOpen] = useState(false);

  const stats = useMemo(() => {
    const weekStart = startOfWeek(NOW);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const monthStart = startOfMonth(NOW);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);

    const weekTotal = transactions.filter((t) => inRange(t.date, weekStart, weekEnd)).reduce((s, t) => s + t.amount, 0);
    const monthTx = transactions.filter((t) => inRange(t.date, monthStart, monthEnd));
    const monthTotal = monthTx.reduce((s, t) => s + t.amount, 0);
    const cash = monthTx.filter((t) => t.method === "cash").reduce((s, t) => s + t.amount, 0);
    const card = monthTx.filter((t) => t.method === "card").reduce((s, t) => s + t.amount, 0);
    const cashPct = monthTotal ? Math.round((cash / monthTotal) * 100) : 0;
    return { weekTotal, monthTotal, cash, card, cashPct };
  }, [transactions]);

  const groups = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const map = new Map();
    for (const t of sorted) {
      const key = dayKeyOf(t.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return [...map.entries()];
  }, [transactions]);

  return (
    <section className="page-view finance-view">
      <div className="finance-head">
        <div>
          <h1>Finance</h1>
          <p>A private ledger, kept visually separate from the calendar.</p>
        </div>
        <button className="primary" onClick={() => setFormOpen(true)}>
          <Plus /> Add transaction
        </button>
      </div>

      <div className="finance-stats">
        <div className="finance-stat">
          <p>This week</p>
          <b>${stats.weekTotal.toLocaleString()}</b>
        </div>
        <div className="finance-stat">
          <p>This month</p>
          <b>${stats.monthTotal.toLocaleString()}</b>
        </div>
        <div className="finance-stat split">
          <p>Cash / card</p>
          <div className="split-bar">
            <span style={{ width: `${stats.cashPct}%` }} />
          </div>
          <div className="split-labels">
            <small>Cash ${stats.cash.toLocaleString()}</small>
            <small>Card ${stats.card.toLocaleString()}</small>
          </div>
        </div>
      </div>

      <div className="finance-list">
        {groups.length === 0 && <p className="empty-hint">No transactions yet.</p>}
        {groups.map(([key, txs]) => (
          <div key={key} className="finance-group">
            <div className="finance-group-head">
              <b>{dayLabel(txs[0].date)}</b>
              <span>${txs.reduce((s, t) => s + t.amount, 0).toLocaleString()}</span>
            </div>
            {txs.map((t) => {
              const client = clients.find((c) => c.id === t.clientId);
              return (
                <div key={t.id} className="finance-row">
                  <span className="finance-icon">{t.method === "card" ? <CreditCard /> : <Money />}</span>
                  <div className="finance-row-info">
                    <b>{client ? client.name : t.note || "—"}</b>
                    {client && t.note && <small>{t.note}</small>}
                  </div>
                  <span className="finance-amount">${t.amount.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {formOpen && <TransactionForm onClose={() => setFormOpen(false)} />}
    </section>
  );
}

function TransactionForm({ onClose }) {
  const { clients } = useAppState();
  const actions = useAppActions();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("card");
  const [note, setNote] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState(null);
  const [showMatches, setShowMatches] = useState(false);

  const matches = clientQuery.trim() ? clients.filter((c) => c.name.toLowerCase().includes(clientQuery.toLowerCase())).slice(0, 5) : clients.slice(0, 5);
  const amountNum = parseFloat(amount);
  const canSubmit = !Number.isNaN(amountNum) && amountNum > 0;
  const selectedClient = clients.find((c) => c.id === clientId);

  function submit() {
    if (!canSubmit) return;
    actions.addTransaction({ date: NOW.toISOString(), amount: Math.round(amountNum * 100) / 100, method, clientId: clientId ?? undefined, note: note.trim() || undefined });
    onClose();
  }

  return (
    <div className="finance-modal-backdrop" onClick={onClose}>
      <div className="finance-modal" onClick={(e) => e.stopPropagation()}>
        <div className="finance-modal-head">
          <h2>Add transaction</h2>
          <button className="icon-btn" onClick={onClose}>
            <X />
          </button>
        </div>
        <label>Amount</label>
        <div className="amount-input">
          <span>$</span>
          <input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" />
        </div>
        <label>Method</label>
        <div className="method-row">
          <button className={method === "card" ? "active" : ""} onClick={() => setMethod("card")}>
            <CreditCard /> Card
          </button>
          <button className={method === "cash" ? "active" : ""} onClick={() => setMethod("cash")}>
            <Money /> Cash
          </button>
        </div>
        <label>Link to client (optional)</label>
        {selectedClient ? (
          <div className="linked-client">
            <span>{selectedClient.name}</span>
            <button
              onClick={() => {
                setClientId(null);
                setClientQuery("");
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="autocomplete">
            <input value={clientQuery} onFocus={() => setShowMatches(true)} onChange={(e) => { setClientQuery(e.target.value); setShowMatches(true); }} placeholder="Search clients…" />
            {showMatches && (
              <div className="autocomplete-list">
                {matches.map((c) => (
                  <button
                    key={c.id}
                    onMouseDown={() => {
                      setClientId(c.id);
                      setShowMatches(false);
                    }}
                  >
                    {c.name}
                  </button>
                ))}
                {matches.length === 0 && <p>No matches.</p>}
              </div>
            )}
          </div>
        )}
        <label>Note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Retail — shampoo" />
        <button className="primary wide" disabled={!canSubmit} onClick={submit}>
          Add transaction
        </button>
      </div>
    </div>
  );
}
