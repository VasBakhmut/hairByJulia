import { useEffect, useState } from "react";

// The day grid's two side-by-side lanes need real width to stay readable — there's no amount
// of CSS squeezing that keeps "9:00 AM – 10:00 AM" legible in a 100px column. Below this
// breakpoint, DayView swaps to a plain chronological list instead of scaling the desktop grid
// down (or making it scroll sideways, which just hides content behind a swipe).
const BREAKPOINT = 760;

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
