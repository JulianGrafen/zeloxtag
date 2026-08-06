"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Receipt } from "lucide-react";

import { ListSearchControls } from "@/components/documents/list-search-controls";
import { collectFilterValues, matchesSearchQuery } from "@/lib/documents/list-search";

import {
  formatEur,
  getInvoiceTotal,
  INVOICE_DOCUMENTS,
  type InvoiceDocument,
} from "./invoiceDocuments";
import { PressableLink } from "./Pressable";

interface InvoicesViewProps {
  vehicleModel: string;
  documents?: InvoiceDocument[];
  backHref?: string;
}

const ALL_CHIP = "all";

export function InvoicesView({
  vehicleModel,
  documents = INVOICE_DOCUMENTS,
  backHref = "/",
}: InvoicesViewProps) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState(ALL_CHIP);

  const categoryChips = useMemo(
    () => [
      { id: ALL_CHIP, label: "Alle", count: documents.length },
      ...collectFilterValues(documents.map((doc) => doc.category)),
    ],
    [documents],
  );

  const visible = useMemo(() => {
    return documents.filter((doc) => {
      if (categoryId !== ALL_CHIP && doc.category !== categoryId) return false;
      const lineLabels = doc.lineItems.map((item) => item.label).join(" ");
      return matchesSearchQuery(
        query,
        doc.title,
        doc.vendor,
        doc.category,
        doc.invoiceNumber,
        doc.notes,
        lineLabels,
      );
    });
  }, [documents, categoryId, query]);

  const total = getInvoiceTotal(visible);
  const resultLabel =
    visible.length === documents.length
      ? undefined
      : `${visible.length} von ${documents.length} Belegen`;

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-4">
          <PressableLink
            href={backHref}
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
              {vehicleModel} · {visible.length} Belege
            </p>
            <p className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
              Summe {formatEur(total)}
            </p>
          </div>
        </header>

        <ListSearchControls
          query={query}
          onQueryChange={setQuery}
          placeholder="Werkstatt, Titel, Kategorie…"
          chips={categoryChips}
          activeChipId={categoryId}
          onChipChange={setCategoryId}
          resultLabel={resultLabel}
        />

        <section aria-label="Rechnungen" className="space-y-2">
          <h2 className="px-1 font-[family-name:var(--font-display)] text-[0.72rem] font-semibold tracking-[0.16em] text-[color:var(--vd-muted)] uppercase">
            Belegliste
          </h2>

          {visible.length === 0 ? (
            <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 text-[0.9rem] text-[color:var(--vd-muted)] shadow-[var(--vd-shadow-sm)]">
              Keine Treffer für diese Suche / Filter.
            </div>
          ) : (
            <ul className="vd-anim-list overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
              {visible.map((doc, index) => (
                <li key={doc.id}>
                  <PressableLink
                    href={`/rechnungen/${doc.id}`}
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
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                          {doc.title}
                        </span>
                        <span className="shrink-0 text-[0.88rem] font-semibold text-[color:var(--vd-text)]">
                          {formatEur(doc.amount)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-[0.75rem] text-[color:var(--vd-muted)]">
                          {doc.vendor} · {doc.issuedAt} · {doc.category}
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-data-[pressed=true]:translate-x-1.5"
                          aria-hidden
                        />
                      </span>
                    </span>
                  </PressableLink>

                  {index < visible.length - 1 ? (
                    <div
                      aria-hidden
                      className="mx-4 border-t border-[color:var(--vd-border)]"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
