"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Receipt,
  ShieldCheck,
  Stamp,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { deleteDocument } from "@/actions/delete-document";
import { showSavedToast } from "@/lib/ui/saved-toast";
import { ListSearchControls } from "@/components/documents/list-search-controls";
import { VehicleDataDisclaimer } from "@/components/documents/vehicle-data-disclaimer";
import { VehicleInvoicesView } from "@/components/documents/vehicle-invoices-view";
import { DashboardScanFab } from "@/components/tags/dashboard-scan-fab";
import {
  AutomotiveEmptyPanel,
  AutomotiveList,
  AutomotiveListRow,
} from "@/components/ui/automotive";
import {
  IOS_LINK,
  IOSFilterChips,
  IOSListPage,
  type IconBadgeTone,
} from "@/components/ui/ios";
import { cn } from "@/lib/utils";
import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { approvalKindLabel } from "@/lib/documents/approval-fields";
import { displayAbeDocumentTitle } from "@/lib/documents/abe-title";
import { documentDeleteConfirmMessage } from "@/lib/documents/constants";
import {
  displayDocumentTitle,
  documentTypeLabel,
  filterDocumentsByType,
  formatDocumentAmount,
  formatDocumentDate,
  sumInvoiceAmounts,
} from "@/lib/documents/format";
import type { InvoiceListCategory } from "@/lib/documents/invoice-categories";
import {
  matchesSearchQuery,
} from "@/lib/documents/list-search";
import {
  filterDocumentsByVaultCategory,
  isVaultDocument,
  VAULT_FILTER_CHIPS,
  vaultCategoryLabel,
  vaultDocumentKindLabel,
  resolveVaultDocumentKind,
} from "@/lib/documents/vault-documents";
import type { VaultCategory } from "@/lib/validations/vaultClassificationSchema";
import { isScanFabLocked } from "@/lib/billing/ai-scan-access";
import { documentDetailHref } from "@/lib/vehicle-surface/documents-list-href";
import {
  garagePathForVehicle,
  isVehicleId,
  vehicleSurfaceHref,
} from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import type { Document, DocumentType } from "@/types/database";

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

interface VehicleDocumentsViewProps {
  tagUuid: string;
  vehicleSurfaceScope?: VehicleSurfaceScope;
  vehicleId: string;
  vehicleLabel: string;
  /** Short model label for invoice overview (e.g. RX-8). */
  vehicleModel?: string;
  documents: Document[];
  filterType?: DocumentType | "all";
  /** When "all", type chips filter client-side without a server round-trip. */
  documentsScope?: "all" | "filtered";
  /** Owner-only delete actions (Pro). */
  canWrite?: boolean;
  /** Floating scan CTA — available without Pro when free scan quota remains. */
  canScan?: boolean;
  membershipActive?: boolean;
  freeInvoiceScanRemaining?: number;
  freeAbeScanRemaining?: number;
  /** Prefill invoice category chip when showing Belege. */
  invoiceCategory?: InvoiceListCategory | "all";
}

/** ABE list FAB always opens the guided ABE Hunter (`scanType=abe`). Vault is a separate scan intent. */
function abeDocumentsScanType(): "abe" {
  return "abe";
}

function ownerScanEntryHref(
  vehicleSurfaceScope: VehicleSurfaceScope | undefined,
  tagUuid: string,
  scanTypeParam?: string | null,
): string {
  const qs = scanTypeParam
    ? `?scan=1&type=${encodeURIComponent(scanTypeParam)}`
    : "?scan=1";
  if (vehicleSurfaceScope) {
    return vehicleSurfaceHref(vehicleSurfaceScope, qs);
  }
  return `/v/${tagUuid}${qs}`;
}

const FILTERS: Array<{ id: DocumentType | "all"; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "invoice", label: "Rechnungen" },
  { id: "abe", label: "ABE & Gutachten" },
  { id: "tuev", label: "TÜV" },
  { id: "other", label: "Andere" },
];

