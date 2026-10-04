"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Receipt } from "lucide-react";

import { ListSearchControls } from "@/components/documents/list-search-controls";
import {
  AutomotiveEmptyPanel,
  AutomotiveList,
  AutomotiveListRow,
  AutomotiveSectionLabel,
  AutomotiveSummaryPanel,
} from "@/components/ui/automotive";
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
            className="vd-back-pill"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Zurück
          </PressableLink>

          <AutomotiveSummaryPanel
            title="Rechnungen & Belege"
            metric={`Summe ${formatEur(total)}`}
          />
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
          <AutomotiveSectionLabel>Belegliste</AutomotiveSectionLabel>

          {visible.length === 0 ? (
            <AutomotiveEmptyPanel>
              Keine Treffer für diese Suche / Filter.
            </AutomotiveEmptyPanel>
          ) : (
            <AutomotiveList aria-label="Belegliste">
              {visible.map((doc, index) => (
                <AutomotiveListRow
                  key={doc.id}
                  href={`/rechnungen/${doc.id}`}
                  icon={Receipt}
                  title={doc.title}
                  amount={formatEur(doc.amount)}
                  meta={`${doc.vendor} · ${doc.issuedAt} · ${doc.category}`}
                  showDivider={index < visible.length - 1}
                />
              ))}
            </AutomotiveList>
          )}
        </section>
      </div>
    </div>
  );
}
