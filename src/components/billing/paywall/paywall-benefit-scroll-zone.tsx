"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const BENEFIT_MASK =
  "linear-gradient(to bottom, black 0%, black 65%, transparent 100%)";

type PaywallBenefitScrollZoneProps = {
  benefits: ReactNode;
  overlay: ReactNode;
  className?: string;
};

/**
 * Benefits scroll behind a bottom overlay. Overlay height is measured so
 * scroll padding and touch targets stay aligned.
 */
export function PaywallBenefitScrollZone({
  benefits,
  overlay,
  className,
}: PaywallBenefitScrollZoneProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [overlayHeight, setOverlayHeight] = useState(220);

  useEffect(() => {
    const node = overlayRef.current;
    if (!node) return;

    function measure() {
      setOverlayHeight(node?.offsetHeight ?? 220);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn("relative min-h-0 w-full flex-1", className)}>
      <div
        className="absolute inset-0 z-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        style={{
          paddingBottom: overlayHeight,
          WebkitMaskImage: BENEFIT_MASK,
          maskImage: BENEFIT_MASK,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
        }}
        aria-label="Vorteile scrollen"
      >
        {benefits}
      </div>

      <div
        ref={overlayRef}
        className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[color:var(--vd-surface)] from-40% via-[color:var(--vd-surface)]/95 to-transparent pt-3"
      >
        {overlay}
      </div>
    </div>
  );
}
