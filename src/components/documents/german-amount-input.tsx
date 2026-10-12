"use client";

import { useEffect, useState } from "react";

import { garageFieldControlClassName } from "@/components/ui/garage-field";
import { Input } from "@/components/ui/input";
import {
  formatGermanAmountInput,
  parseManualEntryAmount,
} from "@/lib/documents/manual-entry-input";
import { cn } from "@/lib/utils";

type GermanAmountInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
  disabled?: boolean;
  variant?: "default" | "inset";
  /** Trailing symbol inside the field. Default: € for inset, none for default. */
  currencySuffix?: string | null;
};

/** EUR amount — free text while focused; parse on blur (German comma decimals). */
export function GermanAmountInput({
  value,
  onChange,
  placeholder = "0,00",
  className,
  required,
  id,
  disabled = false,
  variant = "default",
  currencySuffix,
}: GermanAmountInputProps) {
  const resolvedSuffix =
    currencySuffix === undefined
      ? variant === "inset"
        ? "€"
        : null
      : currencySuffix;
  const [text, setText] = useState(() => formatGermanAmountInput(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatGermanAmountInput(value));
    }
  }, [value, focused]);

  const input = (
    <Input
      id={id}
      required={required}
      disabled={disabled}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      lang="de"
      placeholder={placeholder}
      className={cn(
        variant === "inset"
          ? cn(
              garageFieldControlClassName,
              "tabular-nums",
              resolvedSuffix ? "!pr-7" : null,
            )
          : "claim-input min-h-[var(--claim-field-min-height)] tabular-nums",
        className,
      )}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(event) => {
        setText(event.target.value);
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
        const parsed = parseManualEntryAmount(trimmed);
        if (parsed !== null) {
          onChange(parsed);
          setText(formatGermanAmountInput(parsed));
          return;
        }
        setText(formatGermanAmountInput(value));
      }}
    />
  );

  if (!resolvedSuffix) {
    return input;
  }

  return (
    <div className="relative w-full">
      {input}
      <span
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[0.9rem] font-medium text-[color:var(--vd-muted)]"
        aria-hidden
      >
        {resolvedSuffix}
      </span>
    </div>
  );
}
