"use client";

import {
  Archive,
  FileText,
  Hammer,
  NotebookPen,
  ShieldCheck,
  Stamp,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { BackNav } from "@/components/layout/back-nav";
import { ScanContent } from "@/components/layout/scan-content";
import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";
import {
  SCAN_TYPE_OPTIONS,
  isComplimentaryAbeScanType,
  isInvoiceFamilyScanType,
  scanTypeOptionsForRole,
  type ScanType,
  type ScanTypeDefinition,
} from "@/lib/documents/scan-types";

const SCAN_ICONS: Record<ScanType, LucideIcon> = {
  invoice: FileText,
  repair: Hammer,
  service: Wrench,
  abe: Stamp,
  vault: Archive,
  gutachten: NotebookPen,
  teilegutachten: NotebookPen,
  einzelabnahme: NotebookPen,
  pruefung192: NotebookPen,
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
  /** One free KI invoice scan available — highlight invoice types. */
  freeInvoiceScanRemaining?: number;
  /** One free KI ABE scan available — highlight ABE tile. */
  freeAbeScanRemaining?: number;
}

function ScanTile({
  option,
  onSelect,
  suggested,
  freeScan,
}: {
  option: ScanTypeDefinition;
  onSelect: (type: ScanType) => void;
  suggested?: boolean;
  freeScan?: boolean;
}) {
  const Icon = SCAN_ICONS[option.id];
  return (
    <PressableButton
      type="button"
      variant="button"
      onClick={() => onSelect(option.id)}
      className={`vd-tile flex w-full items-start gap-3 p-4 text-left transition-shadow duration-300 hover:shadow-[var(--vd-shadow-hover)] ${
        suggested
          ? "border-neutral-900 ring-2 ring-neutral-900/12"
          : ""
      }`}
    >
      <span className="vd-icon-badge">
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
          {freeScan ? (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-white">
              1× gratis
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
  freeInvoiceScanRemaining = 0,
  freeAbeScanRemaining = 0,
}: ScanTypePickerProps) {
  const options =
    role === "owner" ? SCAN_TYPE_OPTIONS : scanTypeOptionsForRole(role);
  const showInvoiceFreeHint = freeInvoiceScanRemaining > 0;
  const showAbeFreeHint = freeAbeScanRemaining > 0;

  return (
    <ScanContent className="vd-anim-stack pb-12">
      {onBack ? (
        <BackNav label="Zurück" onClick={onBack} />
      ) : (
        <BackNav label="Zurück" href={backHref} />
      )}

      <header className="space-y-2">
        <p className="claim-kicker">
          {role === "contributor" ? "Schrauber-Eintrag" : "Dokument scannen"}
        </p>
        <h1 className="claim-title">Was liegt vor?</h1>
        <p className="claim-copy">
          {role === "contributor"
            ? `Vor jedem Scan: Wähle Service oder Rechnung für ${vehicleLabel}.`
            : `Vor jedem Scan: Wähle den Dokumenttyp — die Extraktion nutzt dann die passenden Felder für ${vehicleLabel}.`}
        </p>
      </header>

      {showInvoiceFreeHint || showAbeFreeHint ? (
        <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5 text-[0.82rem] leading-snug text-emerald-950">
          <strong className="font-semibold">Gratis KI-Scans:</strong>{" "}
          {showInvoiceFreeHint ? "1× Rechnung/Service" : null}
          {showInvoiceFreeHint && showAbeFreeHint ? " · " : null}
          {showAbeFreeHint ? "1× ABE" : null}
          {" — "}danach Pro für TÜV, Gutachten und weitere Scans.
        </p>
      ) : null}

      <div className="grid gap-3">
        {options.map((option) => (
          <ScanTile
            key={option.id}
            option={option}
            onSelect={onSelect}
            suggested={suggestedType === option.id}
            freeScan={
              (showInvoiceFreeHint && isInvoiceFamilyScanType(option.id)) ||
              (showAbeFreeHint && isComplimentaryAbeScanType(option.id))
            }
          />
        ))}
      </div>

      <PressableLink
        href={manualEntryHrefFromBack(backHref)}
        variant="button"
        className="vd-tile flex w-full items-start gap-3 border-dashed p-4 text-left opacity-95"
      >
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--vd-radius-control)] border border-[color:var(--vd-border)] bg-white text-[color:var(--vd-text)]">
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
    </ScanContent>
  );
}
