"use client";

import { useMemo, useState } from "react";
import { Stamp } from "lucide-react";

import { ListSearchControls } from "@/components/documents/list-search-controls";
import {
  AutomotiveEmptyPanel,
  AutomotiveList,
  AutomotiveListRow,
  AutomotiveSectionLabel,
} from "@/components/ui/automotive";
import { IOSListPage } from "@/components/ui/ios";
import {
  collectFilterValues,
  matchesSearchQuery,
} from "@/lib/documents/list-search";

import { ABE_DOCUMENTS, type AbeDocument } from "./abeDocuments";

interface AbeDocumentsViewProps {
  vehicleModel: string;
  documents?: AbeDocument[];
  backHref?: string;
}

const ALL_STATUS = "all-status";

export function AbeDocumentsView({
  vehicleModel,
  documents = ABE_DOCUMENTS,
  backHref = "/",
}: AbeDocumentsViewProps) {
  const [query, setQuery] = useState("");
  const [statusId, setStatusId] = useState(ALL_STATUS);

  const statusChips = useMemo(
    () => [
      { id: ALL_STATUS, label: "Alle Status", count: documents.length },
      ...collectFilterValues(documents.map((doc) => doc.status)),
    ],
    [documents],
  );

  const visible = useMemo(() => {
    return documents.filter((doc) => {
      if (statusId !== ALL_STATUS && doc.status !== statusId) return false;
      return matchesSearchQuery(
        query,
        doc.partName,
        doc.manufacturer,
        doc.category,
        doc.approvalNumber,
        doc.authority,
        doc.documentLabel,
        doc.summary,
        doc.status,
        ...(doc.vehicleFitment ?? []),
      );
    });
  }, [documents, query, statusId]);

  const resultLabel =
    visible.length === documents.length
      ? `${visible.length} Dokumente`
      : `${visible.length} von ${documents.length} Dokumenten`;

  return (
    <IOSListPage title="ABE & Gutachten" subtitle={vehicleModel} backHref={backHref}>
      <ListSearchControls
        query={query}
        onQueryChange={setQuery}
        placeholder="Teil, Hersteller, KBA, Kategorie"
        chips={statusChips}
        activeChipId={statusId}
        onChipChange={setStatusId}
        resultLabel={resultLabel}
      />

      <section aria-label="ABE Dokumente">
        <AutomotiveSectionLabel>Teileliste</AutomotiveSectionLabel>

        {visible.length === 0 ? (
          <AutomotiveEmptyPanel>
            Keine Treffer für diese Suche / Filter.
          </AutomotiveEmptyPanel>
        ) : (
          <AutomotiveList aria-label="ABE Dokumente">
            {visible.map((doc) => (
              <AutomotiveListRow
                key={doc.id}
                href={`/abe/${doc.id}`}
                icon={Stamp}
                iconTone="purple"
                title={doc.partName}
                meta={`${doc.manufacturer} · ${doc.category} · ${doc.issuedAt}`}
                badge={
                  <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                    {doc.status}
                  </span>
                }
              />
            ))}
          </AutomotiveList>
        )}
      </section>
    </IOSListPage>
  );
}

export type { AbeDocument };
