"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/** Animates a number from 0 to `value` on mount (and on value change), then
 *  holds. `format` renders the current value. Uses a self-contained
 *  requestAnimationFrame tween so it always settles exactly on `value`, even
 *  under React 18 StrictMode's double-mounted effects. Honors reduced motion. */
export function CountUp({
  value,
  format,
  durationMs = 900,
  className,
}: {
  value: number;
  format: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const frame = useRef<number>();

  useEffect(() => {
    if (reduce || durationMs <= 0) {
      setDisplay(value);
      return;
    }
    const from = 0;
    const start = performance.now();
    // easeOutCubic — quick then gentle, matches the card motion
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setDisplay(from + (value - from) * ease(t));
      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value); // guarantee the exact final value
      }
    };

    setDisplay(from);
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs, reduce]);

  return <span className={className}>{format(display)}</span>;
}
