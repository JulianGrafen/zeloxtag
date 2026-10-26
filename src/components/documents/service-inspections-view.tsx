"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Trash2 } from "lucide-react";

import { deleteDocument } from "@/actions/delete-document";
import { showSavedToast } from "@/lib/ui/saved-toast";
import { InvoiceUploader } from "@/components/dashboard/InvoiceUploader";
import { ListSearchControls } from "@/components/documents/list-search-controls";
import { ScanTypePicker } from "@/components/documents/scan-type-picker";
import {
  AutomotiveEmptyPanel,
  AutomotiveList,
  AutomotiveListRow,
} from "@/components/ui/automotive";
import { DashboardScanFab } from "@/components/tags/dashboard-scan-fab";
import { IOSEmptyState, IOSListPage } from "@/components/ui/ios";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import {
  displayDocumentTitle,
  formatDocumentAmount,
  formatDocumentDate,
} from "@/lib/documents/format";
import { matchesSearchQuery } from "@/lib/documents/list-search";
import { filterServiceInspectionDocuments } from "@/lib/documents/service-inspections";
import {
  scanTypeDefinition,
  type ScanType,
} from "@/lib/documents/scan-types";
import { documentDetailHref } from "@/lib/vehicle-surface/documents-list-href";
import {
  garagePathForVehicle,
  isVehicleId,
  vehicleSurfaceHref,
} from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import { setScanSurfaceActive } from "@/lib/ui/scan-surface-state";
import type { Document } from "@/types/database";

function surfacePath(
  scope: VehicleSurfaceScope | undefined,
  tagUuid: string,
  segment?: string,
): string {
  if (scope) {
    return segment?.trim()
      ? vehicleSurfaceHref(scope, segment)
      : vehicleSurfaceHref(scope);
  }
  if (isVehicleId(tagUuid)) {
    return garagePathForVehicle(tagUuid, segment);
  }
  if (!segment?.trim()) {
    return `/v/${tagUuid}`;
  }
  const normalized = segment.startsWith("/") ? segment : `/${segment}`;
  return `/v/${tagUuid}${normalized}`;
}

interface ServiceInspectionsViewProps {
  tagUuid: string;
  vehicleSurfaceScope?: VehicleSurfaceScope;
  vehicleId: string;
  vehicleLabel: string;
  documents: Document[];
  /** Open type picker immediately (Pro only). */
  initialScan?: boolean;
  /** Pro: scan FAB + delete scanned documents. */
  canManageDocuments?: boolean;
}

type ServiceScanMode = "list" | "pick-scan" | "scanner";

