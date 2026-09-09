import { useRef, useState } from "react";
import { BellRinging, Check, Clock, LockSimple, LockSimpleOpen, Scissors, WarningCircle, X } from "@phosphor-icons/react";
import { useAppActions, useAppState, useAnnounce } from "../store/AppContext.jsx";
import { formatClock, formatRange, relativeTimeFromNow } from "../lib/format.js";
import { minutesToPx, PX_PER_MIN, snapAndClamp } from "../lib/geometry.js";
import { appointmentDuration, appointmentEndMin, findConflictingAppointment, stagesWithOffsets } from "../lib/scheduling.js";

export function AppointmentCard({ appointment, lane }) {
  const { appointments, clients } = useAppState();
  const actions = useAppActions();
  const announce = useAnnounce();
  const client = clients.find((c) => c.id === appointment.clientId);

  // Drag-to-reschedule: press and hold anywhere on the card (not its buttons) and move it up or
  // down; releases snap to the 5-minute grid and get checked against everyone else's schedule
  // before landing. dragMin is the live, not-yet-committed preview position while a drag is in
  // progress — null the rest of the time.
  const [dragMin, setDragMin] = useState(null);
  const drag = useRef(null); // { startY, originStartMin, moved, previewMin }
  const suppressClick = useRef(false);

  if (!client) return null;

  const duration = appointmentDuration(appointment);
  const effectiveStartMin = dragMin ?? appointment.startMin;
  const top = minutesToPx(effectiveStartMin);
  const height = Math.max(duration * PX_PER_MIN, 34);
  const isPrivate = !appointment.allowParallelBooking;
  const isCancelled = appointment.status === "cancelled";
  const isProposed = appointment.status === "proposed";
  const multiPhase = appointment.stages.length > 1 && !isPrivate;
  const showControls = !isCancelled && height >= 40;
  const isDragging = dragMin !== null;

  // Dragging never blocks a move — it just has to be obvious afterward that two clients now
  // land on Julia's hands at the same time, so she notices and can drag one of them clear.
  const conflictWith = !isCancelled ? findConflictingAppointment(appointments, appointment, appointment.startMin) : null;
  const conflictClient = conflictWith ? clients.find((c) => c.id === conflictWith.clientId) : null;

  const stateClass = isCancelled ? "cancelled" : isProposed ? "proposed" : isPrivate ? "private" : "";

  function openClient(e) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    e.stopPropagation();
    actions.openClientPanel(client.id);
  }

  function handlePointerDown(e) {
    if (isCancelled || e.button > 0) return;
    // Let controls, the private/reminder chips, and a free-stage's own click-to-book area work
    // untouched — only a drag started on the card's open body should pick it up.
    if (e.target.closest(".booking-controls, .phase[role='button']")) return;
    drag.current = { startY: e.clientY, originStartMin: appointment.startMin, moved: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no live pointer session (e.g. synthetic event) — dragging still works via document moves
    }
  }

  function handlePointerMove(e) {
    if (!drag.current) return;
    const deltaY = e.clientY - drag.current.startY;
    if (!drag.current.moved && Math.abs(deltaY) < 4) return; // small jitter still counts as a click
    drag.current.moved = true;
    // Keep the authoritative value on the ref (always current) as well as in state (drives the
    // re-render) — a pointerup arriving before React has committed the state update must not
    // read a stale, pre-move position off the closure.
    const previewMin = snapAndClamp(drag.current.originStartMin + deltaY / PX_PER_MIN, duration);
    drag.current.previewMin = previewMin;
    setDragMin(previewMin);
    // A full-width guide line (drawn by DayView, against the hour ruler) so it's obvious exactly
    // which minute the card is about to land on — the card itself is too narrow to show that.
    actions.setDragPreview({ dayKey: appointment.date, startMin: previewMin, endMin: previewMin + duration });
  }

  function endDrag(e) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released — fine
    }
    actions.setDragPreview(null);
    if (!d.moved) {
      setDragMin(null);
      return;
    }
    suppressClick.current = true; // the browser still fires a click right after this pointerup
    const target = d.previewMin ?? d.originStartMin;
    setDragMin(null);
    if (target === d.originStartMin) return;
    // Move it regardless — Julia sometimes deliberately wants to overlap two clients for a few
    // minutes. If it does land on someone else, say so clearly instead of silently allowing it;
    // the card itself then carries a warning badge until one of them is moved clear.
    actions.rescheduleAppointment(appointment.id, appointment.date, target);
    const landedOn = findConflictingAppointment(appointments, appointment, target);
    if (landedOn) {
      const other = clients.find((c) => c.id === landedOn.clientId);
      announce(`Moved ${client.name} to ${formatClock(target)} — double-booked with ${other?.name ?? "another client"}`);
    } else {
      announce(`Moved ${client.name} to ${formatClock(target)}`);
    }
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
      className={`booking lane-${lane} ${stateClass} ${multiPhase ? "phased" : "simple"} ${isDragging ? "dragging" : ""} ${conflictClient ? "conflict" : ""}`}
      style={{ top, height }}
      onClick={openClient}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openClient(e)}
    >
      {conflictClient && (
        <div className="conflict-badge" title={`Double-booked with ${conflictClient.name} — drag one of them to a clear time`}>
          <WarningCircle />
        </div>
      )}
      {multiPhase ? (
        <>
          {/* Overlaid, not stacked in flow — the card's height is exactly the sum of phase
              durations (so it lands precisely on the time grid), so the title can't add its
              own height on top without pushing the last phase past the card's bottom edge. */}
          <div className="booking-title-overlay">
            <b>
              {client.name} <i>—</i> <em>{appointment.serviceLabel}</em>
            </b>
            <span>{formatRange(appointment.startMin, appointment.startMin + duration)}</span>
          </div>
          {stagesWithOffsets(appointment).map((stage) => (
            <div
              key={stage.id}
              className={`phase ${stage.occupiesStylist ? "hands" : "process"}`}
              style={{ height: Math.max(stage.durationMin * PX_PER_MIN, 20) }}
              onClick={!stage.occupiesStylist ? (e) => handleFreeStageClick(e, stage) : undefined}
              role={!stage.occupiesStylist ? "button" : undefined}
            >
              {stage.occupiesStylist ? <Scissors /> : <Clock />}
              <b>{stage.label}</b>
              <span>{formatRange(stage.start, stage.start + stage.durationMin)}</span>
            </div>
          ))}
        </>
      ) : (
        <>
          {isPrivate ? (
            <div>
              <b>
                {client.name} <i>—</i> {appointment.serviceLabel}
              </b>
              <span>
                <LockSimple /> Private booking · Not available to others
              </span>
            </div>
          ) : (
            <>
              {isProposed && <Clock />}
              {!isProposed && lane === "parallel" && <Scissors />}
              <b>
                {client.name} <i>—</i> {appointment.serviceLabel}
              </b>
            </>
          )}
          <span className={isPrivate ? undefined : "booking-time"}>
            {isCancelled ? `${formatRange(appointment.startMin, appointmentEndMin(appointment))} · Cancelled` : isProposed ? `Proposed ${formatRange(appointment.startMin, appointmentEndMin(appointment))}` : formatRange(appointment.startMin, appointmentEndMin(appointment))}
          </span>
        </>
      )}

      {showControls && (
        <div className="booking-controls" onClick={(e) => e.stopPropagation()}>
          {appointment.confirmationSentAt && (
            <span className="chip-btn on static" title={`Confirmation sent ${relativeTimeFromNow(appointment.confirmationSentAt)}`}>
              <Check />
            </span>
          )}
          <button
            className={`chip-btn ${appointment.reminderSentAt ? "on" : ""}`}
            title={appointment.reminderSentAt ? `Reminder sent ${relativeTimeFromNow(appointment.reminderSentAt)}` : "Send reminder"}
            onClick={handleReminder}
          >
            <BellRinging />
          </button>
          {multiPhase && (
            <button className="chip-btn" title={isPrivate ? "Private — tap to allow double-booking" : "Can double-book — tap to make private"} onClick={handlePrivateToggle}>
              {isPrivate ? <LockSimple /> : <LockSimpleOpen />}
            </button>
          )}
          <button className="chip-btn danger" title="Cancel appointment" onClick={handleCancel}>
            <X />
          </button>
        </div>
      )}

      {isCancelled && (
        <button className="chip-btn restore" title="Restore appointment" onClick={handleRestore}>
          <Check /> Restore
        </button>
      )}
    </div>
  );
}
