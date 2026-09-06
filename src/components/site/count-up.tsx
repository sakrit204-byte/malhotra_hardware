"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A figure that counts up to its value when it comes into view.
 *
 * The final value is in the markup from the start, so the number is right for
 * search engines, for anyone with scripting off, and for anyone who asked for
 * reduced motion. The counting is an enhancement layered on top, and it runs
 * once: a figure that re-counts every time it scrolls past is a nuisance.
 */
export function CountUp({
  value,
  duration = 1400,
}: {
  value: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || started) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setStarted(true);

        const begin = performance.now();

        const tick = (now: number) => {
          const progress = Math.min(1, (now - begin) / duration);
          // Fast out of the gate and slow to settle, so the last few digits
          // are the ones the eye actually catches.
          const eased = 1 - Math.pow(1 - progress, 3);
          setShown(Math.round(value * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };

        setShown(0);
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [value, duration, started]);

  return (
    <span ref={ref} aria-label={String(value)}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
