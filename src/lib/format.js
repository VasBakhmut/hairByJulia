// Date/time helpers shared across the app. Kept dependency-free (no date-fns) —
// this is a small prototype and native Date math is plenty.

export const DAY_START_MIN = 5 * 60; // 5:00 AM — early birds
export const DAY_END_MIN = 24 * 60; // midnight — late clients, no hard cutoff at 8pm
export const SNAP_MIN = 5; // real scheduling precision, even though major gridlines are 15-min

// Real, live Australia/Melbourne time — Julia's salon is in Melbourne, so "today" and the
// current-time line must reflect that timezone specifically, not whatever timezone the
// browser/device happens to be set to. The seed dataset is authored relative to this instant
// (see data.js), so "today" always has a story regardless of when the app is actually opened.
function computeMelbourneNow() {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
}

/** Live binding — components that read `NOW` directly (not destructured into a stale local
 *  const at import time) pick up updates automatically once `refreshNow()` re-samples it. */
export let NOW = computeMelbourneNow();

/** Re-samples the real Melbourne clock. Call periodically (see App.jsx) so the current-time
 *  line, "Xh ago" labels, etc. stay accurate if the app is left open for a while. */
export function refreshNow() {
  NOW = computeMelbourneNow();
  return NOW;
}

export function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function startOfWeek(date) {
  // Monday-start week, matching the existing Week view.
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7;
  return addDays(d, -offset);
}

export function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

/** "YYYY-MM-DD" key for a Date, in local time. */
export function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function snap5(min) {
  return Math.round(min / SNAP_MIN) * SNAP_MIN;
}

export function clampToDay(min, durationMin) {
  return Math.min(Math.max(min, DAY_START_MIN), DAY_END_MIN - durationMin);
}

/** "9:00 AM", "2:30 PM" */
export function formatClock(min) {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatRange(startMin, endMin) {
  return `${formatClock(startMin)} – ${formatClock(endMin)}`;
}

export function formatHeader(date, view) {
  if (view === "Month") return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  if (view === "Week") {
    const start = startOfWeek(date);
    const end = addDays(start, 6);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  if (view === "3 Days") {
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(date, 2).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/** "Today", "Tomorrow", "Thursday", "Next Monday", "Fri, Aug 21". */
export function formatDayLabel(key, from = NOW) {
  const d = keyToDate(key);
  const daysAway = Math.round((startOfDay(d) - startOfDay(from)) / 86400000);
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  if (daysAway > 1 && daysAway < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  if (daysAway >= 7 && daysAway < 14) return `Next ${d.toLocaleDateString("en-US", { weekday: "long" })}`;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function formatShortDate(key) {
  return keyToDate(key).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function durationLabel(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "2h ago", "5m ago" — relative to live Melbourne time by default. */
export function relativeTimeFromNow(iso, now = NOW) {
  const diffMs = now - new Date(iso);
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
