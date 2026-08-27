"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  formatCompactGermanDate,
  parseGermanDocumentDateInput,
} from "@/lib/documents/format";

type GermanDateInputProps = {
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
};

function isoToDisplay(value: string | null): string {
  if (!value?.trim()) return "";
  return formatCompactGermanDate(value) || "";
}

/** Beleg-Datum — Eingabe und Anzeige als TT.MM.JJJJ (ISO intern). */
export function GermanDateInput({
  value,
  onChange,
  placeholder = "TT.MM.JJJJ",
  className,
  required,
  id,
}: GermanDateInputProps) {
  const [text, setText] = useState(() => isoToDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(isoToDisplay(value));
    }
  }, [value, focused]);

  return (
    <Input
      id={id}
      required={required}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      lang="de"
      placeholder={placeholder}
      className={className}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(event) => setText(event.target.value)}
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
}