export function ServiceInspectionsView({
  tagUuid,
  vehicleSurfaceScope,
  vehicleId,
  vehicleLabel,
  documents,
  initialScan = false,
  canManageDocuments = true,
}: ServiceInspectionsViewProps) {
  const router = useRouter();
  const path = (segment?: string) =>
    surfacePath(vehicleSurfaceScope, tagUuid, segment);
  const [mode, setMode] = useState<ServiceScanMode>(
    initialScan ? "pick-scan" : "list",
  );
  const [scanType, setScanType] = useState<ScanType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");

  const inspections = useMemo(
    () => filterServiceInspectionDocuments(documents),
    [documents],
  );

  const visibleInspections = useMemo(() => {
    return inspections.filter((doc) =>
      matchesSearchQuery(
        query,
        doc.title,
        doc.vendor,
        doc.notes,
        doc.category,
        doc.invoice_number,
      ),
    );
  }, [inspections, query]);

  const searchResultLabel =
    visibleInspections.length === inspections.length
      ? undefined
      : `${visibleInspections.length} von ${inspections.length} Einträgen`;

  useEffect(() => {
    const immersive = mode === "pick-scan" || mode === "scanner";
    setScanSurfaceActive(immersive);
    return () => setScanSurfaceActive(false);
  }, [mode]);

  if (mode === "pick-scan" || (mode === "scanner" && !scanType)) {
    return (
      <ScanTypePicker
        vehicleLabel={vehicleLabel}
        backHref={path("service")}
        suggestedType="service"
        onBack={() => {
          setScanType(null);
          setMode("list");
        }}
        onSelect={(type) => {
          setScanType(type);
          setMode("scanner");
        }}
      />
    );
  }

  if (mode === "scanner" && scanType) {
    const def = scanTypeDefinition(scanType);
    return (
      <InvoiceUploader
        vehicleId={vehicleId}
        tagUuid={tagUuid}
        vehicleLabel={vehicleLabel}
        existingDocuments={documents}
        backHref={path("service")}
        backLabel="Service & Wartung"
        onBack={() => {
          setMode("pick-scan");
        }}
        scanType={scanType}
        successHref={
          scanType === "service"
            ? path("service")
            : path(`dokumente?type=${def.successTypeQuery}`)
        }
      />
    );
  }

  function handleDelete(documentId: string) {
    setError(null);
    setPendingId(documentId);
    startTransition(async () => {
      const result = await deleteDocument({
        documentId,
        vehicleId,
        tagUuid,
      });
      setPendingId(null);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      showSavedToast();
      router.refresh();
    });
  }

  const scanFab = canManageDocuments ? (
    <DashboardScanFab
      tagUuid={tagUuid}
      directAction="menu"
      menuTitle="Inspektion hinzufügen"
      hideFuelAction
      scanActionLabel="Beleg scannen"
      onOpenScanner={() => {
        setScanType(null);
        setMode("pick-scan");
      }}
    />
  ) : null;

  return (
    <IOSListPage
      title="Service & Wartung"
      subtitle={`${inspections.length} Inspektionen`}
      backHref={path()}
      overlay={scanFab}
    >
      {inspections.length > 0 ? (
        <ListSearchControls
          query={query}
          onQueryChange={setQuery}
          placeholder="Werkstatt, Titel, Notiz…"
          resultLabel={searchResultLabel}
        />
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-500/15 px-4 py-3 text-[15px] text-red-400"
        >
          {error}
        </p>
      ) : null}

      <section aria-label="Inspektionsliste">
        {inspections.length === 0 ? (
          <IOSEmptyState title="Noch keine Inspektionen" icon={ClipboardList}>
            Scanne Servicebelege, Ölwechsel oder Inspektionsrechnungen —
            Werkstatt, Datum und Betrag werden automatisch erkannt.
          </IOSEmptyState>
        ) : visibleInspections.length === 0 ? (
          <AutomotiveEmptyPanel>Keine Treffer für diese Suche.</AutomotiveEmptyPanel>
        ) : (
          <AutomotiveList aria-label="Inspektionsliste">
            {visibleInspections.map((doc) => (
              <InspectionRow
                key={doc.id}
                document={doc}
                href={documentDetailHref(tagUuid, doc.id, vehicleSurfaceScope)}
                canDelete={
                  canManageDocuments &&
                  (doc.file_url.startsWith("mock://") ||
                    !doc.file_url.startsWith("/demo/"))
                }
                deleting={pending && pendingId === doc.id}
                onDelete={() => handleDelete(doc.id)}
              />
            ))}
          </AutomotiveList>
        )}
      </section>
    </IOSListPage>
  );
}

function InspectionRow({
  document,
  href,
  canDelete,
  deleting,
  onDelete,
}: {
  document: Document;
  href: string;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const title = displayDocumentTitle(document.title);
  const meta = [document.vendor?.trim() || null, formatDocumentDate(document.date)]
    .filter(Boolean)
    .join(" · ");

  return (
    <AutomotiveListRow
      href={href}
      icon={ClipboardList}
      iconTone="blue"
      title={title}
      amount={formatDocumentAmount(document.amount) ?? undefined}
      meta={meta}
      accessory={
        canDelete ? (
          <PressableButton
            type="button"
            variant="button"
            aria-label={`Löschen: ${title}`}
            disabled={deleting}
            onClick={onDelete}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#FF453A] active:bg-white/10 disabled:opacity-40"
          >
            <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          </PressableButton>
        ) : undefined
      }
    />
  );
}