export function VehicleDocumentsView({
  tagUuid,
  vehicleSurfaceScope,
  vehicleId,
  vehicleLabel,
  vehicleModel,
  documents,
  filterType = "all",
  documentsScope = "filtered",
  canWrite = false,
  canScan,
  membershipActive = false,
  freeInvoiceScanRemaining = 0,
  freeAbeScanRemaining = 0,
  invoiceCategory = "all",
}: VehicleDocumentsViewProps) {
  const showScanFab = canScan ?? canWrite;
  const router = useRouter();
  const [activeType, setActiveType] = useState(filterType);
  const abeScanType =
    activeType === "abe"
      ? abeDocumentsScanType()
      : activeType === "tuev"
        ? "tuev"
        : null;
  const path = (segment?: string) =>
    surfacePath(vehicleSurfaceScope, tagUuid, segment);

  useEffect(() => {
    setActiveType(filterType);
  }, [filterType]);

  function typeFilterHref(id: DocumentType | "all"): string {
    return id === "all"
      ? path("dokumente")
      : `${path("dokumente")}?type=${id}`;
  }

  function onTypeFilterChange(id: DocumentType | "all") {
    if (id === activeType) return;
    const href = typeFilterHref(id);
    if (documentsScope === "all") {
      setActiveType(id);
      window.history.replaceState(null, "", href);
      return;
    }
    router.push(href);
  }

  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [vaultCategoryId, setVaultCategoryId] = useState<VaultCategory | "all">(
    "all",
  );

  const typed = useMemo(
    () => filterDocumentsByType(documents, activeType),
    [documents, activeType],
  );

  const vaultCategoryChips = useMemo(() => {
    if (activeType !== "abe") return [];
    const counts = new Map<VaultCategory | "all", number>();
    counts.set("all", typed.length);
    for (const doc of typed) {
      if (!isVaultDocument(doc)) continue;
      const category = doc.part_category as VaultCategory | null;
      if (category) {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }
    return VAULT_FILTER_CHIPS.map((chip) => ({
      ...chip,
      count: counts.get(chip.id) ?? 0,
    })).filter((chip) => chip.id === "all" || (chip.count ?? 0) > 0);
  }, [activeType, typed]);

  const { filtered, filterBaseCount } = useMemo(() => {
    const byVaultCategory =
      activeType === "abe" && vaultCategoryId !== "all"
        ? filterDocumentsByVaultCategory(typed, vaultCategoryId)
        : typed;

    const result = byVaultCategory.filter((doc) =>
      matchesSearchQuery(
        query,
        doc.title,
        doc.manufacturer,
        doc.vendor,
        doc.part_category,
        vaultCategoryLabel(doc),
        vaultDocumentKindLabel(doc),
        doc.kba_number,
        doc.authority,
        doc.notes,
        doc.category,
        documentTypeLabel(doc.type),
        approvalKindLabel(doc.approval_fields),
        ...(doc.vehicle_approvals ?? []),
      ),
    );

    return { filtered: result, filterBaseCount: byVaultCategory.length };
  }, [typed, activeType, vaultCategoryId, query]);

  const invoiceSum = sumInvoiceAmounts(
    activeType === "all"
      ? documents.filter((doc) => doc.type === "invoice")
      : [],
  );

  const searchResultLabel =
    filtered.length === filterBaseCount && !query.trim()
      ? undefined
      : `${filtered.length} von ${filterBaseCount} Treffern`;

  const typeFilterPills =
    activeType === "abe"
      ? FILTERS.filter((filter) => filter.id !== "invoice")
      : FILTERS;

  if (activeType === "invoice") {
    return (
      <VehicleInvoicesView
        tagUuid={tagUuid}
        vehicleSurfaceScope={vehicleSurfaceScope}
        vehicleModel={vehicleModel?.trim() || vehicleLabel.split("·")[0]?.trim() || vehicleLabel}
        documents={documents}
        canScan={showScanFab}
        canWrite={canWrite}
        initialCategory={invoiceCategory}
        membershipActive={membershipActive}
        freeInvoiceScanRemaining={freeInvoiceScanRemaining}
        freeAbeScanRemaining={freeAbeScanRemaining}
      />
    );
  }

  function handleDelete(document: Document) {
    if (!canWrite) return;
    const title =
      document.type === "abe"
        ? displayAbeDocumentTitle(document)
        : displayDocumentTitle(document.title);
    const deleteType =
      document.type === "tuev" || document.approval_fields?.kind === "tuev"
        ? "tuev"
        : document.type;
    if (!window.confirm(documentDeleteConfirmMessage(deleteType, title))) return;

    setError(null);
    setPendingId(document.id);
    startTransition(async () => {
      const result = await deleteDocument({
        documentId: document.id,
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

  const scanActionLabel =
    activeType === "abe"
      ? abeScanType === "abe"
        ? "ABE scannen"
        : "Gutachten scannen"
      : activeType === "tuev"
        ? "TÜV scannen"
        : "Dokument scannen";

  const scanFab = showScanFab ? (
    <DashboardScanFab
      tagUuid={tagUuid}
      directAction="menu"
      menuTitle="Dokument hinzufügen"
      fuelLogHref={surfacePath(vehicleSurfaceScope, tagUuid, "tanken")}
      manualEntryHref={`${surfacePath(vehicleSurfaceScope, tagUuid, "umbauten")}?neu=1`}
      manualActionLabel="Manueller Eintrag"
      manualActionDescription="Umbau, Service oder Notiz ohne Scan"
      scanHref={ownerScanEntryHref(vehicleSurfaceScope, tagUuid, abeScanType)}
      scanLocked={isScanFabLocked(
        membershipActive,
        freeInvoiceScanRemaining,
        freeAbeScanRemaining,
        abeScanType,
      )}
      scanActionLabel={scanActionLabel}
    />
  ) : null;

  return (
    <IOSListPage
      title={PAGE_TITLES[activeType] ?? DEFAULT_PAGE_TITLE}
      subtitle={
        invoiceSum > 0
          ? `Rechnungen ${formatDocumentAmount(invoiceSum)}`
          : `${typed.length} Dokumente`
      }
      backHref={path()}
      overlay={scanFab}
    >
      <IOSFilterChips
        chips={typeFilterPills}
        activeId={activeType}
        onChange={onTypeFilterChange}
        ariaLabel="Dokumentfilter"
      />

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-500/15 px-4 py-3 text-[15px] text-red-400"
        >
          {error}
        </p>
      ) : null}

      <ListSearchControls
        query={query}
        onQueryChange={setQuery}
        placeholder={
          activeType === "abe"
            ? "Teil, Kategorie, Hersteller, KBA"
            : activeType === "tuev"
              ? "Prüfstelle, Titel, Notiz"
              : "Titel, Hersteller, Kategorie"
        }
        chips={
          activeType === "abe" && vaultCategoryChips.length > 1
            ? vaultCategoryChips
            : undefined
        }
        activeChipId={vaultCategoryId}
        onChipChange={(id) => setVaultCategoryId(id as VaultCategory | "all")}
        resultLabel={searchResultLabel}
      />

      <section aria-label="Dokumentliste">
        {filtered.length === 0 ? (
          <AutomotiveEmptyPanel>
            {typed.length > 0 &&
            (query.trim() ||
              (activeType === "abe" && vaultCategoryId !== "all")) ? (
              "Keine Treffer für diese Suche / Filter."
            ) : activeType === "abe" ? (
              <div className="space-y-2">
                <p className="font-semibold text-white">
                  Noch kein Gutachten hinterlegt.
                </p>
                <p>
                  Hier gehören ABE, Teilegutachten und Einzelabnahmen hin. Pro
                  Scan immer nur ein Bauteil — bitte alle Seiten des Dokuments
                  scannen.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-semibold text-white">
                  Noch keine Dokumente in dieser Kategorie.
                </p>
                {!canWrite ? (
                  <p>
                    Manuelle Einträge kannst du jederzeit kostenlos anlegen —{" "}
                    <PressableLink
                      href={`${path("umbauten")}?neu=1`}
                      className={cn("font-medium", IOS_LINK)}
                    >
                      jetzt eintragen
                    </PressableLink>
                    . KI-Scan und neue Uploads sind Teil von Pro.
                  </p>
                ) : null}
              </div>
            )}
          </AutomotiveEmptyPanel>
        ) : (
          <AutomotiveList aria-label="Dokumentliste">
            {filtered.map((doc) => (
              <DocumentRow
                key={doc.id}
                detailHref={documentDetailHref(tagUuid, doc.id, vehicleSurfaceScope)}
                document={doc}
                canDelete={canWrite}
                deleting={pending && pendingId === doc.id}
                onDelete={() => handleDelete(doc)}
              />
            ))}
          </AutomotiveList>
        )}
      </section>

      <VehicleDataDisclaimer />
    </IOSListPage>
  );
}

const DEFAULT_PAGE_TITLE = "Dokumente";

const PAGE_TITLES: Partial<Record<DocumentType | "all", string>> = {
  abe: "ABE & Gutachten",
  tuev: "TÜV / HU",
};

const DOCUMENT_ICON: Record<DocumentType, { icon: LucideIcon; tone: IconBadgeTone }> = {
  invoice: { icon: Receipt, tone: "blue" },
  abe: { icon: Stamp, tone: "purple" },
  tuev: { icon: ShieldCheck, tone: "green" },
  other: { icon: FileText, tone: "neutral" },
};

function documentTypeMetaLabel(document: Document): string {
  if (document.type === "abe" && isVaultDocument(document)) {
    const kind = resolveVaultDocumentKind(document);
    const kindLabel =
      kind && kind !== "abe" ? vaultDocumentKindLabel(document) : null;
    return ["Gutachten Tresor", kindLabel, vaultCategoryLabel(document)]
      .filter(Boolean)
      .join(" · ");
  }
  if (document.type === "abe") return approvalKindLabel(document.approval_fields);
  if (document.type === "tuev" && document.approval_fields?.kind === "tuev") {
    return approvalKindLabel(document.approval_fields);
  }
  return documentTypeLabel(document.type);
}

/** Leftover maker/model when the ABE title ("Hersteller Modell") doesn't already contain it. */
function documentSubtitle(document: Document, listTitle: string): string | null {
  if (document.type === "invoice") return document.vendor?.trim() || null;
  if (document.type !== "abe") return null;
  const manufacturer = document.manufacturer?.trim() || "";
  const model = document.vendor?.trim() || "";
  if (
    manufacturer &&
    !listTitle.toLowerCase().startsWith(manufacturer.toLowerCase())
  ) {
    return manufacturer;
  }
  if (model && !listTitle.toLowerCase().includes(model.toLowerCase())) {
    return model;
  }
  return null;
}

function DocumentRow({
  detailHref,
  document,
  canDelete: allowDelete,
  deleting,
  onDelete,
}: {
  detailHref: string;
  document: Document;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const fileUrl = document.file_url ?? "";
  const isMock = fileUrl.startsWith("mock://");
  const canDelete = allowDelete && (isMock || !fileUrl.startsWith("/demo/"));
  const lineCount = document.line_items?.length ?? 0;
  const approvalCount = document.vehicle_approvals?.length ?? 0;
  const { icon, tone } = DOCUMENT_ICON[document.type] ?? DOCUMENT_ICON.other;

  const listTitle =
    document.type === "abe" && !isVaultDocument(document)
      ? displayAbeDocumentTitle(document)
      : displayDocumentTitle(document.title);
  const meta = [
    documentSubtitle(document, listTitle),
    documentTypeMetaLabel(document),
    formatDocumentDate(document.date),
    document.type === "invoice" && lineCount > 0 ? `${lineCount} Positionen` : null,
    document.type === "abe" ? document.kba_number : null,
    document.type === "abe" && approvalCount > 0 ? `${approvalCount} Freigaben` : null,
    isMock ? "Demo (keine Datei)" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <AutomotiveListRow
      href={detailHref}
      icon={icon}
      iconTone={tone}
      title={listTitle}
      amount={formatDocumentAmount(document.amount) ?? undefined}
      meta={meta}
      accessory={
        canDelete ? (
          <PressableButton
            type="button"
            variant="button"
            aria-label={`Löschen: ${listTitle}`}
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
