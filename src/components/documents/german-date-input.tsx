"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { Popover } from "@base-ui/react/popover";

import { GermanDateCalendar } from "@/components/documents/german-date-calendar";
import { Input } from "@/components/ui/input";
import {
  formatCompactGermanDate,
  parseGermanDocumentDateInput,
} from "@/lib/documents/format";
import { cn } from "@/lib/utils";

type GermanDateInputProps = {
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
  disabled?: boolean;
  minDate?: string | null;
  maxDate?: string | null;
  /** Show calendar picker button (default: true). */
  showCalendar?: boolean;
};

function isoToDisplay(value: string | null): string {
  if (!value?.trim()) return "";
  return formatCompactGermanDate(value) || "";
}

/** Beleg-Datum — Eingabe TT.MM.JJJJ oder Kalender (ISO intern). */
export function GermanDateInput({
  value,
  onChange,
  placeholder = "TT.MM.JJJJ",
  className,
  required,
  id,
  disabled = false,
  minDate = null,
  maxDate = null,
  showCalendar = true,
}: GermanDateInputProps) {
  const [text, setText] = useState(() => isoToDisplay(value));
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(isoToDisplay(value));
    }
  }, [value, focused]);

  function applyIso(iso: string | null) {
    onChange(iso);
    setText(iso ? isoToDisplay(iso) : "");
  }

  const input = (
    <Input
      id={id}
      required={required}
      disabled={disabled}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      lang="de"
      placeholder={placeholder}
      className={cn(showCalendar ? "flex-1" : undefined, className)}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        const trimmed = next.trim();
        if (!trimmed) return;
        const parsed = parseGermanDocumentDateInput(trimmed);
        if (parsed) {
          onChange(parsed);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      onBlur={() => {
        setFocused(false);
        const trimmed = text.trim();
        if (!trimmed) {
          onChange(null);
          setText("");
          return;
        }
        const parsed = parseGermanDocumentDateInput(trimmed);
        if (parsed) {
          onChange(parsed);
          setText(isoToDisplay(parsed));
          return;
        }
        setText(isoToDisplay(value));
      }}
    />
  );

  if (!showCalendar) {
    return input;
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="flex w-full items-center gap-2">
        {input}
        <Popover.Trigger
          type="button"
          disabled={disabled}
          aria-label="Kalender öffnen"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Calendar className="h-4 w-4" aria-hidden />
        </Popover.Trigger>
      </div>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup
            className="z-50 rounded-[1.25rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-3 shadow-[var(--vd-shadow-modal)] outline-none"
          >
            <GermanDateCalendar
              value={value}
              minDate={minDate}
              maxDate={maxDate}
              onSelect={(iso) => {
                applyIso(iso);
                setFocused(false);
                setOpen(false);
              }}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
