"use client";

import { useMemo, useState } from "react";

import { IOSGroupedList } from "@/components/ui/ios";
import { ShowcaseBuildStoryChronikSection } from "@/components/vehicles/showcase-build-story-chronik-section";
import { ShowcaseDocCollapsibleGroup } from "@/components/vehicles/showcase-doc-collapsible-group";
import { ShowcaseDocumentPicker } from "@/components/vehicles/showcase-document-picker";
import { ShowcaseModificationIosRow } from "@/components/vehicles/showcase-modification-ios-row";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { usePublicShowcaseDocumentSelection } from "@/hooks/use-public-showcase-document-selection";
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

  const { invoices, modifications } = useMemo(
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
  const selectedInvoiceCount = invoices.filter((doc) =>
    selectedIds.has(doc.id),
  ).length;
  const hasAnyDocs = modifications.length > 0 || invoices.length > 0;

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

  return (
    <div className="flex flex-col gap-5">
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

      <IOSGroupedList
        headerTitle="Umbauten"
        footerText={
          modifications.length > 0
            ? `${modifications.length} Einträge${
                selectedModificationCount > 0
                  ? ` · ${selectedModificationCount} im Showcase`
                  : ""
              }`
            : "Manuelle Umbauten mit Foto — ideal für die Build-Chronik."
        }
      >
        {canEdit ? (
          <PressableLink
            href={umbautenHref}
            className="flex w-full items-center justify-center border-b border-white/10 px-4 py-3.5 text-[15px] font-semibold text-[#0A84FF]"
          >
            Umbau mit Foto
          </PressableLink>
        ) : null}
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
          <div className="px-4 py-6 text-center">
            <p className="text-[13px] leading-relaxed text-zinc-500">
              Noch keine Umbauten.
            </p>
            {canEdit ? (
              <PressableLink
                href={umbautenHref}
                className="mt-3 inline-block text-[14px] font-semibold text-[#0A84FF]"
              >
                Ersten Umbau anlegen
              </PressableLink>
            ) : null}
          </div>
        )}
      </IOSGroupedList>

      {hasAnyDocs || invoices.length > 0 ? (
        <section className="zt-feature-panel p-4 sm:p-5">
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
        </section>
      ) : !hasAnyDocs ? (
        <p className="rounded-2xl border border-dashed border-[color:var(--vd-border)] px-4 py-3 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
          Noch keine Umbauten oder Rechnungen —{" "}
          <PressableLink
            href={belegeHref}
            className="font-medium text-[color:var(--vd-text)] underline decoration-[color:var(--vd-border)] underline-offset-2"
          >
            Rechnungen &amp; Belege öffnen
          </PressableLink>{" "}
          und dort eintragen oder scannen.
        </p>
      ) : null}

      {message ? (
        <p className="text-[0.82rem] text-[color:var(--vd-accent)]">{message}</p>
      ) : null}
      {error ? (
        <p className="text-[0.82rem] text-red-600" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
