"use client";

import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function formatAbeKbaHeroDisplay(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "— nicht erkannt —";
  if (/^kba[\s.\-]*/i.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  return digits ? `KBA ${digits}` : trimmed;
}

export function AbeFieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Label className="block space-y-1.5">
      <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
        {label}
      </span>
      {children}
    </Label>
  );
}

export function AbeSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-[color:var(--vd-surface-elevated)] px-3 py-2.5">
      <dt className="text-[0.78rem] text-[color:var(--vd-muted)]">{label}</dt>
      <dd className="max-w-[60%] text-right text-[0.88rem] font-medium text-[color:var(--vd-text)]">
        {value?.trim() || "—"}
      </dd>
    </div>
  );
}

export function AbeKbaHero({
  value,
  isEditing = false,
  onChange,
  placeholder = "KBA-Nummer",
}: {
  value: string;
  isEditing?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  const kbaMissing = !value.trim();
  const kbaDisplay = formatAbeKbaHeroDisplay(value);

  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3",
        kbaMissing
          ? "border-amber-300/80 bg-amber-50"
          : "border-emerald-500/25 bg-emerald-500/8",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        KBA-Nummer
      </div>
      {isEditing && onChange ? (
        <Input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="mt-2 font-mono text-[1.05rem] font-semibold tracking-wide"
          autoComplete="off"
        />
      ) : (
        <p className="mt-1 font-mono text-[1.45rem] font-semibold tracking-wide text-[color:var(--vd-text)]">
          {kbaDisplay}
        </p>
      )}
    </div>
  );
}
