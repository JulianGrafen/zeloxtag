"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from "lucide-react";

import { ApprovalFieldsSection } from "@/components/documents/approval-fields-section";
import { DocumentViewer } from "@/components/documents/document-viewer";
import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import { approvalKindLabel } from "@/lib/documents/approval-fields";
import {
  displayDocumentTitle,
  formatDocumentDate,
} from "@/lib/documents/format";
import { isViewableDocumentUrl } from "@/lib/documents/viewable-url";
import type { Document } from "@/types/database";

interface DocumentAbeDetailViewProps {
  tagUuid: string;
  vehicleLabel: string;
  document: Document;
  backHref?: string;
}

function fileNameFromUrl(fileUrl: string, fallback: string): string {
  try {
    const path = fileUrl.split("?")[0] ?? fileUrl;
    const name = path.split("/").pop();
    if (name && name.includes(".")) return decodeURIComponent(name);
  } catch {
    // ignore
  }
  return `${fallback.replace(/\s+/g, "_")}.pdf`;
}

export function DocumentAbeDetailView({
  tagUuid,
  vehicleLabel,
  document,
  backHref,
}: DocumentAbeDetailViewProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const title = displayDocumentTitle(document.title);
  // Prefer stored title ("BBS Superleggera") over vendor-only model name.
  const partName = title || document.vendor?.trim() || "ABE";
  const manufacturer = document.manufacturer?.trim() || "";
  const titleIncludesManufacturer =
    manufacturer.length > 0 &&
    partName.toLowerCase().startsWith(manufacturer.toLowerCase());
  const approvals = document.vehicle_approvals ?? [];
  const conditions = document.conditions ?? [];
  const technicalSpecs = document.technical_specs ?? [];
  const pages = document.page_count && document.page_count > 0 ? document.page_count : 1;
  const canOpenOriginal = isViewableDocumentUrl(document.file_url);
  const resolvedBack =
    backHref ?? `/v/${tagUuid}/dokumente?type=abe`;
  const scannedLabel = formatDocumentDate(document.created_at.slice(0, 10));
  const fileName = fileNameFromUrl(document.file_url, partName);
  const kindLabel = approvalKindLabel(document.approval_fields);
  const subtitle = [
    titleIncludesManufacturer ? null : manufacturer || null,
    vehicleLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="vd-anim-stack relative z-10 mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <PressableLink
          href={resolvedBack}
          variant="pill"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zurück zur Liste
        </PressableLink>

        <header className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
                {kindLabel} · PDF
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.45rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.65rem]">
                {partName}
              </h1>
              {subtitle ? (
                <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white">
              <FileText className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              gültig
            </span>
            {document.part_category ? (
              <span className="rounded-full bg-neutral-900/5 px-2.5 py-1 text-[0.7rem] font-medium text-[color:var(--vd-text)]">
                {document.part_category}
              </span>
            ) : null}
            <span className="rounded-full bg-neutral-900/5 px-2.5 py-1 text-[0.7rem] font-medium text-[color:var(--vd-muted)]">
              {pages} {pages === 1 ? "Seite" : "Seiten"}
            </span>
          </div>
        </header>

        <ApprovalFieldsSection approvalFields={document.approval_fields} />

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Dokumentdaten
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-[0.85rem]">
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">
                Nummer
              </dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {document.kba_number ?? "—"}
              </dd>
            </div>
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">
                Behörde
              </dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {document.authority ?? "—"}
              </dd>
            </div>
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">
                Scandatum
              </dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {document.date
                  ? formatDocumentDate(document.date)
                  : scannedLabel}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Freigabe
          </h2>
          {approvals.length === 0 ? (
            <p className="text-[0.88rem] text-[color:var(--vd-muted)]">
              Keine Fahrzeugfreigaben erkannt.
            </p>
          ) : (
            <ul className="space-y-2">
              {approvals.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-[0.88rem] font-medium text-[color:var(--vd-text)]"
                >
                  <ShieldCheck
                    className="h-4 w-4 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          )}
          {document.notes ? (
            <p className="mt-3 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
              {document.notes}
            </p>
          ) : null}
        </section>

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Technische Maße
          </h2>
          {technicalSpecs.length === 0 ? (
            <p className="text-[0.88rem] text-[color:var(--vd-muted)]">
              Keine technischen Maße erkannt.
            </p>
          ) : (
            <dl className="grid gap-2.5 text-[0.88rem]">
              {technicalSpecs.map((spec, index) => (
                <div
                  key={`${spec.label}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-xl bg-[color:var(--vd-surface-elevated)] p-3"
                >
                  <dt className="text-[color:var(--vd-muted)]">{spec.label}</dt>
                  <dd className="shrink-0 font-semibold tabular-nums tracking-[-0.02em] text-[color:var(--vd-text)]">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Auflagen
          </h2>
          {conditions.length === 0 ? (
            <p className="text-[0.88rem] text-[color:var(--vd-muted)]">
              Keine Auflagen erkannt.
            </p>
          ) : (
            <ol className="space-y-3">
              {conditions.map((condition, index) => (
                <li
                  key={`${index}-${condition.slice(0, 48)}`}
                  className="flex gap-3 rounded-xl bg-[color:var(--vd-surface-elevated)] p-3 text-[0.88rem]"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[0.7rem] font-semibold text-white">
                    {index + 1}
                  </span>
                  <span className="whitespace-pre-wrap pt-0.5 leading-relaxed text-[color:var(--vd-text)]">
                    {condition}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white shadow-[var(--vd-shadow-sm)]">
          <div className="flex items-center justify-between border-b border-[color:var(--vd-border)] bg-neutral-100 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[0.75rem] font-medium text-[color:var(--vd-text)]">
                {fileName}
              </p>
              <p className="text-[0.68rem] text-[color:var(--vd-muted)]">
                {pages} {pages === 1 ? "Seite" : "Seiten"} · Original-PDF
              </p>
            </div>
          </div>
          <div className="p-4">
            {canOpenOriginal ? (
              <PressableButton
                type="button"
                variant="button"
                onClick={() => setViewerOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white shadow-[var(--vd-shadow-sm)]"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Original öffnen
              </PressableButton>
            ) : (
              <p className="rounded-xl bg-neutral-50 px-3 py-2.5 text-[0.8rem] text-[color:var(--vd-muted)]">
                Für diesen Demo-Beleg liegt keine Datei vor.
              </p>
            )}
          </div>
        </section>
      </div>

      {viewerOpen && canOpenOriginal ? (
        <DocumentViewer
          title={partName}
          fileUrl={document.file_url}
          onClose={() => setViewerOpen(false)}
        />
      ) : null}
    </div>
  );
}
