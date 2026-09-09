import { CalendarBlank, CaretLeft, CaretRight, Plus } from "@phosphor-icons/react";
import { useAppActions, useAppState } from "../store/AppContext.jsx";
import { addDays, NOW, formatHeader } from "../lib/format.js";

const VIEWS = ["Day", "3 Days", "Week", "Month"];

export function TopBar() {
  const { ui } = useAppState();
  const actions = useAppActions();
  const { view, selectedDate } = ui;

  function movePeriod(direction) {
    const step = view === "Month" ? 30 : view === "Week" ? 7 : view === "3 Days" ? 3 : 1;
    actions.setSelectedDate(addDays(selectedDate, direction * step));
  }

  function goToday() {
    actions.setSelectedDate(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()));
    actions.setView("Day");
  }

  function openMonth() {
    actions.setView("Month");
  }

  return (
    <header className="topbar">
      <div className="date-nav">
        <button aria-label="Previous period" onClick={() => movePeriod(-1)}>
          <CaretLeft />
        </button>
        <button aria-label="Open month" onClick={openMonth}>
          <CalendarBlank />
        </button>
        <button aria-label="Next period" onClick={() => movePeriod(1)}>
          <CaretRight />
        </button>
        <button className="today" onClick={goToday}>
          Today
        </button>
      </div>
      <h1>{formatHeader(selectedDate, view)}</h1>
      <div className="actions">
        <div className="view-switch">
          {VIEWS.map((v) => (
            <button key={v} className={view === v ? "selected" : ""} onClick={() => actions.setView(v)}>
              {v}
            </button>
          ))}
        </div>
        {/* One clear way in — this used to sit next to an identical "Find a time" button, which
            just made it look like there were two different things to choose between. */}
        <button className="primary" onClick={() => actions.openAssistant()}>
          <Plus /> New booking
        </button>
      </div>
    </header>
  );
}
