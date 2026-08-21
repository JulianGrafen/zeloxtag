"use client";

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

/** Beleg-Datum als TT.MM.JJJJ — kein US-Date-Picker. */
export function GermanDateInput({
  value,
  onChange,
  placeholder = "TT.MM.JJJJ",
  className,
  required,
  id,
}: GermanDateInputProps) {
  return (
    <Input
      id={id}
      required={required}
      inputMode="numeric"
      placeholder={placeholder}
      className={className}
      value={value ? formatCompactGermanDate(value) : ""}
      onChange={(event) => {
        const raw = event.target.value;
        const iso = parseGermanDocumentDateInput(raw);
        onChange(iso ?? (raw.trim() ? value : null));
      }}
    />
  );
}
