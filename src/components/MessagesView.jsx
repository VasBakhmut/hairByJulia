import { useMemo, useState } from "react";
import { BellRinging, Megaphone } from "@phosphor-icons/react";
import { Modal } from "./Modal.jsx";
import { useAppActions, useAppState, useAnnounce } from "../store/AppContext.jsx";
import { addDays, NOW, dateKey, formatClock, formatDayLabel, relativeTimeFromNow } from "../lib/format.js";

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

/**
 * Modeled as a conversation inbox (WhatsApp-style) rather than a grab-bag of separate lists —
 * this is the shape Julia's actual future WhatsApp Business integration will have: one thread
 * per client, confirmations/reminders logged into that same thread, and a broadcast tool for
 * messaging everyone (or a chosen few) at once. Reminder-due clients surface as a chip inline
 * on their row instead of a duplicate list above it.
 */
export function MessagesView() {
  const { appointments, clients, messages } = useAppState();
  const actions = useAppActions();
  const announce = useAnnounce();
  const [composeOpen, setComposeOpen] = useState(false);

  // Earliest upcoming (today/tomorrow), still-pending reminder per client.
  const reminderDue = useMemo(() => {
    const today = dateKey(NOW);
    const tomorrow = dateKey(addDays(NOW, 1));
    const map = new Map();
    appointments
      .filter((a) => (a.date === today || a.date === tomorrow) && a.status === "confirmed" && !a.reminderSentAt)
      .sort((a, b) => (a.date === b.date ? a.startMin - b.startMin : a.date.localeCompare(b.date)))
      .forEach((a) => {
        if (!map.has(a.clientId)) map.set(a.clientId, a);
      });
    return map;
  }, [appointments]);

  const conversations = useMemo(() => {
    return clients
      .map((client) => {
        const clientMessages = messages.filter((m) => m.clientId === client.id).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
        return { client, last: clientMessages[0], dueAppt: reminderDue.get(client.id) };
      })
      .filter((row) => row.last || row.dueAppt)
      .sort((a, b) => new Date(b.last?.sentAt ?? 0) - new Date(a.last?.sentAt ?? 0));
  }, [clients, messages, reminderDue]);

  const pendingCount = reminderDue.size;

  function sendAllReminders() {
    [...reminderDue.values()].forEach((appt) => actions.sendReminder(appt.id));
    announce(`Sent ${pendingCount} reminder${pendingCount === 1 ? "" : "s"}`);
  }

  function quickRemind(e, appt, clientName) {
    e.stopPropagation();
    actions.sendReminder(appt.id);
    announce(`Reminder sent to ${clientName}`);
  }

  return (
    <section className="page-view messages-view">
      <div className="page-view-head">
        <div>
          <h1>Messages</h1>
          <p>Confirmations log here automatically when you book. (This is where WhatsApp will plug in.)</p>
        </div>
        <div className="page-view-actions">
          {pendingCount > 0 && (
            <button className="outline" onClick={sendAllReminders}>
              <BellRinging /> Remind all ({pendingCount})
            </button>
          )}
          <button className="primary" onClick={() => setComposeOpen(true)}>
            <Megaphone /> New broadcast
          </button>
        </div>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 && <p className="empty-hint">No conversations yet.</p>}
        {conversations.map(({ client, last, dueAppt }) => (
          <div
            key={client.id}
            className="conversation-row"
            role="button"
            tabIndex={0}
            onClick={() => actions.openThread(client.id)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && actions.openThread(client.id)}
          >
            <div className="conversation-avatar">{initials(client.name)}</div>
            <div className="conversation-row-info">
              <div className="conversation-row-top">
                <b>{client.name}</b>
                {last && <span className="conversation-row-time">{relativeTimeFromNow(last.sentAt)}</span>}
              </div>
              <span className="conversation-preview">
                {last ? `${last.direction === "out" ? "You: " : ""}${last.text}` : "No messages yet"}
              </span>
            </div>
            {dueAppt && (
              <button
                className="reminder-chip"
                title={`${formatDayLabel(dueAppt.date)}, ${formatClock(dueAppt.startMin)} — tap to send reminder`}
                onClick={(e) => quickRemind(e, dueAppt, client.name)}
              >
                <BellRinging /> Remind
              </button>
            )}
          </div>
        ))}
      </div>

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </section>
  );
}

function ComposeModal({ open, onClose }) {
  const { clients } = useAppState();
  const actions = useAppActions();
  const announce = useAnnounce();
  const [selected, setSelected] = useState(() => new Set());
  const [text, setText] = useState("");

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(clients.map((c) => c.id)));
  }
  function selectNone() {
    setSelected(new Set());
  }

  function close() {
    onClose();
    setSelected(new Set());
    setText("");
  }

  function send() {
    if (!text.trim() || selected.size === 0) return;
    actions.sendMessage([...selected], text.trim(), "broadcast");
    announce(`Sent to ${selected.size} client${selected.size === 1 ? "" : "s"}`);
    close();
  }

  return (
    <Modal open={open} onClose={close} title="New broadcast" width={440}>
      <label className="field-label">Recipients</label>
      <div className="compose-select-all">
        <small>{selected.size} of {clients.length} selected</small>
        <div>
          <button onClick={selectAll}>Select all</button> · <button onClick={selectNone}>Clear</button>
        </div>
      </div>
      <div className="compose-recipients">
        {clients.map((c) => (
          <label key={c.id}>
            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
            {c.name}
          </label>
        ))}
      </div>
      <label className="field-label">Message</label>
      <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message…" />
      <button className="primary wide" disabled={!text.trim() || selected.size === 0} onClick={send}>
        Send to {selected.size || 0} client{selected.size === 1 ? "" : "s"}
      </button>
    </Modal>
  );
}
