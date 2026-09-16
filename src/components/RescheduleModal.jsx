import { useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { Modal } from "./Modal.jsx";
import { useAppActions, useAppState, useAnnounce } from "../store/AppContext.jsx";
import { formatClock, formatDayLabel, keyToDate } from "../lib/format.js";
import { snapAndClamp } from "../lib/geometry.js";
import { appointmentDuration, findConflictingAppointment } from "../lib/scheduling.js";

/**
 * The one thing missing from drag-to-reschedule: a client calling weeks out to say they can't
 * make it doesn't map to "drag a card a few pixels" — you need to type in wherever they're
 * moving to, possibly a whole different day. Opened from the reschedule chip on any card (or
 * agenda row); same "allow it, just warn about a clash" rule as everywhere else.
 */
export function RescheduleModal() {
  const { appointments, clients, ui } = useAppState();
  const actions = useAppActions();
  const announce = useAnnounce();
  const appointment = appointments.find((a) => a.id === ui.reschedulingAppointmentId);
  const open = !!appointment;
  const client = appointment ? clients.find((c) => c.id === appointment.clientId) : null;

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!appointment) return;
    setDate(appointment.date);
    const h = String(Math.floor(appointment.startMin / 60)).padStart(2, "0");
    const m = String(appointment.startMin % 60).padStart(2, "0");
    setTime(`${h}:${m}`);
  }, [appointment?.id]);

  if (!open || !appointment || !client) return null;

  const duration = appointmentDuration(appointment);
  const [h, m] = time.split(":").map(Number);
  const hasValidTime = Number.isFinite(h) && Number.isFinite(m);
  const newStartMin = hasValidTime ? snapAndClamp(h * 60 + m, duration) : appointment.startMin;
  const unchanged = date === appointment.date && newStartMin === appointment.startMin;
  const conflict = date && hasValidTime && !unchanged ? findConflictingAppointment(appointments, { ...appointment, date }, newStartMin) : null;
  const conflictClient = conflict ? clients.find((c) => c.id === conflict.clientId) : null;

  // Typing a new date jumps the actual day underneath live — the modal only dims the calendar
  // (34% backdrop), it doesn't hide it — so she's looking at the real day, not a text summary,
  // while she picks the time. Backing out without saving snaps the calendar back to wherever it
  // was before this preview.
  function changeDate(value) {
    setDate(value);
    if (value) actions.setSelectedDate(keyToDate(value));
  }

  function cancel() {
    if (date !== appointment.date) actions.setSelectedDate(keyToDate(appointment.date));
    actions.closeReschedule();
  }

  function save() {
    if (!date || !hasValidTime) {
      announce("Pick a date and time first");
      return;
    }
    actions.rescheduleAppointment(appointment.id, date, newStartMin, conflict ? "parallel" : "primary");
    actions.setSelectedDate(keyToDate(date));
    actions.setScrollTarget(appointment.id);
    actions.closeReschedule();
    announce(
      conflict
        ? `Moved ${client.name} to ${formatDayLabel(date)} · ${formatClock(newStartMin)} — double-booked with ${conflictClient?.name ?? "another client"}`
        : `Moved ${client.name} to ${formatDayLabel(date)} · ${formatClock(newStartMin)}`
    );
  }

  return (
    <Modal open={open} onClose={cancel} title={`Reschedule ${client.name}`} width={380}>
      <label className="field-label">New date</label>
      <input type="date" value={date} onChange={(e) => changeDate(e.target.value)} />
      <label className="field-label">New time</label>
      <input type="time" step="300" value={time} onChange={(e) => setTime(e.target.value)} />
      {conflict && (
        <div className="conflict-preview">
          <WarningCircle />
          <span>
            Overlaps with <b>{conflictClient?.name ?? "another client"}</b>'s {conflict.serviceLabel}. You can still move it here — sort out the overlap afterward.
          </span>
        </div>
      )}
      <button className="primary wide" disabled={!date || !hasValidTime || unchanged} onClick={save}>
        Save new time
      </button>
    </Modal>
  );
}
