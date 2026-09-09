// Pixel math for the day grid. The schedule now scrolls (real salons run early mornings and
// late evenings, not a fixed 8-5), so this drives a CSS custom property (--px-per-hour) instead
// of a hardcoded stylesheet value — see .schedule / .time-column in styles.css.

import { clampToDay, DAY_END_MIN, DAY_START_MIN, snap5 } from "./format.js";

export const PX_PER_HOUR = 96; // bigger/closer than the old fixed-fit 67.5px — built to scroll
export const PX_PER_MIN = PX_PER_HOUR / 60;
export const SCHEDULE_HEIGHT = PX_PER_HOUR * ((DAY_END_MIN - DAY_START_MIN) / 60);

export function minutesToPx(min) {
  return (min - DAY_START_MIN) * PX_PER_MIN;
}

export function pxToMinutes(px) {
  return px / PX_PER_MIN + DAY_START_MIN;
}

export function snapAndClamp(min, durationMin) {
  return clampToDay(snap5(min), durationMin);
}
