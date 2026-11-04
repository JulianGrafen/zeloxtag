"use client";

import { useMemo, useState } from "react";

import { Camera, ScanLine, Wrench } from "lucide-react";

import {
  IOSGroupedList,
  InsetGroupedCard,
  InsetListRow,
} from "@/components/ui/ios";
import { ShowcaseBuildStoryChronikSection } from "@/components/vehicles/showcase-build-story-chronik-section";
import { ShowcaseDocCollapsibleGroup } from "@/components/vehicles/showcase-doc-collapsible-group";
import { ShowcaseDocumentPicker } from "@/components/vehicles/showcase-document-picker";
import { ShowcaseModificationIosRow } from "@/components/vehicles/showcase-modification-ios-row";
import { usePublicShowcaseDocumentSelection } from "@/hooks/use-public-showcase-document-selection";
import {
  MANUAL_ENTRY_CATEGORY_LABELS,
  parseManualEntryCategory,
} from "@/lib/documents/manual-entries";
import { formatCompactGermanDate } from "@/lib/documents/format";
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
  const scanHref = vehicleSurfaceScope
    ? vehicleSurfaceHref(vehicleSurfaceScope, "?scan=1&type=invoice")
    : `/v/${tagUuid}?scan=1&type=invoice`;
  const umbautenHref = vehicleSurfaceScope
    ? `${vehicleSurfaceHref(vehicleSurfaceScope, "umbauten")}?neu=1`
    : `/v/${tagUuid}/umbauten?neu=1`;
  const { invoices, modifications, manualEntries } = useMemo(
    () => partitionShowcaseSelectableDocuments(documents),
    [documents],
  );

  const [showPublishHint, setShowPublishHint] = useState(false);

  const {
    selectedIds,
    buildStoryIds,
    lineSelections,
    pending,
    message,
    error,
    toggleDocument,
    toggleBuildStory,
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

  const profileGroups = [
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

  function handleToggleChronik(doc: Document, enabled: boolean) {
    const wasEmpty = buildStoryIds.size === 0;
    toggleBuildStory(doc, enabled);
    if (
      enabled &&
      wasEmpty &&
      !vehicle.is_story_public &&
      Boolean(vehicle.is_public)
    ) {
      setShowPublishHint(true);
    }
  }

  function editModificationHref(documentId: string): string {
    const base = vehicleSurfaceScope
      ? vehicleSurfaceHref(vehicleSurfaceScope, "umbauten")
      : `/v/${tagUuid}/umbauten`;
    return `${base}?edit=${documentId}`;
  }

  const hasProfileContent = profileGroups.length > 0;
  const modificationsFooter =
    modifications.length > 0
      ? `${modifications.length} ${modifications.length === 1 ? "Umbau" : "Umbauten"}${
          selectedModificationCount > 0
            ? ` · ${selectedModificationCount} im Profil`
            : ""
        }. „Im Profil“ zeigt den Umbau in der Umbau-Liste, „In Chronik“ in der Build-Timeline (Foto nötig).`
      : "Noch keine Umbauten. Erfasse oben deinen ersten Umbau mit Foto.";

  return (
    <div className="flex flex-col gap-6">
      {canEdit ? (
        <InsetGroupedCard
          header="Hinzufügen"
          footer="Rechnungen werden automatisch ausgelesen, einzelne Positionen kannst du danach fürs Profil auswählen."
        >
          <InsetListRow
            href={umbautenHref}
            icon={Camera}
            iconTone="amber"
            emphasis="navigation"
            label="Umbau mit Foto"
            sublabel="Manuell erfassen, ideal für die Chronik"
            chevron
          />
          <InsetListRow
            href={scanHref}
            icon={ScanLine}
            iconTone="blue"
            emphasis="navigation"
            label="Rechnung scannen"
            sublabel="Teile und Kosten automatisch erkennen"
            chevron
            isLast
          />
        </InsetGroupedCard>
      ) : null}

      <IOSGroupedList headerTitle="Umbauten" footerText={modificationsFooter}>
        {modifications.length > 0 ? (
          modifications.map((doc, index) => (
            <ShowcaseModificationIosRow
              key={doc.id}
              doc={doc}
              vehicleId={vehicle.id}
              editHref={editModificationHref(doc.id)}
              showcaseChecked={selectedIds.has(doc.id)}
              chronikChecked={buildStoryIds.has(doc.id)}
              disabled={!canEdit || pending}
              isLast={index === modifications.length - 1}
              onToggleShowcase={(value) => toggleDocument(doc, value)}
              onToggleChronik={(value) => handleToggleChronik(doc, value)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-7 text-center">
            <span
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400"
            >
              <Wrench className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <p className="text-[13px] leading-relaxed text-zinc-500">
              Deine Umbauten erscheinen hier.
            </p>
          </div>
        )}
      </IOSGroupedList>

      {hasProfileContent ? (
        <IOSGroupedList
          headerTitle="Weitere Einträge & Rechnungen"
          footerText="Wähle, welche Belege und Positionen im Profil erscheinen. Beträge blendest du unter Öffentliches Profil aus."
        >
          {profileGroups.map((group, index) => (
            <ShowcaseDocCollapsibleGroup
              key={group.key}
              title={group.title}
              count={group.docs.length}
              selectedCount={group.selectedCount}
              variant="ios"
              isLast={index === profileGroups.length - 1}
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
      ) : null}

      <ShowcaseBuildStoryChronikSection
        vehicle={vehicle}
        documents={documents}
        tagUuid={tagUuid}
        vehicleSurfaceScope={vehicleSurfaceScope}
        canEdit={canEdit}
        hasLinkedTag={hasLinkedTag}
        showPublishHint={showPublishHint}
        onDismissPublishHint={() => setShowPublishHint(false)}
      />

      {message ? (
        <p className="px-4 text-[13px] text-[#30D158]">{message}</p>
      ) : null}
      {error ? (
        <p className="px-4 text-[13px] text-[#FF453A]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
