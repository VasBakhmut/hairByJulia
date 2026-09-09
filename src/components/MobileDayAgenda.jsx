import { useEffect, useRef } from "react";
import { BellRinging, CaretDown, CaretUp, Check, Clock, LockSimple, LockSimpleOpen, Scissors, WarningCircle, X } from "@phosphor-icons/react";
import { useAppActions, useAppState, useAnnounce } from "../store/AppContext.jsx";
import { addDays, NOW, dateKey, formatClock, formatRange, minutesSinceMidnight, sameDay } from "../lib/format.js";
import { appointmentEndMin, findConflictingAppointment, layoutDay, stagesWithOffsets } from "../lib/scheduling.js";

/**
 * Same data, same actions as the desktop grid (booking, reminders, privacy, cancel, conflict
 * warnings) — just laid out as a plain chronological list, the pattern every phone calendar
 * actually uses on a narrow screen. Drag-to-reschedule doesn't translate to a list (nothing to
 * drag against), so moving a booking's time is desktop-only for now; everything else works the
 * same here.
 */
export function MobileDayAgenda({ date }) {
  const { appointments } = useAppState();
  const actions = useAppActions();
  const key = dateKey(date);
  const isToday = sameDay(date, NOW);
  const nowMin = minutesSinceMidnight(NOW);
  const listRef = useRef(null);
  const nowRef = useRef(null);

  const { primary, parallel } = layoutDay(appointments, key);
  const items = [...primary, ...parallel].sort((a, b) => a.startMin - b.startMin);
  const firstFutureIndex = items.findIndex((a) => a.startMin > nowMin);
  const nowIndex = isToday ? (firstFutureIndex === -1 ? items.length : firstFutureIndex) : -1;

  // Land on "now" every time the day changes, same intent as the grid's auto-scroll — just via
  // scrollIntoView on the divider row instead of a pixel calculation.
  useEffect(() => {
    // "start" (not "center") — Julia mostly cares what's coming up, so the divider sits near
    // the top with the rest of the day visible below it, instead of centering and leaving a
    // block of empty space above when there isn't much booked earlier in the day.
    if (nowRef.current) nowRef.current.scrollIntoView({ block: "start" });
    else if (listRef.current) listRef.current.scrollTop = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const rows = [];
  items.forEach((appt, i) => {
    if (i === nowIndex) rows.push(<NowDivider key="now" nowRef={nowRef} nowMin={nowMin} />);
    rows.push(<AgendaItem key={appt.id} appointment={appt} />);
  });
  if (nowIndex === items.length && items.length > 0) {
    rows.push(<NowDivider key="now" nowRef={nowRef} nowMin={nowMin} />);
  }

  return (
    <section className="calendar-card agenda">
      <button className="prev-day-jump" onClick={() => actions.setSelectedDate(addDays(date, -1))}>
        <CaretUp /> Back to {addDays(date, -1).toLocaleDateString("en-US", { weekday: "long" })}
      </button>
      <div className="agenda-list" ref={listRef}>
        {items.length === 0 && <p className="empty-hint">Nothing booked today.</p>}
        {rows}
      </div>
      <button className="next-day-jump" onClick={() => actions.setSelectedDate(addDays(date, 1))}>
        <CaretDown /> Continue to {addDays(date, 1).toLocaleDateString("en-US", { weekday: "long" })}
      </button>
    </section>
  );
}

function NowDivider({ nowRef, nowMin }) {
  return (
    <div className="agenda-now" ref={nowRef}>
      <i>Now</i>
      <span>{formatClock(nowMin)}</span>
    </div>
  );
}

function AgendaItem({ appointment }) {
  const { appointments, clients } = useAppState();
  const actions = useAppActions();
  const announce = useAnnounce();
  const client = clients.find((c) => c.id === appointment.clientId);
  if (!client) return null;

  const isPrivate = !appointment.allowParallelBooking;
  const isCancelled = appointment.status === "cancelled";
  const isProposed = appointment.status === "proposed";
  const multiPhase = appointment.stages.length > 1 && !isPrivate;
  const conflictWith = !isCancelled ? findConflictingAppointment(appointments, appointment, appointment.startMin) : null;
  const conflictClient = conflictWith ? clients.find((c) => c.id === conflictWith.clientId) : null;
  // Prefixed (not bare "private"/"cancelled"/"proposed") — the stylesheet still carries several
  // leftover bare rules with those exact names from the original hardcoded mockup, and a plain
  // class match doesn't care what other classes ride along with it.
  const stateClass = isCancelled ? "agenda-cancelled" : isProposed ? "agenda-proposed" : isPrivate ? "agenda-private" : "";

  function openClient() {
    actions.openClientPanel(client.id);
  }
  function handleReminder(e) {
    e.stopPropagation();
    if (!appointment.reminderSentAt) {
      actions.sendReminder(appointment.id);
      announce(`Reminder sent to ${client.name}`);
    }
  }
  function handlePrivateToggle(e) {
    e.stopPropagation();
    actions.toggleParallel(appointment.id);
  }
  function handleCancel(e) {
    e.stopPropagation();
    actions.cancelAppointment(appointment.id);
    announce(`${client.name}'s appointment cancelled`);
  }
  function handleRestore(e) {
    e.stopPropagation();
    actions.restoreAppointment(appointment.id);
  }
  function handleFreeStageClick(e, stage) {
    e.stopPropagation();
    if (isPrivate) {
      announce(`${client.name} is private — not available for double-booking`);
      return;
    }
    actions.openAssistant({
      slot: { date: appointment.date, startMin: stage.start, maxDurationMin: stage.durationMin, context: `during ${client.name}'s ${stage.label.toLowerCase()}` },
    });
  }

  return (
    <div
      className={`agenda-item ${stateClass} ${conflictClient ? "conflict" : ""}`}
      onClick={openClient}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openClient()}
    >
      <div className="agenda-item-head">
        <b>{formatRange(appointment.startMin, appointmentEndMin(appointment))}</b>
        {conflictClient && (
          <span className="conflict-badge inline" title={`Double-booked with ${conflictClient.name} — move one of them from the desktop calendar`}>
            <WarningCircle />
          </span>
        )}
        {isCancelled && <span className="agenda-status">Cancelled</span>}
        {isProposed && <span className="agenda-status">Proposed</span>}
        {isPrivate && (
          <span className="agenda-status">
            <LockSimple /> Private
          </span>
        )}
      </div>
      <div className="agenda-item-title">
        <b>{client.name}</b> <i>—</i> {appointment.serviceLabel}
      </div>

      {multiPhase && (
        <div className="agenda-stages">
          {stagesWithOffsets(appointment).map((stage) => (
            <div
              key={stage.id}
              className={`agenda-stage ${stage.occupiesStylist ? "hands" : "process"}`}
              onClick={!stage.occupiesStylist ? (e) => handleFreeStageClick(e, stage) : undefined}
              role={!stage.occupiesStylist ? "button" : undefined}
            >
              {stage.occupiesStylist ? <Scissors /> : <Clock />}
              <span>{stage.label}</span>
              <b>{formatRange(stage.start, stage.start + stage.durationMin)}</b>
            </div>
          ))}
        </div>
      )}

      {!isCancelled ? (
        <div className="agenda-item-controls" onClick={(e) => e.stopPropagation()}>
          <button
            className={`chip-btn ${appointment.reminderSentAt ? "on" : ""}`}
            title={appointment.reminderSentAt ? "Reminder already sent" : "Send reminder"}
            onClick={handleReminder}
          >
            <BellRinging />
          </button>
          {multiPhase && (
            <button
              className="chip-btn"
              title={isPrivate ? "Private — tap to allow double-booking" : "Can double-book — tap to make private"}
              onClick={handlePrivateToggle}
            >
              {isPrivate ? <LockSimple /> : <LockSimpleOpen />}
            </button>
          )}
          <button className="chip-btn danger" title="Cancel appointment" onClick={handleCancel}>
            <X />
          </button>
        </div>
      ) : (
        <button className="chip-btn restore" title="Restore appointment" onClick={handleRestore}>
          <Check /> Restore
        </button>
      )}
    </div>
  );
}
