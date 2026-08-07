"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Share2,
  ShieldCheck,
} from "lucide-react";

import { CompatibilityTable } from "@/components/dashboard/CompatibilityTable";
import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import { matchCompatibilityTable } from "@/services/ocr/TableMatchingService";

import type { AbeDocument } from "./abeDocuments";
import { PressableButton, PressableLink } from "./Pressable";

interface AbeDocumentDetailViewProps {
  document: AbeDocument;
  vehicleModel: string;
  /** Optional garage context for Verwendungsbereich row highlighting. */
  vehicleContext?: AbeVehicleContext | null;
}

function inferVehicleContext(
  vehicleModel: string,
  explicit?: AbeVehicleContext | null,
): AbeVehicleContext | null {
  if (explicit) return explicit;
  const trimmed = vehicleModel.trim();
  if (!trimmed) return null;
  // Demo pages pass "Supra" — pair with Toyota from typical fitment docs.
  if (/^supra\b/i.test(trimmed)) {
    return { brand: "Toyota", model: "Supra", type: "A80" };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return {
      brand: parts[0] ?? trimmed,
      model: parts.slice(1).join(" "),
    };
  }
  return { brand: trimmed, model: trimmed };
}

export function AbeDocumentDetailView({
  document,
  vehicleModel,
  vehicleContext = null,
}: AbeDocumentDetailViewProps) {
  const [page, setPage] = useState(1);
  const totalPages = document.pages;
  const resolvedContext = useMemo(
    () => inferVehicleContext(vehicleModel, vehicleContext),
    [vehicleModel, vehicleContext],
  );
  const compatibilityTable = useMemo(() => {
    if (!document.compatibilityTable) return null;
    return matchCompatibilityTable(
      document.compatibilityTable,
      resolvedContext,
    );
  }, [document.compatibilityTable, resolvedContext]);

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="vd-anim-stack relative z-10 mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <PressableLink
          href="/abe"
          variant="pill"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zurück zur Liste
        </PressableLink>

        {/* Hero */}
        <header className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
                {document.documentLabel}
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.45rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.65rem]">
                {document.partName}
              </h1>
              <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
                {document.manufacturer} · {vehicleModel}
              </p>
            </div>
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white">
              <FileText className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {document.status}
            </span>
            <span className="rounded-full bg-neutral-900/5 px-2.5 py-1 text-[0.7rem] font-medium text-[color:var(--vd-text)]">
              {document.category}
            </span>
            <span className="rounded-full bg-neutral-900/5 px-2.5 py-1 text-[0.7rem] font-medium text-[color:var(--vd-muted)]">
              {document.pages} Seiten
            </span>
          </div>
        </header>

        {/* Key facts */}
        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Dokumentdaten
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-[0.85rem]">
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">KBA-Nummer</dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {document.approvalNumber}
              </dd>
            </div>
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">Behörde</dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {document.authority}
              </dd>
            </div>
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">Ausgestellt</dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {document.issuedAt}
              </dd>
            </div>
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">Gescannt</dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {document.scannedAt}
              </dd>
            </div>
          </dl>
        </section>

        {/* Fitment */}
        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Freigabe
          </h2>
          <ul className="space-y-2">
            {document.vehicleFitment.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-[0.88rem] font-medium text-[color:var(--vd-text)]"
              >
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
            {document.summary}
          </p>
        </section>

        {compatibilityTable ? (
          <CompatibilityTable table={compatibilityTable} />
        ) : null}

        {/* Conditions */}
        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Auflagen
          </h2>
          <ol className="space-y-2.5">
            {document.conditions.map((condition, index) => (
              <li key={condition} className="flex gap-3 text-[0.85rem] leading-snug">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[0.7rem] font-semibold text-white">
                  {index + 1}
                </span>
                <span className="pt-0.5 text-[color:var(--vd-text)]">{condition}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* PDF mock viewer */}
        <section className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white shadow-[var(--vd-shadow-sm)]">
          <div className="flex items-center justify-between border-b border-[color:var(--vd-border)] bg-neutral-100 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[0.75rem] font-medium text-[color:var(--vd-text)]">
                {document.fileName}
              </p>
              <p className="text-[0.68rem] text-[color:var(--vd-muted)]">
                {document.fileSize} · Seite {page}/{totalPages}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Vorherige Seite"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--vd-border)] bg-white text-[color:var(--vd-text)] transition-transform duration-150 active:scale-90 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Nächste Seite"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--vd-border)] bg-white text-[color:var(--vd-text)] transition-transform duration-150 active:scale-90 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="min-h-[22rem] space-y-5 p-5 font-[family-name:var(--font-display)] text-[color:var(--vd-text)]">
            {page === 1 ? (
              <>
                <div className="space-y-1 border-b border-neutral-200 pb-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    {document.documentLabel.includes("Teilegutachten")
                      ? "Teilegutachten"
                      : "Allgemeine Betriebserlaubnis"}
                  </p>
                  <p className="text-[1.15rem] font-bold tracking-[-0.02em]">
                    {document.partName}
                  </p>
                  <p className="text-[0.8rem] text-neutral-500">
                    {document.approvalNumber} · {document.authority}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[0.82rem]">
                  <div>
                    <p className="text-neutral-500">Hersteller</p>
                    <p className="font-medium">{document.manufacturer}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Kategorie</p>
                    <p className="font-medium">{document.category}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Fahrzeug</p>
                    <p className="font-medium">{vehicleModel}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Datum</p>
                    <p className="font-medium">{document.issuedAt}</p>
                  </div>
                </div>

                <p className="rounded-xl bg-neutral-50 p-3 text-[0.82rem] leading-relaxed text-neutral-600">
                  {document.summary}
                </p>
              </>
            ) : (
              <>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Seite {page} · Auflagen & Hinweise
                </p>
                <ul className="space-y-3">
                  {document.conditions.map((condition, index) => (
                    <li
                      key={condition}
                      className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-[0.82rem] leading-relaxed text-neutral-700"
                    >
                      <span className="font-semibold text-neutral-900">
                        {index + 1}.{" "}
                      </span>
                      {condition}
                    </li>
                  ))}
                </ul>
                <div className="space-y-2 pt-2">
                  <div className="h-2 rounded bg-neutral-100" />
                  <div className="h-2 w-5/6 rounded bg-neutral-100" />
                  <div className="h-2 w-2/3 rounded bg-neutral-100" />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <PressableButton
            variant="button"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3.5 text-[0.88rem] font-semibold text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            Teilen
          </PressableButton>
          <PressableButton
            variant="button"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white shadow-[var(--vd-shadow-sm)]"
          >
            <Download className="h-4 w-4" aria-hidden />
            PDF öffnen
          </PressableButton>
        </div>
      </div>
    </div>
  );
}
