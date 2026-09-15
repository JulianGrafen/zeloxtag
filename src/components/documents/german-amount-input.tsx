"use client";

import { useEffect, useState } from "react";

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
}: GermanAmountInputProps) {
  const [text, setText] = useState(() => formatGermanAmountInput(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatGermanAmountInput(value));
    }
  }, [value, focused]);

  return (
    <Input
      id={id}
      required={required}
      disabled={disabled}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      lang="de"
      placeholder={placeholder}
      className={cn("tabular-nums", className)}
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
}
