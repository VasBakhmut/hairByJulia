import { useMemo, useState } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { Modal } from "./Modal.jsx";
import { useAppActions, useAppState } from "../store/AppContext.jsx";
import { NOW, dateKey, formatClock, formatDayLabel, keyToDate, minutesSinceMidnight } from "../lib/format.js";

/**
 * "Vasya calls a few weeks out to cancel" — she shouldn't have to scroll the calendar hunting
 * for him. Type the name, see his upcoming booking(s) with the date right there, tap one and
 * land on that exact day with the card highlighted, ready for the reschedule chip on it.
 */
export function ClientSearchModal({ open, onClose }) {
  const { appointments, clients } = useAppState();
  const actions = useAppActions();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const todayKey = dateKey(NOW);
    const nowMin = minutesSinceMidnight(NOW);
    return clients
      .filter((c) => c.name.toLowerCase().includes(q))
      .flatMap((client) => {
        const upcoming = appointments
          .filter((a) => a.clientId === client.id && a.status !== "cancelled")
          .filter((a) => a.date > todayKey || (a.date === todayKey && a.startMin >= nowMin))
          .sort((a, b) => (a.date === b.date ? a.startMin - b.startMin : a.date.localeCompare(b.date)));
        return upcoming.slice(0, 3).map((appt) => ({ client, appt }));
      })
      .slice(0, 10);
  }, [query, clients, appointments]);

  function close() {
    onClose();
    setQuery("");
  }

  function goTo({ appt }) {
    actions.setSelectedDate(keyToDate(appt.date));
    actions.setView("Day");
    actions.setScrollTarget(appt.id);
    close();
  }

  return (
    <Modal open={open} onClose={close} title="Find a client" width={420}>
      <input autoFocus placeholder="Client name…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="search-results">
        {query.trim() && results.length === 0 && <p className="empty-hint">No upcoming appointments for &ldquo;{query}&rdquo;.</p>}
        {results.map(({ client, appt }) => (
          <button key={appt.id} className="search-result-row" onClick={() => goTo({ appt })}>
            <span>
              <b>{client.name}</b>
              <small>{appt.serviceLabel}</small>
            </span>
            <em>
              {formatDayLabel(appt.date)} · {formatClock(appt.startMin)}
            </em>
            <CaretRight />
          </button>
        ))}
      </div>
    </Modal>
  );
}
