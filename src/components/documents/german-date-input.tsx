"use client";

import { Input } from "@/components/ui/input";
import { normalizeDocumentDateIso } from "@/lib/documents/format";

type GermanDateInputProps = {
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
};

function toDateInputValue(value: string | null): string {
  if (!value?.trim()) return "";
  return normalizeDocumentDateIso(value) ?? "";
}

/** Beleg-Datum — nativer Kalender-Picker (ISO YYYY-MM-DD intern). */
export function GermanDateInput({
  value,
  onChange,
  className,
  required,
  id,
}: GermanDateInputProps) {
  return (
    <Input
      id={id}
      required={required}
      type="date"
      lang="de"
      className={className}
      value={toDateInputValue(value)}
      onChange={(event) => {
        const raw = event.target.value.trim();
        onChange(raw || null);
      }}
    />
  );
}
