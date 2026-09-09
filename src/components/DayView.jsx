import { useEffect, useRef } from "react";
import { CaretDown, CaretUp, Clock, SlidersHorizontal, Scissors } from "@phosphor-icons/react";
import { AppointmentCard } from "./AppointmentCard.jsx";
import { MobileDayAgenda } from "./MobileDayAgenda.jsx";
import { useAppActions, useAppState } from "../store/AppContext.jsx";
import { addDays, NOW, dateKey, DAY_END_MIN, DAY_START_MIN, formatClock, formatRange, minutesSinceMidnight, sameDay } from "../lib/format.js";
import { minutesToPx, PX_PER_HOUR, pxToMinutes, PX_PER_MIN, SCHEDULE_HEIGHT, snapAndClamp } from "../lib/geometry.js";
import { layoutDay, mergedBusyIntervals } from "../lib/scheduling.js";
import { useIsMobile } from "../lib/useIsMobile.js";

const HOURS = Array.from({ length: (DAY_END_MIN - DAY_START_MIN) / 60 }, (_, i) => DAY_START_MIN + i * 60);

// The two-lane, minute-precise grid below needs real width to stay readable — swap to a plain
// chronological list on phones instead (see MobileDayAgenda.jsx) rather than shrinking or
// side-scrolling a layout that was never meant to fit in ~350px. Kept as a thin wrapper (one
// hook) so the grid's own hooks stay unconditional regardless of which branch renders.
export function DayView({ date }) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileDayAgenda date={date} /> : <DesktopDayGrid date={date} />;
}

function DesktopDayGrid({ date }) {
  const { appointments, ui } = useAppState();
  const actions = useAppActions();
  const key = dateKey(date);
  const isToday = sameDay(date, NOW);
  const nowMin = minutesSinceMidnight(NOW);
  const scrollRef = useRef(null);
  const prevJumpRef = useRef(null);

  const { primary, parallel } = layoutDay(appointments, key);

  // A couple of real, computed "Available" hints for genuinely open stretches today —
  // a quick visual nudge, not just decoration.
  const openGaps = isToday ? findOpenGaps(appointments, key) : [];

  // Land somewhere useful every time the day changes: on "now" if we're looking at today,
  // otherwise a sensible mid-morning default — never dumped at 5am. The "back to previous day"
  // bar sits pinned above the grid, so its rendered height has to be added to the scroll target
  // or every day would open scrolled a little too high.
  useEffect(() => {
    if (!scrollRef.current) return;
    const target = isToday ? Math.max(nowMin - 90, DAY_START_MIN) : 9 * 60;
    const headerOffset = prevJumpRef.current?.offsetHeight ?? 0;
    scrollRef.current.scrollTo({ top: minutesToPx(target) + headerOffset });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function handleGridClick(e) {
    if (e.target !== e.currentTarget) return; // ignore bubbling clicks from booking cards
    const rect = e.currentTarget.getBoundingClientRect();
    const min = snapAndClamp(pxToMinutes(e.clientY - rect.top), 15);
    actions.openAssistant({ slot: { date: key, startMin: min, maxDurationMin: DAY_END_MIN - min, context: "" } });
  }

  return (
    <section className="calendar-card">
      <div className="calendar-head">
        <div></div>
        <div>
          <Scissors /> <span><b>Julia</b><small>Primary chair</small></span>
        </div>
        <div>
          <Clock /> <span><b>Processing / open</b><small>Available for parallel work</small></span>
          <button className="snap"><SlidersHorizontal /> Snap: 5 min</button>
        </div>
      </div>
      <div className="schedule" ref={scrollRef}>
        <button ref={prevJumpRef} className="prev-day-jump" onClick={() => actions.setSelectedDate(addDays(date, -1))}>
          <CaretUp /> Back to {addDays(date, -1).toLocaleDateString("en-US", { weekday: "long" })}
        </button>
        <div className="schedule-inner" style={{ height: SCHEDULE_HEIGHT, "--px-per-hour": `${PX_PER_HOUR}px` }}>
          <div className="time-column">
            {HOURS.map((min) => (
              <div key={min}>
                <b>{formatHourLabel(min)}</b>
                <span>:15</span>
                <span>:30</span>
                <span>:45</span>
              </div>
            ))}
          </div>
          <div className="grid-bg" onClick={handleGridClick} />

          {isToday && nowMin >= DAY_START_MIN && nowMin <= DAY_END_MIN && (
            <div className="now-line" style={{ top: minutesToPx(nowMin) }}>
              <span>{formatClock(nowMin)}</span>
            </div>
          )}

          {/* Full-width guide line while any card is being dragged — the card itself is too
              narrow to show exactly which minute it's about to land on against the hour ruler. */}
          {ui.dragPreview && ui.dragPreview.dayKey === key && (
            <div className="drag-guide-line" style={{ top: minutesToPx(ui.dragPreview.startMin) }}>
              <span>{formatRange(ui.dragPreview.startMin, ui.dragPreview.endMin)}</span>
            </div>
          )}

          {primary.map((appt) => (
            <AppointmentCard key={appt.id} appointment={appt} lane="primary" />
          ))}
          {parallel.map((appt) => (
            <AppointmentCard key={appt.id} appointment={appt} lane="parallel" />
          ))}

          {openGaps.map((gap, i) => (
            <div key={i} className="availability" style={{ top: minutesToPx(gap.start), height: Math.max((gap.end - gap.start) * PX_PER_MIN, 40) }}>
              Available
            </div>
          ))}
        </div>
        <button className="next-day-jump" onClick={() => actions.setSelectedDate(addDays(date, 1))}>
          <CaretDown /> Continue to {addDays(date, 1).toLocaleDateString("en-US", { weekday: "long" })}
        </button>
      </div>
      <div className="precision-ruler">
        <span>{formatHourMinute(Math.floor(nowMin / 60) * 60)}</span>
        {[0, 5, 10, 15, 20].map((offset) => {
          const tick = Math.floor(nowMin / 60) * 60 + offset;
          return (
            <button key={offset} className={tick === nowMin ? "on" : ""}>
              {formatHourMinute(tick)}
            </button>
          );
        })}
        <small>Times snap in 5-minute increments</small>
      </div>
    </section>
  );
}

function formatHourLabel(min) {
  const h24 = Math.floor(min / 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:00`;
}
function formatHourMinute(min) {
  const h24 = Math.floor(min / 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const m = ((min % 60) + 60) % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function findOpenGaps(appointments, key) {
  const busy = mergedBusyIntervals(appointments, key);
  const gaps = [];
  let cursor = DAY_START_MIN;
  for (const iv of busy) {
    if (iv.start - cursor >= 30) gaps.push({ start: cursor, end: iv.start });
    cursor = Math.max(cursor, iv.end);
  }
  if (DAY_END_MIN - cursor >= 30) gaps.push({ start: cursor, end: DAY_END_MIN });
  return gaps.slice(0, 2);
}
