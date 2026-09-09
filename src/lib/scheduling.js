// Scheduling logic: stage-aware availability search + the two-lane day layout
// (primary chair timeline + a parallel lane for clients squeezed into someone
// else's processing/open time). No appointment is ever double-booked into a
// stage that occupies Julia's hands, and a private appointment's whole visit
// (including its "free" stages) is off-limits to anyone else.

import { addDays, clampToDay, DAY_END_MIN, DAY_START_MIN, dateKey, minutesSinceMidnight, snap5 } from "./format.js";

/** An appointment's stages, annotated with their absolute start minute. */
export function stagesWithOffsets(appt) {
  let cursor = appt.startMin;
  return appt.stages.map((stage) => {
    const withStart = { ...stage, start: cursor };
    cursor += stage.durationMin;
    return withStart;
  });
}

export function appointmentDuration(appt) {
  return appt.stages.reduce((sum, s) => sum + s.durationMin, 0);
}

export function appointmentEndMin(appt) {
  return appt.startMin + appointmentDuration(appt);
}

function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged = [];
  for (const iv of sorted) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else merged.push({ ...iv });
  }
  return merged;
}

function activeAppointments(appointments, dayKey) {
  return appointments.filter((a) => a.date === dayKey && a.status !== "cancelled");
}

