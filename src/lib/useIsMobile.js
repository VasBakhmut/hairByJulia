import { useEffect, useState } from "react";

// The day grid's two side-by-side lanes need real width to stay readable — there's no amount
// of CSS squeezing that keeps "9:00 AM – 10:00 AM" legible in a 100px column. Below this
// breakpoint, DayView swaps to a plain chronological list instead of scaling the desktop grid
// down (or making it scroll sideways, which just hides content behind a swipe).
//
// 1250px, not ~760 — the calendar's ".content{grid-template-columns:minmax(720px,1fr) 275px}"
// needs ~995px just for its own two columns, so anything narrower than that (most tablets in
// portrait included, not just phones) was already broken before this existed: the grid clipped
// itself against its own forced minimum width. This is the same number the old "narrow desktop"
// CSS tier used for the sidebar/topbar, now doing the actual job for the calendar too.
const BREAKPOINT = 1250;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(`(max-width: ${BREAKPOINT}px)`).matches);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BREAKPOINT}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}
