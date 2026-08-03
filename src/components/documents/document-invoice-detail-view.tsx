"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Receipt,
  Share2,
} from "lucide-react";

import { DocumentViewer } from "@/components/documents/document-viewer";
import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import {
  displayDocumentTitle,
  formatDocumentDate,
} from "@/lib/documents/format";
import { isViewableDocumentUrl } from "@/lib/documents/viewable-url";
import type { Document } from "@/types/database";

interface DocumentInvoiceDetailViewProps {
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

function formatCompactDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(date.getTime())) return formatDocumentDate(iso);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Structured invoice detail (metadata + line items).
 * Original PDF opens only via explicit action — never as the default surface.
 */
export function DocumentInvoiceDetailView({
  tagUuid,
  vehicleLabel,
  document,
  backHref,
}: DocumentInvoiceDetailViewProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const title = displayDocumentTitle(document.title);
  const lineItems = document.line_items ?? [];
  const canOpenOriginal = isViewableDocumentUrl(document.file_url);
  const resolvedBack =
    backHref ?? `/v/${tagUuid}/dokumente?type=${document.type}`;
  const fileName = fileNameFromUrl(document.file_url, title);
  const issuedLabel = formatCompactDate(document.date);
  const scannedLabel = formatCompactDate(document.created_at);
  const mileageLabel =
    typeof document.mileage_km === "number"
      ? `${document.mileage_km.toLocaleString("de-DE")} km`
      : null;
  const vendor = document.vendor?.trim() || title;
  const category = document.category?.trim() || "Beleg";

  async function handleShare() {
    const shareUrl =
      typeof window !== "undefined" ? window.location.href : "";
    const payload = {
      title,
      text: [vendor, document.invoice_number, issuedLabel]
        .filter(Boolean)
        .join(" · "),
      url: shareUrl || undefined,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
      if (payload.url && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.url);
      }
    } catch {
      // User cancelled share sheet — ignore.
    }
  }

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="vd-anim-stack relative z-10 mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
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
                {category} · Beleg
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.45rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.65rem]">
                {title}
              </h1>
              <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
                {vendor}
                {vehicleLabel ? ` · ${vehicleLabel}` : ""}
              </p>
            </div>
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white">
              <Receipt className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                bezahlt
              </span>
              {issuedLabel ? (
                <span className="rounded-full bg-neutral-900/5 px-2.5 py-1 text-[0.7rem] font-medium text-[color:var(--vd-muted)]">
                  {issuedLabel}
                </span>
              ) : null}
            </div>
            {document.amount !== null ? (
              <p className="text-[1.35rem] font-bold tracking-[-0.03em] tabular-nums text-[color:var(--vd-text)]">
                {formatEur(document.amount)}
              </p>
            ) : null}
          </div>
        </header>

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Belegdaten
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-[0.85rem]">
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">
                Nummer
              </dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {document.invoice_number?.trim() || "—"}
              </dd>
            </div>
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">
                Datum
              </dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {issuedLabel || "—"}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">
                Kilometerstand
              </dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] tabular-nums text-[color:var(--vd-text)]">
                {mileageLabel ?? "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Positionen
          </h2>
          {lineItems.length === 0 ? (
            <p className="text-[0.88rem] text-[color:var(--vd-muted)]">
              Keine Positionen erkannt. Original-PDF unten öffnen.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {lineItems.map((item, index) => (
                <li
                  key={`${item.label}-${index}`}
                  className="flex items-start justify-between gap-3 text-[0.88rem]"
                >
                  <span className="whitespace-pre-line text-[color:var(--vd-text)]">
                    {item.label}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-[color:var(--vd-text)]">
                    {formatEur(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {document.amount !== null ? (
            <div className="mt-5 flex items-center justify-between border-t border-[color:var(--vd-border)] pt-3">
              <span className="text-[0.95rem] font-bold tracking-[-0.02em] text-[color:var(--vd-text)]">
                Gesamt
              </span>
              <span className="text-[1.05rem] font-bold tracking-[-0.02em] tabular-nums text-[color:var(--vd-text)]">
                {formatEur(document.amount)}
              </span>
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
          <div className="border-b border-[color:var(--vd-border)] bg-neutral-100 px-4 py-2.5">
            <p className="truncate text-[0.78rem] font-medium text-[color:var(--vd-text)]">
              {fileName}
            </p>
            <p className="text-[0.7rem] text-[color:var(--vd-muted)]">
              Original-PDF
              {scannedLabel ? ` · gescannt ${scannedLabel}` : ""}
            </p>
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

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
        <div className="pointer-events-auto mx-auto max-w-lg">
          <PressableButton
            type="button"
            variant="button"
            onClick={() => {
              void handleShare();
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3.5 text-[0.88rem] font-semibold text-[color:var(--vd-text)] shadow-[var(--vd-shadow)]"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            Teilen
          </PressableButton>
        </div>
      </div>

      {viewerOpen && canOpenOriginal ? (
        <DocumentViewer
          title={title}
          fileUrl={document.file_url}
          onClose={() => setViewerOpen(false)}
        />
      ) : null}
    </div>
  );
}
