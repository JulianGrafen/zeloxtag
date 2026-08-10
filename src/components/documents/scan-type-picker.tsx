"use client";

import {
  ArrowLeft,
  FileText,
  Hammer,
  NotebookPen,
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
  /** Owner sees all types; Schrauber only service/invoice. */
  role?: "owner" | "contributor";
  /** Optional hint from deep link — still requires an explicit tap. */
  suggestedType?: ScanType | null;
}

function ScanTile({
  option,
  onSelect,
  suggested,
}: {
  option: ScanTypeDefinition;
  onSelect: (type: ScanType) => void;
  suggested?: boolean;
}) {
  const Icon = SCAN_ICONS[option.id];
  return (
    <PressableButton
      type="button"
      variant="button"
      onClick={() => onSelect(option.id)}
      className={`flex w-full items-start gap-3 rounded-[1.35rem] border p-4 text-left shadow-[var(--vd-shadow-sm)] ${
        suggested
          ? "border-neutral-900 bg-[color:var(--vd-surface)] ring-2 ring-neutral-900/15"
          : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]"
      }`}
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="block font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            {option.title}
          </span>
          {suggested ? (
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-white">
              Vorschlag
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[0.82rem] leading-snug text-[color:var(--vd-muted)]">
          {option.description}
        </span>
      </span>
    </PressableButton>
  );
}

function manualEntryHrefFromBack(backHref: string): string {
  const match = backHref.match(/^(\/v\/[^/?#]+)/);
  return match ? `${match[1]}/eintrag` : "/";
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
  suggestedType = null,
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
              ? `Vor jedem Scan: Wähle Service oder Rechnung für ${vehicleLabel}.`
              : `Vor jedem Scan: Wähle den Dokumenttyp — die Extraktion nutzt dann die passenden Felder für ${vehicleLabel}.`}
          </p>
        </header>

        <div className="grid gap-3">
          {options.map((option) => (
            <ScanTile
              key={option.id}
              option={option}
              onSelect={onSelect}
              suggested={suggestedType === option.id}
            />
          ))}
        </div>

        <PressableLink
          href={manualEntryHrefFromBack(backHref)}
          variant="button"
          className="flex w-full items-start gap-3 rounded-[1.35rem] border border-dashed border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]/80 p-4 text-left"
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--vd-border)] bg-white text-[color:var(--vd-text)]">
            <NotebookPen className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
              Ohne Beleg eintragen
            </span>
            <span className="mt-0.5 block text-[0.82rem] leading-snug text-[color:var(--vd-muted)]">
              Eigene Wartung oder Tuning notieren
            </span>
          </span>
        </PressableLink>
      </div>
    </div>
  );
}
