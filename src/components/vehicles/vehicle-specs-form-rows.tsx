"use client";

import { useState, type ComponentProps, type ReactNode } from "react";

import {
  InsetListRow,
  IOSSheetModal,
  IOSYearWheelPicker,
} from "@/components/ui/ios";
import { cn } from "@/lib/utils";

const SPEC_CONTROL_CLASS =
  "min-w-0 flex-1 bg-transparent text-right text-[15px] text-white tabular-nums outline-none placeholder:text-[#48484A]";

const SPEC_TRAILING_CLASS = "flex w-[58%] min-w-0 items-center justify-end gap-1.5";

function SpecRowLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block">
      {children}
    </label>
  );
}

function SpecUnit({ unit }: { unit?: string }) {
  if (!unit) return null;
  return <span className="shrink-0 text-[15px] text-[#8E8E93]">{unit}</span>;
}

type SpecInputRowProps = Omit<ComponentProps<"input">, "className"> & {
  id: string;
  label: string;
  unit?: string;
  mono?: boolean;
};

export function SpecInputRow({ id, label, unit, mono = false, ...inputProps }: SpecInputRowProps) {
  return (
    <InsetListRow
      emphasis="data"
      label={<SpecRowLabel htmlFor={id}>{label}</SpecRowLabel>}
      trailing={
        <span className={SPEC_TRAILING_CLASS}>
          <input
            id={id}
            className={cn(SPEC_CONTROL_CLASS, mono && "font-mono text-[13px] uppercase")}
            {...inputProps}
          />
          <SpecUnit unit={unit} />
        </span>
      }
    />
  );
}

type SpecSelectRowProps = Omit<ComponentProps<"select">, "className"> & {
  id: string;
  label: string;
  children: ReactNode;
};

export function SpecSelectRow({ id, label, children, ...selectProps }: SpecSelectRowProps) {
  return (
    <InsetListRow
      emphasis="data"
      label={<SpecRowLabel htmlFor={id}>{label}</SpecRowLabel>}
      trailing={
        <span className={SPEC_TRAILING_CLASS}>
          <select
            id={id}
            className={cn(SPEC_CONTROL_CLASS, "appearance-none [text-align-last:right]")}
            {...selectProps}
          >
            {children}
          </select>
        </span>
      }
    />
  );
}

type SpecYearRowProps = {
  id: string;
  label: string;
  value: string;
  onChange: (year: string) => void;
  required?: boolean;
};

export function SpecYearRow({ id, label, value, onChange, required = false }: SpecYearRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <InsetListRow
        id={id}
        emphasis="data"
        label={label}
        value={value.trim() ? value : "Jahr wählen"}
        valueVariant="numeric"
        onPress={() => setOpen(true)}
        chevron
      />
      {required ? (
        <input
          tabIndex={-1}
          className="sr-only"
          value={value}
          required
          readOnly
          aria-hidden
        />
      ) : null}
      <IOSSheetModal open={open} title={label} onClose={() => setOpen(false)}>
        <IOSYearWheelPicker id={`${id}-wheel`} value={value} onChange={onChange} />
        <button
          type="button"
          className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#0A84FF] text-[17px] font-semibold text-white active:opacity-80"
          onClick={() => setOpen(false)}
        >
          Fertig
        </button>
      </IOSSheetModal>
    </>
  );
}

type SpecTextAreaProps = Omit<ComponentProps<"textarea">, "className">;

/** Full-width multiline field; must be the only child of its `InsetGroupedCard`. */
export function SpecTextArea(props: SpecTextAreaProps) {
  return (
    <textarea
      className="block min-h-[6rem] w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-snug text-white outline-none placeholder:text-[#48484A]"
      {...props}
    />
  );
}
