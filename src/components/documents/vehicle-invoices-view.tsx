"use client";

import { ArrowLeft, ChevronRight, Plus, Receipt } from "lucide-react";

import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import {
  displayDocumentTitle,
  sumInvoiceAmounts,
} from "@/lib/documents/format";
import type { Document } from "@/types/database";

interface VehicleInvoicesViewProps {
  tagUuid: string;
  vehicleModel: string;
  documents: Document[];
}

function formatCompactDate(iso: string | null): string {
  if (!iso) return "Ohne Datum";
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Invoice overview matching the "Rechnungen & Belege" dashboard mock.
 */
export function VehicleInvoicesView({
  tagUuid,
  vehicleModel,
  documents,
}: VehicleInvoicesViewProps) {
  const invoices = documents
    .filter((doc) => doc.type === "invoice")
    .slice()
    .sort((a, b) => {
      const aDate = a.date ?? a.created_at;
      const bDate = b.date ?? b.created_at;
      return bDate.localeCompare(aDate);
    });
  const total = sumInvoiceAmounts(invoices);

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-4">
          <PressableLink
            href={`/v/${tagUuid}`}
            variant="pill"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Zurück
          </PressableLink>

          <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)] sm:p-6">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              Digitalisiert
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.75rem]">
              Rechnungen & Belege
            </h1>
            <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
              {vehicleModel} · {invoices.length} Belege
            </p>
            <p className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
              Summe {formatEur(total)}
            </p>
          </div>
        </header>

        <section aria-label="Belegliste" className="space-y-2">
          <h2 className="px-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Belegliste
          </h2>

          {invoices.length === 0 ? (
            <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 text-[0.9rem] text-[color:var(--vd-muted)] shadow-[var(--vd-shadow-sm)]">
              Noch keine Rechnungen. Scanne deinen ersten Beleg.
            </div>
          ) : (
            <ul className="vd-anim-list overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
              {invoices.map((doc, index) => {
                const amount =
                  typeof doc.amount === "number" ? formatEur(doc.amount) : null;
                const vendor = doc.vendor?.trim() || "Unbekannter Anbieter";
                const issued = formatCompactDate(doc.date);

                return (
                  <li key={doc.id}>
                    <PressableLink
                      href={`/v/${tagUuid}/dokumente/${doc.id}`}
                      variant="row"
                      className="group flex w-full items-start gap-3 px-4 py-3.5 text-left"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
                        <Receipt
                          className="h-5 w-5"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                            {displayDocumentTitle(doc.title)}
                          </span>
                          {amount ? (
                            <span className="shrink-0 text-[0.88rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
                              {amount}
                            </span>
                          ) : null}
                        </span>

                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-[0.75rem] text-[color:var(--vd-muted)]">
                            {vendor} · {issued}
                          </span>
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-data-[pressed=true]:translate-x-1.5"
                            aria-hidden
                          />
                        </span>

                        <span className="mt-1.5 inline-flex rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-emerald-700">
                          bezahlt
                        </span>
                      </span>
                    </PressableLink>

                    {index < invoices.length - 1 ? (
                      <div
                        aria-hidden
                        className="mx-4 border-t border-[color:var(--vd-border)]"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
        <div className="pointer-events-auto mx-auto max-w-lg">
          <PressableLink
            href={`/v/${tagUuid}?scan=1`}
            variant="button"
            className="claim-cta shadow-[var(--vd-shadow)]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Rechnung scannen
          </PressableLink>
        </div>
      </div>
    </div>
  );
}