/** Every occupied-stylist interval for a given day (unmerged, tagged with appointment id). */
export function occupiedStageIntervals(appointments, dayKey) {
  const out = [];
  for (const appt of activeAppointments(appointments, dayKey)) {
    for (const stage of stagesWithOffsets(appt)) {
      if (stage.occupiesStylist) out.push({ start: stage.start, end: stage.start + stage.durationMin, appointmentId: appt.id });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

export function mergedBusyIntervals(appointments, dayKey) {
  return mergeIntervals(occupiedStageIntervals(appointments, dayKey));
}

/** Does [start,end) conflict with any stage that occupies the stylist that day? */
export function hasStylistConflict(appointments, dayKey, start, end, excludeAppointmentId) {
  const pool = excludeAppointmentId ? appointments.filter((a) => a.id !== excludeAppointmentId) : appointments;
  return occupiedStageIntervals(pool, dayKey).some((iv) => start < iv.end && end > iv.start);
}

/**
 * Free/processing windows that are fair game for double-booking — the stylist's hands are
 * idle AND the host appointment allows it. A private appointment's free time is excluded on
 * purpose: that client doesn't want anyone else in the chair while they're in.
 */
export function freeWindowsForDay(appointments, dayKey) {
  const out = [];
  for (const appt of activeAppointments(appointments, dayKey)) {
    if (!appt.allowParallelBooking) continue;
    for (const stage of stagesWithOffsets(appt)) {
      if (!stage.occupiesStylist) {
        out.push({ start: stage.start, end: stage.start + stage.durationMin, appointmentId: appt.id, clientId: appt.clientId, stageLabel: stage.label });
      }
    }
  }
  return out;
}

/** Everything the smart search must treat as unavailable for a *new* booking. */
function blockedIntervalsForSearch(appointments, dayKey) {
  const raw = [];
  for (const appt of activeAppointments(appointments, dayKey)) {
    for (const stage of stagesWithOffsets(appt)) {
      if (stage.occupiesStylist || !appt.allowParallelBooking) {
        raw.push({ start: stage.start, end: stage.start + stage.durationMin });
      }
    }
  }
  return mergeIntervals(raw);
}

function slotOverlap(freeWindows, start, end) {
  return (
    freeWindows.find((fw) => fw.start <= start && fw.end >= end) ??
    freeWindows.find((fw) => start < fw.end && end > fw.start)
  );
}

/**
 * Scan forward across `daysAhead` days (starting today) and return every slot long enough
 * to fit `durationMin`, soonest first. Each result is tagged `overlap` when it only exists
 * by fitting into another (non-private) client's free/processing stage.
 */
export function searchAvailability(appointments, durationMin, now, opts = {}) {
  const daysAhead = opts.daysAhead ?? 14;
  const limit = opts.limit ?? 8;
  const results = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let d = 0; d < daysAhead && results.length < limit; d++) {
    const day = addDays(today, d);
    const key = dateKey(day);
    const dayStart = d === 0 ? Math.max(DAY_START_MIN, snap5(minutesSinceMidnight(now))) : DAY_START_MIN;
    if (dayStart >= DAY_END_MIN) continue;

    const blocked = blockedIntervalsForSearch(appointments, key);
    const freeWindows = freeWindowsForDay(appointments, key);
    const pushSlot = (start) => {
      const end = start + durationMin;
      results.push({ date: key, startMin: start, endMin: end, overlap: slotOverlap(freeWindows, start, end) });
    };

    let cursor = dayStart;
    for (const iv of blocked) {
      if (results.length >= limit) break;
      if (iv.start > cursor && iv.start - cursor >= durationMin) pushSlot(cursor);
      cursor = Math.max(cursor, iv.end);
    }
    if (results.length >= limit) continue;
    if (DAY_END_MIN - cursor >= durationMin) pushSlot(cursor);
  }
  return results.slice(0, limit);
}

/**
 * This client's most recent past appointment — the real answer to "how long does this actually
 * take Anna" isn't a generic service preset, it's whatever it took her last time (thick hair
 * processes longer than fine hair, etc). Prefers a past visit whose service label matches what's
 * being typed now, falls back to the most recent visit of any kind.
 */
export function lastAppointmentFor(appointments, clientId, serviceQuery, todayKey) {
  const past = appointments
    .filter((a) => a.clientId === clientId && a.status !== "cancelled" && a.date < todayKey)
    .sort((a, b) => (b.date === a.date ? b.startMin - a.startMin : b.date.localeCompare(a.date)));
  if (past.length === 0) return null;
  const q = serviceQuery.trim().toLowerCase();
  if (q) {
    const match = past.find((a) => a.serviceLabel.toLowerCase().includes(q));
    if (match) return match;
  }
  return past[0];
}

/**
 * Would `appt`, sitting at `atStartMin`, collide with anyone else that day? Only the parts of
 * `appt` that need Julia's hands can conflict — its own free/processing stretches are allowed
 * to land on top of someone else's hands-on time (that's the double-booking feature working as
 * intended). What they can't land on: another appointment's hands-on stages, or anywhere inside
 * a private client's booking at all (their downtime is normally exclusive). Returns the first
 * appointment it collides with (for the "double-booked with ___" warning), or null if it's
 * clear. Dragging is intentionally *not* blocked on a conflict — Julia sometimes really does
 * want to overlap two clients for a few minutes; this just makes sure it's never silent.
 */
export function findConflictingAppointment(appointments, appt, atStartMin) {
  const handsOnStages = stagesWithOffsets({ ...appt, startMin: atStartMin }).filter((s) => s.occupiesStylist);
  if (handsOnStages.length === 0) return null;
  const others = appointments.filter((a) => a.id !== appt.id && a.date === appt.date && a.status !== "cancelled");
  for (const other of others) {
    const blocked = other.allowParallelBooking
      ? stagesWithOffsets(other)
          .filter((s) => s.occupiesStylist)
          .map((s) => ({ start: s.start, end: s.start + s.durationMin }))
      : [{ start: other.startMin, end: appointmentEndMin(other) }];
    for (const b of blocked) {
      for (const s of handsOnStages) {
        if (s.start < b.end && s.start + s.durationMin > b.start) return other;
      }
    }
  }
  return null;
}

/**
 * Assigns each of the day's appointments to the primary chair lane or the parallel
 * (squeezed-in) lane. The lane is decided at booking time (`appt.lane`) rather than
 * inferred geometrically, matching how Julia actually thinks about it: a booking either
 * *is* the main thread of her day, or it's something she fit into someone else's downtime.
 */
export function layoutDay(appointments, dayKey) {
  const dayAppts = appointments.filter((a) => a.date === dayKey).sort((a, b) => a.startMin - b.startMin);
  return {
    primary: dayAppts.filter((a) => a.lane !== "parallel"),
    parallel: dayAppts.filter((a) => a.lane === "parallel"),
  };
}

export { clampToDay };
