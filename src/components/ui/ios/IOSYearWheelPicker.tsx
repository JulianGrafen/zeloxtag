"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  buildVehicleModelYears,
  suggestDefaultVehicleModelYear,
} from "@/lib/vehicles/vehicle-model-year";
import { cn } from "@/lib/utils";

import { useIosHaptics } from "./use-ios-haptics";

const ROW_HEIGHT_PX = 44;
const WHEEL_VISIBLE_HEIGHT_PX = ROW_HEIGHT_PX * 5;

type IOSYearWheelPickerProps = {
  value: string;
  onChange: (year: string) => void;
  className?: string;
  id?: string;
  "aria-label"?: string;
};

export function IOSYearWheelPicker({
  value,
  onChange,
  className,
  id,
  "aria-label": ariaLabel = "Baujahr",
}: IOSYearWheelPickerProps) {
  const years = useMemo(() => buildVehicleModelYears(), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastHapticYear = useRef<string | null>(null);
  const { hapticSelection } = useIosHaptics();
  const [ready, setReady] = useState(false);

  const resolvedValue = value.trim()
    ? value.trim()
    : String(suggestDefaultVehicleModelYear());

  const indexForYear = useCallback(
    (yearValue: string) => {
      const parsed = Number.parseInt(yearValue, 10);
      const found = years.findIndex((year) => year === parsed);
      return found >= 0 ? found : 0;
    },
    [years],
  );

  const scrollToYear = useCallback(
    (yearValue: string, behavior: ScrollBehavior = "auto") => {
      const element = scrollRef.current;
      if (!element) return;
      const index = indexForYear(yearValue);
      element.scrollTo({ top: index * ROW_HEIGHT_PX, behavior });
    },
    [indexForYear],
  );

  const syncSelectionFromScroll = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const element = scrollRef.current;
      if (!element) return;
      const index = Math.max(
        0,
        Math.min(years.length - 1, Math.round(element.scrollTop / ROW_HEIGHT_PX)),
      );
      const nextYear = String(years[index]);
      element.scrollTo({ top: index * ROW_HEIGHT_PX, behavior });
      if (nextYear !== value) {
        onChange(nextYear);
      }
      if (lastHapticYear.current !== nextYear) {
        lastHapticYear.current = nextYear;
        hapticSelection();
      }
    },
    [hapticSelection, onChange, value, years],
  );

  useEffect(() => {
    if (!value.trim()) {
      onChange(resolvedValue);
    }
  }, [onChange, resolvedValue, value]);

  useEffect(() => {
    scrollToYear(resolvedValue);
    setReady(true);
  }, [resolvedValue, scrollToYear]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const onScrollEnd = () => syncSelectionFromScroll("smooth");
    element.addEventListener("scrollend", onScrollEnd);
    return () => element.removeEventListener("scrollend", onScrollEnd);
  }, [syncSelectionFromScroll]);

  return (
    <div
      id={id}
      className={cn("relative select-none", className)}
      style={{ height: WHEEL_VISIBLE_HEIGHT_PX }}
    >
      <div
        className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-11 -translate-y-1/2 rounded-[10px] border border-white/[0.12] bg-white/[0.06]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-14 bg-gradient-to-b from-[color:var(--vd-surface,#1C1C1E)] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14 bg-gradient-to-t from-[color:var(--vd-surface,#1C1C1E)] to-transparent"
        aria-hidden
      />
      <div
        ref={scrollRef}
        role="listbox"
        aria-label={ariaLabel}
        aria-activedescendant={`${id ?? "year-wheel"}-option-${resolvedValue}`}
        className={cn(
          "h-full overflow-y-auto overscroll-y-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          ready ? "snap-y snap-mandatory" : "overflow-hidden",
        )}
        onScroll={() => {
          if (!ready) return;
        }}
        onPointerUp={() => syncSelectionFromScroll("smooth")}
        onTouchEnd={() => syncSelectionFromScroll("smooth")}
        onWheel={() => {
          window.setTimeout(() => syncSelectionFromScroll("smooth"), 80);
        }}
      >
        <div style={{ height: ROW_HEIGHT_PX * 2 }} aria-hidden />
        {years.map((year) => {
          const yearString = String(year);
          const selected = yearString === resolvedValue;
          return (
            <div
              key={year}
              id={`${id ?? "year-wheel"}-option-${year}`}
              role="option"
              aria-selected={selected}
              className={cn(
                "flex snap-center items-center justify-center text-[21px] font-medium tabular-nums transition-[color,transform] duration-150",
                selected
                  ? "scale-100 text-[color:var(--vd-text,#fff)]"
                  : "scale-[0.92] text-[color:var(--vd-muted,#a1a1aa)]",
              )}
              style={{ height: ROW_HEIGHT_PX }}
            >
              {year}
            </div>
          );
        })}
        <div style={{ height: ROW_HEIGHT_PX * 2 }} aria-hidden />
      </div>
    </div>
  );
}
