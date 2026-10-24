"use client";

import { useMemo } from "react";

import { IOSGroupedList } from "@/components/ui/ios";
import { ShowcaseBuildStoryChronikSection } from "@/components/vehicles/showcase-build-story-chronik-section";
import { ShowcaseDocCollapsibleGroup } from "@/components/vehicles/showcase-doc-collapsible-group";
import { ShowcaseDocumentPicker } from "@/components/vehicles/showcase-document-picker";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { usePublicShowcaseDocumentSelection } from "@/hooks/use-public-showcase-document-selection";
import {
  MANUAL_ENTRY_CATEGORY_LABELS,
  parseManualEntryCategory,
} from "@/lib/documents/manual-entries";
import { formatCompactGermanDate } from "@/lib/documents/format";
import { documentsListHref } from "@/lib/vehicle-surface/documents-list-href";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import { partitionShowcaseSelectableDocuments } from "@/lib/vehicles/public-showcase-documents";
import { formatShowcaseDocumentMeta } from "@/lib/vehicles/showcase-document-meta";
import type { Document, Vehicle } from "@/types/database";

type VehicleShowcaseModificationsSettingsProps = {
  tagUuid: string;
  vehicleSurfaceScope?: VehicleSurfaceScope;
  vehicle: Vehicle;
  documents: Document[];
  canEdit: boolean;
  hasLinkedTag: boolean;
};

function formatManualEntryMeta(doc: Document): string | null {
  const category = parseManualEntryCategory(doc.category);
  const parts: string[] = [];
  if (category) {
    parts.push(MANUAL_ENTRY_CATEGORY_LABELS[category]);
  }
  if (doc.date) {
    parts.push(formatCompactGermanDate(doc.date));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatModificationMeta(doc: Document): string | null {
  const parts: string[] = [];
  if (doc.date) parts.push(formatCompactGermanDate(doc.date));
  if (doc.mileage_km != null) {
    parts.push(`${doc.mileage_km.toLocaleString("de-DE")} km`);
  }
  if (doc.vendor?.trim()) parts.push(doc.vendor.trim());
  return parts.length > 0 ? parts.join(" · ") : null;
}

function ShowcaseDocumentPickerList({
  docs,
  selectedIds,
  lineSelections,
  disabled,
  metaForDoc,
  onToggleDocument,
  onToggleLine,
}: {
  docs: Document[];
  selectedIds: Set<string>;
  lineSelections: Record<string, number[]>;
  disabled: boolean;
  metaForDoc: (doc: Document) => string | null;
  onToggleDocument: (doc: Document, value: boolean) => void;
  onToggleLine: (documentId: string, index: number, value: boolean) => void;
}) {
  return (
    <>
      {docs.map((doc) => (
        <ShowcaseDocumentPicker
          key={doc.id}
          doc={doc}
          meta={metaForDoc(doc)}
          selected={selectedIds.has(doc.id)}
          selectedLines={lineSelections[doc.id] ?? []}
          disabled={disabled}
          onToggleDocument={(value) => onToggleDocument(doc, value)}
          onToggleLine={(index, value) => onToggleLine(doc.id, index, value)}
        />
      ))}
    </>
  );
}

export function VehicleShowcaseModificationsSettings({
  tagUuid,
  vehicleSurfaceScope,
  vehicle,
  documents,
  canEdit,
  hasLinkedTag,
}: VehicleShowcaseModificationsSettingsProps) {
  const belegeHref = documentsListHref(tagUuid, "invoice", vehicleSurfaceScope);
  const umbautenHref = vehicleSurfaceScope
    ? `${vehicleSurfaceHref(vehicleSurfaceScope, "umbauten")}?neu=1`
    : `/v/${tagUuid}/umbauten?neu=1`;

  const { invoices, modifications, manualEntries } = useMemo(
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
    vehicleId: vehicle.id,
    tagUuid,
    documents,
    canEdit,
  });

  const selectedModificationCount = modifications.filter((doc) =>
    selectedIds.has(doc.id),
  ).length;
  const selectedManualCount = manualEntries.filter((doc) =>
    selectedIds.has(doc.id),
  ).length;
  const selectedInvoiceCount = invoices.filter((doc) =>
    selectedIds.has(doc.id),
  ).length;

  const hasSelectableContent =
    modifications.length > 0 ||
    manualEntries.length > 0 ||
    invoices.length > 0;

  const profileGroups = [
    {
      key: "modifications",
      title: "Selbstgemachte Umbauten",
      docs: modifications,
      selectedCount: selectedModificationCount,
      metaForDoc: formatModificationMeta,
    },
    {
      key: "manual",
      title: "Manuelle Einträge",
      docs: manualEntries,
      selectedCount: selectedManualCount,
      metaForDoc: formatManualEntryMeta,
    },
    {
      key: "invoices",
      title: "Rechnungen",
      docs: invoices,
      selectedCount: selectedInvoiceCount,
      metaForDoc: formatShowcaseDocumentMeta,
    },
  ].filter((group) => group.docs.length > 0);

  const visibleGroups = profileGroups.length > 0 ? profileGroups : [];

  return (
    <div className="flex flex-col gap-5">
      <ShowcaseBuildStoryChronikSection
        vehicle={vehicle}
        documents={documents}
        tagUuid={tagUuid}
        vehicleSurfaceScope={vehicleSurfaceScope}
        canEdit={canEdit}
        hasLinkedTag={hasLinkedTag}
      />

      {hasSelectableContent ? (
        <IOSGroupedList
          headerTitle="Im Profil zeigen"
          footerText="Wähle Umbauten, manuelle Einträge und Rechnungen für dein öffentliches Showcase."
        >
          {visibleGroups.map((group, index) => (
            <ShowcaseDocCollapsibleGroup
              key={group.key}
              title={group.title}
              count={group.docs.length}
              selectedCount={group.selectedCount}
              variant="ios"
              isLast={index === visibleGroups.length - 1}
              defaultOpen={group.selectedCount > 0}
            >
              <ShowcaseDocumentPickerList
                docs={group.docs}
                selectedIds={selectedIds}
                lineSelections={lineSelections}
                disabled={!canEdit || pending}
                metaForDoc={group.metaForDoc}
                onToggleDocument={toggleDocument}
                onToggleLine={toggleLineItem}
              />
            </ShowcaseDocCollapsibleGroup>
          ))}
        </IOSGroupedList>
      ) : (
        <IOSGroupedList headerTitle="Im Profil zeigen">
          <div className="px-4 py-5 text-center">
            <p className="text-[13px] leading-relaxed text-zinc-500">
              Noch keine Belege oder Einträge.
            </p>
            {canEdit ? (
              <div className="mt-3 flex flex-col gap-2">
                <PressableLink
                  href={umbautenHref}
                  className="text-[14px] font-semibold text-[#0A84FF]"
                >
                  Umbauten hinzufügen
                </PressableLink>
                <PressableLink
                  href={belegeHref}
                  className="text-[14px] font-semibold text-[#0A84FF]"
                >
                  Rechnung scannen
                </PressableLink>
              </div>
            ) : null}
          </div>
        </IOSGroupedList>
      )}

      {message ? (
        <p className="text-[0.82rem] text-[color:var(--vd-accent)]">{message}</p>
      ) : null}
      {error ? (
        <p className="text-[0.82rem] text-red-600" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
