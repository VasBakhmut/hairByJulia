import { useAppActions, useAppState } from "../store/AppContext.jsx";
import { NOW, dateKey, sameDay } from "../lib/format.js";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthCalendar({ date }) {
  const { appointments, clients } = useAppState();
  const actions = useAppActions();
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => new Date(year, month, i - offset + 1));

  function openDay(d) {
    actions.setSelectedDate(d);
    actions.setView("Day");
  }

  return (
    <section className="month-calendar">
      <div className="weekday-row">
        {WEEKDAY_LABELS.map((d) => (
          <b key={d}>{d}</b>
        ))}
      </div>
      <div className="month-grid">
        {cells.map((d) => {
          const active = d.getMonth() === month;
          const key = dateKey(d);
          const items = appointments.filter((a) => a.date === key).sort((a, b) => a.startMin - b.startMin);
          return (
            <button key={key} className={`${active ? "" : "muted"} ${sameDay(d, NOW) ? "today-cell" : ""}`} onClick={() => openDay(d)}>
              <strong>{d.getDate()}</strong>
              {active &&
                items.slice(0, 3).map((appt) => {
                  const client = clients.find((c) => c.id === appt.clientId);
                  const typeClass = appt.status === "cancelled" ? "cancelled" : !appt.allowParallelBooking ? "private" : "";
                  return (
                    <span key={appt.id} className={typeClass}>
                      {formatHourMin(appt.startMin)} {client?.name ?? "—"}
                    </span>
                  );
                })}
              {active && items.length > 3 && <small>+{items.length - 3} more</small>}
            </button>
          );
        })}
      </div>
      <div className="month-hint">Select a day to open the precise day calendar.</div>
    </section>
  );
}

function formatHourMin(min) {
  const h24 = Math.floor(min / 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const m = min % 60;
  return m === 0 ? `${h}:00` : `${h}:${String(m).padStart(2, "0")}`;
}
