"use client";

import { useMemo } from "react";

import { ShowcaseDocCollapsibleGroup } from "@/components/vehicles/showcase-doc-collapsible-group";
import { ShowcaseDocumentPicker } from "@/components/vehicles/showcase-document-picker";
import { usePublicShowcaseDocumentSelection } from "@/hooks/use-public-showcase-document-selection";
import { partitionShowcaseSelectableDocuments } from "@/lib/vehicles/public-showcase-documents";
import { formatShowcaseDocumentMeta } from "@/lib/vehicles/showcase-document-meta";
import type { Document } from "@/types/database";

type VehicleShowcaseModificationsSettingsProps = {
  tagUuid: string;
  vehicleId: string;
  documents: Document[];
  canEdit: boolean;
};

export function VehicleShowcaseModificationsSettings({
  tagUuid,
  vehicleId,
  documents,
  canEdit,
}: VehicleShowcaseModificationsSettingsProps) {
  const { invoices, modifications } = useMemo(
    () => partitionShowcaseSelectableDocuments(documents),
    [documents],
  );

  const {
    selectedIds,
    lineSelections,
    pending,
    message,
    error,
    toggleDocument,
    toggleLineItem,
  } = usePublicShowcaseDocumentSelection({
    vehicleId,
    tagUuid,
    documents,
    canEdit,
  });

  const selectedModificationCount = modifications.filter((doc) =>
    selectedIds.has(doc.id),
  ).length;
  const selectedInvoiceCount = invoices.filter((doc) =>
    selectedIds.has(doc.id),
  ).length;
  const hasAnyDocs = modifications.length > 0 || invoices.length > 0;

  return (
    <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 sm:p-5">
      {!hasAnyDocs ? (
        <p className="rounded-xl border border-dashed border-[color:var(--vd-border)] px-4 py-3 text-[0.82rem] text-[color:var(--vd-muted)]">
          Noch keine Umbauten oder Rechnungen — lege Belege im Fahrzeug-Dashboard
          an.
        </p>
      ) : (
        <div className="space-y-5">
          <div>
            <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
              Umbauten
            </h2>
            {modifications.length > 0 ? (
              <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
                {modifications.length} Einträge
                {selectedModificationCount > 0
                  ? ` · ${selectedModificationCount} sichtbar`
                  : ""}
              </p>
            ) : (
              <p className="mt-2 rounded-xl border border-dashed border-[color:var(--vd-border)] px-4 py-3 text-[0.82rem] text-[color:var(--vd-muted)]">
                Noch keine Umbauten.
              </p>
            )}
            {modifications.length > 0 ? (
              <div className="mt-3 space-y-2">
                {modifications.map((doc) => (
                  <ShowcaseDocumentPicker
                    key={doc.id}
                    doc={doc}
                    meta={doc.vendor ?? doc.date?.slice(0, 10) ?? null}
                    selected={selectedIds.has(doc.id)}
                    selectedLines={lineSelections[doc.id] ?? []}
                    disabled={!canEdit || pending}
                    onToggleDocument={(value) => toggleDocument(doc, value)}
                    onToggleLine={(index, value) =>
                      toggleLineItem(doc.id, index, value)
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="border-t border-[color:var(--vd-border)] pt-5">
            {invoices.length > 0 ? (
              <ShowcaseDocCollapsibleGroup
                title="Rechnungen"
                count={invoices.length}
                selectedCount={selectedInvoiceCount}
              >
                {invoices.map((doc) => (
                  <ShowcaseDocumentPicker
                    key={doc.id}
                    doc={doc}
                    meta={formatShowcaseDocumentMeta(doc)}
                    selected={selectedIds.has(doc.id)}
                    selectedLines={lineSelections[doc.id] ?? []}
                    disabled={!canEdit || pending}
                    onToggleDocument={(value) => toggleDocument(doc, value)}
                    onToggleLine={(index, value) =>
                      toggleLineItem(doc.id, index, value)
                    }
                  />
                ))}
              </ShowcaseDocCollapsibleGroup>
            ) : (
              <>
                <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
                  Rechnungen
                </h2>
                <p className="mt-2 rounded-xl border border-dashed border-[color:var(--vd-border)] px-4 py-3 text-[0.82rem] text-[color:var(--vd-muted)]">
                  Noch keine Rechnungen.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {message ? (
        <p className="mt-3 text-[0.82rem] text-[color:var(--vd-accent)]">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-[0.82rem] text-red-600" role="alert">{error}</p>
      ) : null}
    </section>
  );
}
