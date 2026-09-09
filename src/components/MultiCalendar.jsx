import { useAppActions, useAppState } from "../store/AppContext.jsx";
import { addDays, NOW, dateKey, DAY_END_MIN, DAY_START_MIN, sameDay, startOfWeek } from "../lib/format.js";
import { appointmentDuration } from "../lib/scheduling.js";

const HOURS = Array.from({ length: (DAY_END_MIN - DAY_START_MIN) / 60 }, (_, i) => DAY_START_MIN + i * 60);

export function MultiCalendar({ view, date }) {
  const count = view === "Week" ? 7 : 3;
  const start = view === "Week" ? startOfWeek(date) : date;
  const days = Array.from({ length: count }, (_, i) => addDays(start, i));

  return (
    <section className={`multi-calendar ${view === "Week" ? "week" : ""}`}>
      <div className="multi-head">
        <div>Time</div>
        {days.map((d) => (
          <DayHeaderButton key={dateKey(d)} date={d} />
        ))}
      </div>
      <div className="multi-body">
        <div className="multi-times">
          {HOURS.map((min) => (
            <span key={min}>{formatHour(min)}</span>
          ))}
        </div>
        {days.map((d) => (
          <DayColumn key={dateKey(d)} date={d} />
        ))}
      </div>
      <div className="multi-hint">Click a day to open its detailed 5-minute schedule.</div>
    </section>
  );
}

function DayHeaderButton({ date }) {
  const actions = useAppActions();
  return (
    <button className={sameDay(date, NOW) ? "current" : ""} onClick={() => openDay(actions, date)}>
      <span>{date.toLocaleDateString("en-US", { weekday: "short" })}</span>
      <b>{date.getDate()}</b>
    </button>
  );
}

function openDay(actions, date) {
  actions.setSelectedDate(date);
  actions.setView("Day");
}

function DayColumn({ date }) {
  const { appointments, clients } = useAppState();
  const actions = useAppActions();
  const key = dateKey(date);
  const items = appointments.filter((a) => a.date === key);
  const totalMin = DAY_END_MIN - DAY_START_MIN;

  return (
    <button className="day-column" onClick={() => openDay(actions, date)}>
      {items.map((appt) => {
        const client = clients.find((c) => c.id === appt.clientId);
        const duration = appointmentDuration(appt);
        const top = ((appt.startMin - DAY_START_MIN) / totalMin) * 100;
        const height = Math.max((duration / totalMin) * 100, 4);
        const isLong = appt.stages.length > 1;
        const typeClass = appt.status === "cancelled" ? "cancelled" : !appt.allowParallelBooking ? "private" : isLong ? "long" : "";
        return (
          <span key={appt.id} className={`mini-booking ${typeClass}`} style={{ top: `${top}%`, height: `${height}%` }}>
            <b>{formatHourMin(appt.startMin)} · {client?.name ?? "—"}</b>
            <small>{appt.serviceLabel}</small>
          </span>
        );
      })}
    </button>
  );
}

function formatHour(min) {
  const h24 = Math.floor(min / 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:00`;
}
function formatHourMin(min) {
  const h24 = Math.floor(min / 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const m = min % 60;
  return m === 0 ? `${h}:00` : `${h}:${String(m).padStart(2, "0")}`;
}
