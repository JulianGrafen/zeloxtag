"use client";

import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export const garageFieldShellClassName = "garage-field";
export const garageFieldLabelClassName = "garage-field__label";
export const garageFieldControlClassName = "garage-field__control";

type GarageFieldProps = {
  label: string;
  htmlFor?: string;
  className?: string;
  shellClassName?: string;
  children: ReactNode;
};

export function GarageField({
  label,
  htmlFor,
  className,
  shellClassName,
  children,
}: GarageFieldProps) {
  return (
    <div className={cn(garageFieldShellClassName, shellClassName, className)}>
      <label className={garageFieldLabelClassName} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

type GarageFieldRowProps = {
  children: ReactNode;
  className?: string;
};

/** Two inset fields in one bordered shell (TrackTool-style). */
export function GarageFieldRow({
  children,
  className,
}: GarageFieldRowProps) {
  return (
    <div className={cn("garage-field-row-shell", className)}>
      <div className="garage-field-row">{children}</div>
    </div>
  );
}

type GarageFieldCellProps = {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
};

export function GarageFieldCell({
  label,
  htmlFor,
  children,
  className,
}: GarageFieldCellProps) {
  return (
    <div className={cn("garage-field min-w-0", className)}>
      <label className={garageFieldLabelClassName} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function garageInsetControlClassName(extra?: string) {
  return cn(garageFieldControlClassName, extra);
}

export function GarageInsetInput({
  className,
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      className={cn(garageFieldControlClassName, "min-h-[1.75rem]", className)}
      {...props}
    />
  );
}

export function GarageInsetTextarea({
  className,
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        garageFieldControlClassName,
        "min-h-[5.5rem] resize-y",
        className,
      )}
      {...props}
    />
  );
}

export function GarageInsetSelect({
  className,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        garageFieldControlClassName,
        "min-h-[1.75rem] appearance-none bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
