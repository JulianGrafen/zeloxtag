"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Download,
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
import type { Document, DocumentLineItem } from "@/types/database";

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

function previewLineItems(items: DocumentLineItem[]): DocumentLineItem[] {
  // Stylized receipt preview omits the trailing VAT row when present.
  if (items.length <= 1) return items;
  const last = items[items.length - 1];
  if (/mwst|ust|steuer|vat/i.test(last.label)) {
    return items.slice(0, -1);
  }
  return items.slice(0, 4);
}

function formatMileageKm(km: number | null | undefined): string | null {
  if (typeof km !== "number" || !Number.isFinite(km)) return null;
  return `${km.toLocaleString("de-DE")} km`;
}

export function DocumentInvoiceDetailView({
  tagUuid,
  document,
  backHref,
}: DocumentInvoiceDetailViewProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const title = displayDocumentTitle(document.title);
  const lineItems = document.line_items ?? [];
  const previewItems = previewLineItems(lineItems);
  const canOpenOriginal = isViewableDocumentUrl(document.file_url);
  const resolvedBack =
    backHref ?? `/v/${tagUuid}/dokumente?type=${document.type}`;
  const fileName = fileNameFromUrl(document.file_url, title);
  const issuedLabel = formatCompactDate(document.date);
  const scannedLabel = formatCompactDate(document.created_at);
  const mileageLabel = formatMileageKm(document.mileage_km);
  const invoiceMeta = [
    document.invoice_number?.trim(),
    issuedLabel,
    mileageLabel,
  ]
    .filter(Boolean)
    .join(" · ");
  const vendor = document.vendor?.trim() || title;

  async function handleShare() {
    const shareUrl = canOpenOriginal
      ? document.file_url
      : typeof window !== "undefined"
        ? window.location.href
        : "";
    const payload = {
      title: title,
      text: [vendor, invoiceMeta].filter(Boolean).join(" · "),
      url: shareUrl.startsWith("http") ? shareUrl : undefined,
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

        {mileageLabel ? (
          <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3 shadow-[var(--vd-shadow-sm)] sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
                Kilometerstand
              </p>
              <p className="text-[1.05rem] font-semibold tabular-nums tracking-[-0.02em] text-[color:var(--vd-text)]">
                {mileageLabel}
              </p>
            </div>
          </section>
        ) : null}

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Positionen
          </h2>
          {lineItems.length === 0 ? (
            <p className="text-[0.88rem] text-[color:var(--vd-muted)]">
              Keine Positionen erkannt. Originalrechnung unten öffnen.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {lineItems.map((item, index) => (
                <li
                  key={`${item.label}-${index}`}
                  className="flex items-start justify-between gap-3 text-[0.88rem]"
                >
                  <span className="text-[color:var(--vd-text)]">{item.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-[color:var(--vd-text)]">
                    {formatEur(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {document.amount !== null ? (
            <div className="mt-5 flex items-center justify-between">
              <span className="text-[0.95rem] font-bold tracking-[-0.02em] text-[color:var(--vd-text)]">
                Gesamt
              </span>
              <span className="text-[1.05rem] font-bold tracking-[-0.02em] tabular-nums text-[color:var(--vd-text)]">
                {formatEur(document.amount)}
              </span>
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white shadow-[var(--vd-shadow-sm)]">
          <div className="border-b border-[color:var(--vd-border)] bg-neutral-100 px-4 py-2.5">
            <p className="truncate text-[0.78rem] font-medium text-[color:var(--vd-text)]">
              {fileName}
            </p>
            <p className="text-[0.7rem] text-[color:var(--vd-muted)]">
              PDF · gescannt {scannedLabel}
            </p>
          </div>

          <div className="space-y-4 p-5 font-[family-name:var(--font-display)]">
            <div className="space-y-1 border-b border-neutral-200 pb-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Rechnung
              </p>
              <p className="text-[1.15rem] font-bold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {vendor}
              </p>
              {invoiceMeta ? (
                <p className="text-[0.8rem] text-neutral-500">{invoiceMeta}</p>
              ) : null}
            </div>

            {previewItems.length > 0 ? (
              <div className="space-y-2 text-[0.82rem]">
                {previewItems.map((item, index) => (
                  <div
                    key={`${item.label}-preview-${index}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="text-neutral-600">{item.label}</span>
                    <span className="font-medium tabular-nums text-neutral-900">
                      {formatEur(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[0.82rem] text-neutral-500">{title}</p>
            )}

            {document.amount !== null ? (
              <div className="flex justify-between border-t border-neutral-200 pt-3 text-[0.95rem] font-bold">
                <span>Betrag</span>
                <span className="tabular-nums">
                  {formatEur(document.amount)}
                </span>
              </div>
            ) : null}

            <div className="space-y-2 pt-1" aria-hidden>
              <div className="h-2 rounded bg-neutral-100" />
              <div className="h-2 w-4/5 rounded bg-neutral-100" />
              <div className="h-2 w-3/5 rounded bg-neutral-100" />
            </div>
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
        <div className="pointer-events-auto mx-auto grid max-w-lg grid-cols-2 gap-3">
          <PressableButton
            type="button"
            variant="button"
            onClick={() => {
              void handleShare();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3.5 text-[0.88rem] font-semibold text-[color:var(--vd-text)] shadow-[var(--vd-shadow)]"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            Teilen
          </PressableButton>
          <PressableButton
            type="button"
            variant="button"
            disabled={!canOpenOriginal}
            onClick={() => setViewerOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white shadow-[var(--vd-shadow)] disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            PDF öffnen
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
