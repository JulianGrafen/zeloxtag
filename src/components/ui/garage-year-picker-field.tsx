"use client";

import { useState } from "react";

import { IOSSheetModal, IOSYearWheelPicker } from "@/components/ui/ios";
import {
  GarageField,
  garageFieldControlClassName,
} from "@/components/ui/garage-field";
import { cn } from "@/lib/utils";

type GarageYearPickerFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (year: string) => void;
  required?: boolean;
  className?: string;
};

export function GarageYearPickerField({
  id,
  label,
  value,
  onChange,
  required = false,
  className,
}: GarageYearPickerFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <GarageField label={label} htmlFor={id} className={className}>
        <button
          type="button"
          id={id}
          className={cn(
            garageFieldControlClassName,
            "w-full min-h-[1.75rem] text-left",
          )}
          onClick={() => setOpen(true)}
        >
          {value.trim() ? value : "Jahr wählen"}
        </button>
        {required ? (
          <input
            tabIndex={-1}
            className="sr-only"
            value={value}
            required
            readOnly
            onChange={() => {}}
            aria-hidden
          />
        ) : null}
      </GarageField>

      <IOSSheetModal
        open={open}
        title="Baujahr"
        onClose={() => setOpen(false)}
      >
        <IOSYearWheelPicker
          id={`${id}-wheel`}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="mt-4 flex w-full min-h-[48px] items-center justify-center rounded-xl bg-[#0A84FF] text-[17px] font-semibold text-white active:opacity-80"
          onClick={() => setOpen(false)}
        >
          Fertig
        </button>
      </IOSSheetModal>
    </>
  );
}
