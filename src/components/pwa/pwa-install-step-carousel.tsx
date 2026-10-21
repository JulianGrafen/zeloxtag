"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

import type { PwaInstallGuideStep } from "@/lib/pwa/install-guide-steps";
import { cn } from "@/lib/utils";

const SCROLLER_CLASS =
  "flex h-full w-full touch-pan-x snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

type PwaInstallStepCarouselProps = {
  steps: readonly PwaInstallGuideStep[];
  className?: string;
  /** Controlled index (optional). */
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  slideMinHeightClassName?: string;
};

function StepSlide({
  step,
  index,
  total,
  compact,
}: {
  step: PwaInstallGuideStep;
  index: number;
  total: number;
  compact?: boolean;
}) {
  const Icon = step.icon;
  return (
    <div
      className={cn(
        "flex min-w-full shrink-0 snap-center snap-always flex-col justify-center px-1",
        compact ? "min-h-[11rem]" : "min-h-[12.5rem]",
      )}
    >
      <div className="flex flex-col items-center text-center">
        <span
          className={cn(
            "mb-3 inline-flex items-center justify-center rounded-2xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)] ring-1 ring-[color:var(--vd-border)]",
            compact ? "h-12 w-12" : "h-14 w-14",
          )}
        >
          <Icon className={compact ? "h-6 w-6" : "h-7 w-7"} aria-hidden />
        </span>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Schritt {index + 1} von {total}
        </p>
        <h3
          className={cn(
            "mt-2 font-[family-name:var(--font-display)] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]",
            compact ? "text-[1rem]" : "text-[1.05rem]",
          )}
        >
          {step.title}
        </h3>
        <p
          className={cn(
            "mt-2 max-w-[22rem] leading-relaxed text-[color:var(--vd-muted)]",
            compact ? "text-[0.82rem]" : "text-[0.86rem]",
          )}
        >
          {step.body}
        </p>
      </div>
    </div>
  );
}

export function PwaInstallStepCarousel({
  steps,
  className,
  activeIndex: controlledIndex,
  onActiveIndexChange,
  slideMinHeightClassName,
}: PwaInstallStepCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = controlledIndex ?? internalIndex;

  const setIndex = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(steps.length - 1, next));
      indexRef.current = clamped;
      if (controlledIndex === undefined) {
        setInternalIndex(clamped);
      }
      onActiveIndexChange?.(clamped);
    },
    [controlledIndex, onActiveIndexChange, steps.length],
  );

  const syncIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth <= 0 || steps.length === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== indexRef.current) {
      setIndex(next);
    }
  }, [setIndex, steps.length]);

  useEffect(() => {
    indexRef.current = 0;
    if (controlledIndex === undefined) {
      setInternalIndex(0);
    }
    const el = scrollerRef.current;
    if (!el) return;
    const frame = window.requestAnimationFrame(() => {
      el.scrollLeft = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [steps, controlledIndex]);

  useEffect(() => {
    if (controlledIndex === undefined) return;
    const el = scrollerRef.current;
    if (!el || el.clientWidth <= 0) return;
    el.scrollTo({
      left: controlledIndex * el.clientWidth,
      behavior: "smooth",
    });
    indexRef.current = controlledIndex;
  }, [controlledIndex]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const el = scrollerRef.current;
      if (!el || el.clientWidth <= 0) return;
      el.scrollTo({ left: index * el.clientWidth, behavior });
      setIndex(index);
    },
    [setIndex],
  );

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl bg-[color:var(--vd-surface-elevated)]/60 ring-1 ring-[color:var(--vd-border)]",
          slideMinHeightClassName,
        )}
        aria-roledescription="Karussell"
        aria-label="Installation Schritt für Schritt"
      >
        <div
          ref={scrollerRef}
          className={SCROLLER_CLASS}
          onScroll={syncIndexFromScroll}
        >
          {steps.map((step, index) => (
            <div
              key={step.id}
              aria-hidden={index !== activeIndex}
              className="min-h-0 min-w-full shrink-0 snap-center snap-always"
            >
              <StepSlide
                step={step}
                index={index}
                total={steps.length}
                compact={slideMinHeightClassName?.includes("11rem")}
              />
            </div>
          ))}
        </div>
      </div>

      {steps.length > 1 ? (
        <div className="mt-3 flex flex-col items-center gap-2">
          <div
            className="flex justify-center gap-1.5"
            role="tablist"
            aria-label="Installationsschritte"
          >
            {steps.map((step, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Schritt ${index + 1}: ${step.title}`}
                  className={cn(
                    "h-2 rounded-full transition-all duration-200",
                    isActive
                      ? "w-5 bg-[color:var(--vd-text)]"
                      : "w-2 bg-[color:var(--vd-muted)]/40",
                  )}
                  onClick={() => scrollToIndex(index)}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type { LucideIcon };
