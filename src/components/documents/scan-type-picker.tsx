"use client";

import {
  ArrowLeft,
  FileText,
  Hammer,
  ShieldCheck,
  Stamp,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";
import {
  SCAN_TYPE_OPTIONS,
  scanTypeOptionsForRole,
  type ScanType,
  type ScanTypeDefinition,
} from "@/lib/documents/scan-types";

const SCAN_ICONS: Record<ScanType, LucideIcon> = {
  invoice: FileText,
  repair: Hammer,
  service: Wrench,
  abe: Stamp,
  teilegutachten: Stamp,
  einzelabnahme: Stamp,
  egbe: Stamp,
  tuev: ShieldCheck,
};

interface ScanTypePickerProps {
  vehicleLabel: string;
  backHref: string;
  onBack?: () => void;
  onSelect: (type: ScanType) => void;
  /** Owner sees all types; Schrauber only repair/service/invoice. */
  role?: "owner" | "contributor";
}

function ScanTile({
  option,
  onSelect,
}: {
  option: ScanTypeDefinition;
  onSelect: (type: ScanType) => void;
}) {
  const Icon = SCAN_ICONS[option.id];
  return (
    <PressableButton
      type="button"
      variant="button"
      onClick={() => onSelect(option.id)}
      className="flex w-full items-start gap-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 text-left shadow-[var(--vd-shadow-sm)]"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
          {option.title}
        </span>
        <span className="mt-0.5 block text-[0.82rem] leading-snug text-[color:var(--vd-muted)]">
          {option.description}
        </span>
      </span>
    </PressableButton>
  );
}

/**
 * Explicit scan-intent chooser — one tile per document schema.
 */
export function ScanTypePicker({
  vehicleLabel,
  backHref,
  onBack,
  onSelect,
  role = "owner",
}: ScanTypePickerProps) {
  const options =
    role === "owner" ? SCAN_TYPE_OPTIONS : scanTypeOptionsForRole(role);

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="vd-anim-stack relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        {onBack ? (
          <PressableButton
            type="button"
            variant="pill"
            onClick={onBack}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Zurück
          </PressableButton>
        ) : (
          <PressableLink
            href={backHref}
            variant="pill"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Zurück
          </PressableLink>
        )}

        <header className="space-y-2">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            {role === "contributor" ? "Schrauber-Eintrag" : "Dokument scannen"}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[1.65rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)]">
            Was liegt vor?
          </h1>
          <p className="text-[0.92rem] leading-relaxed text-[color:var(--vd-muted)]">
            {role === "contributor"
              ? `Trage Reparatur, Service oder Rechnung für ${vehicleLabel} ein.`
              : `Wähle den Dokumenttyp — die Extraktion nutzt dann genau die passenden Felder für ${vehicleLabel}.`}
          </p>
        </header>

        <div className="grid gap-3">
          {options.map((option) => (
            <ScanTile key={option.id} option={option} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}
