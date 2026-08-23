"use client";

import { Input } from "@/components/ui/input";
import {
  formatMileageKmNumber,
  parseMileageKmInput,
} from "@/lib/documents/format";

type MileageKmInputProps = {
  value: number | null;
  onChange: (km: number | null) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
};

/** Kilometerstand — displays German thousand separators (178.605). */
export function MileageKmInput({
  value,
  onChange,
  placeholder = "z. B. 67.210",
  className,
  id,
  required,
}: MileageKmInputProps) {
  return (
    <Input
      id={id}
      required={required}
      inputMode="numeric"
      className={className}
      value={formatMileageKmNumber(value)}
      onChange={(event) => onChange(parseMileageKmInput(event.target.value))}
      placeholder={placeholder}
    />
  );
}
