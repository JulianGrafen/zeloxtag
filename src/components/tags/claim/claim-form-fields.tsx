"use client";

import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ClaimFormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid w-full gap-2">
      <Label
        htmlFor={htmlFor}
        className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

const CLAIM_FIELD_CLASS = "min-h-11 w-full";

export function ClaimField({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  required,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "numeric" | "email" | "text" | "decimal";
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <ClaimFormField label={label} htmlFor={id}>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        required={required}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={CLAIM_FIELD_CLASS}
        onChange={(event) => onChange(event.target.value)}
      />
    </ClaimFormField>
  );
}

type SelectOption = string | { value: string; label: string };

export function ClaimSelectField({
  id,
  label,
  value,
  onChange,
  options,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  required?: boolean;
}) {
  const normalized = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );

  return (
    <ClaimFormField label={label} htmlFor={id}>
      <select
        id={id}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className={cn("claim-input", CLAIM_FIELD_CLASS)}
      >
        {!required ? <option value="">—</option> : null}
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </ClaimFormField>
  );
}

export function ClaimSlideActions({
  error,
  pending,
  onBack,
  submitLabel,
  submitIcon = "next",
  showBack,
}: {
  error: string | null;
  pending: boolean;
  onBack: () => void;
  submitLabel: string;
  submitIcon?: "next" | "check";
  showBack?: boolean;
}) {
  return (
    <>
      {error ? (
        <p role="alert" className="vd-alert-error">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2 pt-1">
        {showBack ? (
          <button
            type="button"
            className="claim-back flex-1"
            onClick={onBack}
            disabled={pending}
          >
            <ArrowLeft className="inline h-4 w-4" aria-hidden />
            Zurück
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="claim-cta inline-flex flex-1 items-center justify-center gap-2 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          {submitLabel}
          {!pending && submitIcon === "check" ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : null}
          {!pending && submitIcon === "next" ? (
            <ArrowRight className="h-4 w-4" aria-hidden />
          ) : null}
        </button>
      </div>
    </>
  );
}
