"use client";

import { useEffect, useId, useState } from "react";
import { Calendar } from "lucide-react";
import { Popover } from "@base-ui/react/popover";

import { GermanDateCalendar } from "@/components/documents/german-date-calendar";
import { garageFieldControlClassName } from "@/components/ui/garage-field";
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
  variant?: "default" | "inset";
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
  variant = "default",
}: GermanDateInputProps) {
  const inset = variant === "inset";
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

  const generatedHintId = useId();
  const hintId = id ? `${id}-hint` : generatedHintId;

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
      className={cn(
        inset
          ? cn(
              garageFieldControlClassName,
              "min-h-0 border-0 shadow-none focus-visible:ring-0",
            )
          : "claim-input min-h-[var(--claim-field-min-height)]",
        showCalendar ? "flex-1" : undefined,
        className,
      )}
      value={text}
      aria-describedby={showCalendar ? hintId : undefined}
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
      <div className="flex w-full flex-col gap-1">
        <div
          className={cn(
            "flex w-full items-stretch",
            inset ? "gap-0 pr-1" : "gap-2",
          )}
        >
          {input}
          <Popover.Trigger
            type="button"
            disabled={disabled}
            aria-label="Kalender öffnen"
            className={cn(
              "inline-flex shrink-0 items-center justify-center self-stretch text-[color:var(--vd-text)] disabled:cursor-not-allowed disabled:opacity-50",
              inset
                ? "h-8 w-8 rounded-[var(--vd-radius-field)] text-zinc-400 hover:bg-white/5"
                : "w-[var(--claim-field-min-height)] rounded-[var(--vd-radius-field)] border border-[color:var(--vd-border)] bg-[var(--claim-input-bg)] shadow-none",
            )}
          >
            <Calendar className="h-4 w-4" aria-hidden />
          </Popover.Trigger>
        </div>
        <p id={hintId} className="sr-only">
          Datum als TT.MM.JJJJ eingeben oder den Kalender nutzen.
        </p>
      </div>

      <Popover.Portal className="z-[100]">
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-[100]"
        >
          <Popover.Popup
            className="rounded-[1.25rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-3 shadow-[var(--vd-shadow-modal)] outline-none"
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
