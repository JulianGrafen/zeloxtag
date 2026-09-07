"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  addMonths,
  buildMonthGrid,
  formatGermanMonthYear,
  GERMAN_WEEKDAY_LABELS,
  localTodayIsoDate,
  parseIsoDateParts,
} from "@/lib/dates/german-calendar";
import { cn } from "@/lib/utils";

export type GermanDateCalendarProps = {
  value: string | null;
  onSelect: (iso: string) => void;
  minDate?: string | null;
  maxDate?: string | null;
  className?: string;
};

function initialMonth(value: string | null): { year: number; monthIndex: number } {
  const parsed = parseIsoDateParts(value) ?? parseIsoDateParts(localTodayIsoDate());
  if (!parsed) {
    const today = new Date();
    return { year: today.getFullYear(), monthIndex: today.getMonth() };
  }
  return { year: parsed.year, monthIndex: parsed.monthIndex };
}

export function GermanDateCalendar({
  value,
  onSelect,
  minDate = null,
  maxDate = null,
  className,
}: GermanDateCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => initialMonth(value));
  const todayIso = localTodayIsoDate();

  const cells = useMemo(
    () => buildMonthGrid(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth.monthIndex, visibleMonth.year],
  );

  function shiftMonth(delta: number) {
    setVisibleMonth((current) =>
      addMonths(current.year, current.monthIndex, delta),
    );
  }

  function isDisabled(iso: string): boolean {
    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    return false;
  }

  return (
    <div className={cn("w-[min(100vw-2rem,18.5rem)] select-none", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Vorheriger Monat"
          onClick={() => shiftMonth(-1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <p className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
          {formatGermanMonthYear(visibleMonth.year, visibleMonth.monthIndex)}
        </p>
        <button
          type="button"
          aria-label="Nächster Monat"
          onClick={() => shiftMonth(1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {GERMAN_WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="py-1 text-center text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[color:var(--vd-muted)]"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell.inMonth) {
            return <span key={`pad-${index}`} aria-hidden className="h-10" />;
          }

          const selected = value === cell.iso;
          const isToday = todayIso === cell.iso;
          const disabled = isDisabled(cell.iso);

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={disabled}
              aria-label={cell.iso}
              aria-pressed={selected}
              onClick={() => onSelect(cell.iso)}
              className={cn(
                "inline-flex h-10 w-full items-center justify-center rounded-xl text-[0.88rem] font-medium tabular-nums transition-colors",
                selected
                  ? "bg-neutral-900 text-white shadow-[var(--vd-shadow-sm)]"
                  : "text-[color:var(--vd-text)] hover:bg-[color:var(--vd-surface-elevated)]",
                isToday && !selected
                  ? "ring-1 ring-neutral-900/25 ring-inset"
                  : null,
                disabled ? "cursor-not-allowed opacity-35 hover:bg-transparent" : null,
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSelect(todayIso)}
        className="mt-3 w-full rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2 text-[0.82rem] font-semibold text-[color:var(--vd-text)]"
      >
        Heute
      </button>
    </div>
  );
}
