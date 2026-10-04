"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";

import { ListSearchControls } from "@/components/documents/list-search-controls";
import {
  AutomotiveEmptyPanel,
  AutomotiveList,
  AutomotiveListRow,
  AutomotiveSectionLabel,
  AutomotiveSummaryPanel,
  automotiveFilterChipActiveClassName,
  automotiveFilterChipInactiveClassName,
} from "@/components/ui/automotive";
import { cn } from "@/lib/utils";
import {
  collectFilterValues,
  matchesSearchQuery,
} from "@/lib/documents/list-search";

import { ABE_DOCUMENTS, type AbeDocument } from "./abeDocuments";
import { PressableLink } from "./Pressable";

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

          <AutomotiveSummaryPanel title="ABE & Gutachten" />
        </header>

        <ListSearchControls
          query={query}
          onQueryChange={setQuery}
          placeholder="Teil, Hersteller, KBA, Kategorie…"
          resultLabel={resultLabel}
        />

        <div
          role="toolbar"
          aria-label="Statusfilter"
          className="flex gap-2 overflow-x-auto pb-0.5"
        >
          {statusChips.map((chip) => {
            const active = statusId === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusId(chip.id)}
                className={cn(
                  active
                    ? automotiveFilterChipActiveClassName
                    : automotiveFilterChipInactiveClassName,
                  "px-3 py-1.5 text-[0.72rem]",
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <section aria-label="ABE Dokumente" className="space-y-2">
          <AutomotiveSectionLabel>Teileliste</AutomotiveSectionLabel>

          {visible.length === 0 ? (
            <AutomotiveEmptyPanel>
              Keine Treffer für diese Suche / Filter.
            </AutomotiveEmptyPanel>
          ) : (
            <AutomotiveList aria-label="ABE Dokumente">
              {visible.map((doc, index) => (
                <AutomotiveListRow
                  key={doc.id}
                  href={`/abe/${doc.id}`}
                  icon={FileText}
                  title={doc.partName}
                  meta={`${doc.manufacturer} · ${doc.category} · ${doc.issuedAt}`}
                  badge={
                    <span className="inline-flex rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-emerald-400">
                      {doc.status}
                    </span>
                  }
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

export type { AbeDocument };
