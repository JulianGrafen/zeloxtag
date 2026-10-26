"use client";

import { useMemo, useState } from "react";
import { Receipt } from "lucide-react";

import { ListSearchControls } from "@/components/documents/list-search-controls";
import {
  AutomotiveEmptyPanel,
  AutomotiveList,
  AutomotiveListRow,
  AutomotiveSectionLabel,
} from "@/components/ui/automotive";
import { IOSListPage } from "@/components/ui/ios";
import { collectFilterValues, matchesSearchQuery } from "@/lib/documents/list-search";

import {
  formatEur,
  getInvoiceTotal,
  INVOICE_DOCUMENTS,
  type InvoiceDocument,
} from "./invoiceDocuments";

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
    <IOSListPage
      title="Rechnungen & Belege"
      subtitle={`Summe ${formatEur(total)}`}
      backHref={backHref}
    >
      <ListSearchControls
        query={query}
        onQueryChange={setQuery}
        placeholder="Werkstatt, Titel, Kategorie"
        chips={categoryChips}
        activeChipId={categoryId}
        onChipChange={setCategoryId}
        resultLabel={resultLabel}
      />

      <section aria-label="Rechnungen">
        <AutomotiveSectionLabel>{vehicleModel}</AutomotiveSectionLabel>

        {visible.length === 0 ? (
          <AutomotiveEmptyPanel>
            Keine Treffer für diese Suche / Filter.
          </AutomotiveEmptyPanel>
        ) : (
          <AutomotiveList aria-label="Belegliste">
            {visible.map((doc) => (
              <AutomotiveListRow
                key={doc.id}
                href={`/rechnungen/${doc.id}`}
                icon={Receipt}
                iconTone="blue"
                title={doc.title}
                amount={formatEur(doc.amount)}
                meta={`${doc.vendor} · ${doc.issuedAt} · ${doc.category}`}
              />
            ))}
          </AutomotiveList>
        )}
      </section>
    </IOSListPage>
  );
}
