"use client";

import { garageFieldControlClassName } from "@/components/ui/garage-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  variant?: "default" | "inset";
};

/** Kilometerstand — displays German thousand separators (178.605). */
export function MileageKmInput({
  value,
  onChange,
  placeholder = "z. B. 67.210",
  className,
  id,
  required,
  variant = "default",
}: MileageKmInputProps) {
  return (
    <Input
      id={id}
      required={required}
      inputMode="numeric"
      className={cn(
        variant === "inset"
          ? cn(garageFieldControlClassName, "tabular-nums")
          : "claim-input min-h-[var(--claim-field-min-height)] tabular-nums",
        className,
      )}
      value={formatMileageKmNumber(value)}
      onChange={(event) => onChange(parseMileageKmInput(event.target.value))}
      placeholder={placeholder}
    />
  );
}
