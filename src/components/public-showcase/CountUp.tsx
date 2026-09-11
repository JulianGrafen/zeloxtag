"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

type CountUpProps = {
  from?: number;
  to: number;
  separator?: string;
  direction?: "up" | "down";
  duration?: number;
  className?: string;
  delay?: number;
};

function formatCount(value: number, separator: string): string {
  const rounded = Math.round(value);
  const raw = String(rounded);
  if (!separator) return raw;
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export default function CountUp({
  from = 0,
  to,
  separator = ",",
  direction = "up",
  duration = 1,
  className,
  delay = 0,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [display, setDisplay] = useState(from);

  useEffect(() => {
    if (!inView) return;

    const startValue = direction === "up" ? from : to;
    const endValue = direction === "up" ? to : from;
    let frame = 0;
    let startTime: number | null = null;

    const timeout = window.setTimeout(() => {
      const step = (now: number) => {
        if (startTime === null) startTime = now;
        const elapsed = (now - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(startValue + (endValue - startValue) * eased);
        if (progress < 1) {
          frame = window.requestAnimationFrame(step);
        } else {
          setDisplay(endValue);
        }
      };
      frame = window.requestAnimationFrame(step);
    }, delay * 1000);

    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
    };
  }, [delay, direction, duration, from, inView, to]);

  return (
    <span ref={ref} className={className}>
      {formatCount(display, separator)}
    </span>
  );
}
