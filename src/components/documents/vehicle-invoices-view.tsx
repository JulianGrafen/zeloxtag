"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, Receipt, Upload } from "lucide-react";

import { ListSearchControls } from "@/components/documents/list-search-controls";
import { ProductFeaturesBanner } from "@/components/onboarding/product-features-banner";
import { VehicleDataDisclaimer } from "@/components/documents/vehicle-data-disclaimer";
import { DashboardScanFab } from "@/components/tags/dashboard-scan-fab";
import {
  AutomotiveEmptyPanel,
  AutomotiveList,
  AutomotiveListRow,
  AutomotiveSectionLabel,
} from "@/components/ui/automotive";
import {
  IOS_LINK,
  IOSListPage,
  InsetGroupedCard,
  InsetListRow,
  type IconBadgeTone,
} from "@/components/ui/ios";
import { cn } from "@/lib/utils";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import {
  displayDocumentTitle,
  formatDocumentAmount,
  formatDocumentDateCompact,
  sumInvoiceAmounts,
} from "@/lib/documents/format";
import { filterInvoiceReceiptDocuments } from "@/lib/documents/invoice-receipts";
import {
  INVOICE_LIST_CATEGORIES,
  INVOICE_LIST_CATEGORY_LABELS,
  resolveInvoiceListCategory,
  type InvoiceListCategory,
} from "@/lib/documents/invoice-categories";
import { formatIsoMonthKeyLabel } from "@/lib/dates/german-calendar";
import {
  groupByIsoMonthKeyDesc,
  isoMonthKeyFromIsoTimestamp,
} from "@/lib/documents/group-by-iso-month";
import { matchesSearchQuery } from "@/lib/documents/list-search";
import { resolveInvoicePaymentBadge } from "@/lib/documents/payment-status";
import { isScanFabLocked } from "@/lib/billing/ai-scan-access";
import { documentDetailHref } from "@/lib/vehicle-surface/documents-list-href";
import {
  garagePathForVehicle,
  isVehicleId,
  vehicleSurfaceHref,
} from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
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

interface VehicleInvoicesViewProps {
  tagUuid: string;
  vehicleSurfaceScope?: VehicleSurfaceScope;
  vehicleModel: string;
  documents: Document[];
  /** Show floating scan CTA (owner / Schrauber). */
  canScan?: boolean;
  /** @deprecated Use canScan — kept for callers that still pass canWrite. */
  canWrite?: boolean;
  /** Prefill category chip (e.g. "repair" for Reparaturen). */
  initialCategory?: InvoiceListCategory | "all";
  membershipActive?: boolean;
  freeInvoiceScanRemaining?: number;
  freeAbeScanRemaining?: number;
}

function ownerScanEntryHref(
  vehicleSurfaceScope: VehicleSurfaceScope | undefined,
  tagUuid: string,
  scanTypeParam: string,
): string {
  const qs = `?scan=1&type=${encodeURIComponent(scanTypeParam)}`;
  if (vehicleSurfaceScope) {
    return vehicleSurfaceHref(vehicleSurfaceScope, qs);
  }
  return `/v/${tagUuid}${qs}`;
}

const ALL_CHIP = "all";

/** Isolated so the list can SSR/hydrate without suspending the whole Belege view. */
function VehicleInvoicesUrlQuerySync({
  onSaved,
  onHighlight,
}: {
  onSaved: () => void;
  onHighlight: (documentId: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("saved") === "1") {
      onSaved();
    }
    const highlight = searchParams.get("highlight")?.trim();
    if (highlight) {
      onHighlight(highlight);
    }
  }, [searchParams, onSaved, onHighlight]);

  return null;
}

function invoiceLineItemSearchText(
  lineItems: Document["line_items"],
): string {
  if (!lineItems?.length) return "";
  return lineItems
    .map((item) => {
      if (typeof item.label === "string" && item.label.trim()) {
        return item.label;
      }
      const legacy = item as { name?: string; description?: string };
      return legacy.name?.trim() || legacy.description?.trim() || "";
    })
    .filter(Boolean)
    .join(" ");
}

function VehicleInvoicesViewContent({
  tagUuid,
  vehicleSurfaceScope,
  vehicleModel,
  documents,
  canScan,
  canWrite = false,
  initialCategory = "all",
  membershipActive = false,
  freeInvoiceScanRemaining = 0,
  freeAbeScanRemaining = 0,
}: VehicleInvoicesViewProps) {
  const showScanFab = canScan ?? canWrite;
  const path = (segment?: string) =>
    surfacePath(vehicleSurfaceScope, tagUuid, segment);
  const manualUploadHref = `${path("hochladen")}?mode=manual&type=invoice`;
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>(initialCategory);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const onSavedQuery = useCallback(() => {
    setCategoryId(ALL_CHIP);
  }, []);

  const onHighlightQuery = useCallback((documentId: string) => {
    setHighlightId(documentId);
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const invoices = useMemo(
    () =>
      filterInvoiceReceiptDocuments(documents).slice().sort((a, b) => {
          const aDate = a.date ?? a.created_at;
          const bDate = b.date ?? b.created_at;
          return bDate.localeCompare(aDate);
        }),
    [documents],
  );

  const categoryChips = useMemo(() => {
    const counts = Object.fromEntries(
      INVOICE_LIST_CATEGORIES.map((id) => [id, 0]),
    ) as Record<InvoiceListCategory, number>;
    for (const doc of invoices) {
      counts[resolveInvoiceListCategory(doc.category)] += 1;
    }
    return [
      { id: ALL_CHIP, label: "Alle", count: invoices.length },
      ...INVOICE_LIST_CATEGORIES.map((id) => ({
        id,
        label: INVOICE_LIST_CATEGORY_LABELS[id],
        count: counts[id],
      })),
    ];
  }, [invoices]);

  const visible = useMemo(() => {
    return invoices.filter((doc) => {
      const resolved = resolveInvoiceListCategory(doc.category);
      if (categoryId !== ALL_CHIP && resolved !== categoryId) return false;
      const lineLabels = invoiceLineItemSearchText(doc.line_items);
      return matchesSearchQuery(
        query,
        doc.title,
        doc.vendor,
        doc.invoice_number,
        doc.notes,
        doc.category,
        INVOICE_LIST_CATEGORY_LABELS[resolved],
        lineLabels,
      );
    });
  }, [invoices, categoryId, query]);

  const groupedVisible = useMemo(
    () =>
      groupByIsoMonthKeyDesc(visible, (doc) =>
        isoMonthKeyFromIsoTimestamp(doc.date ?? doc.created_at),
      ),
    [visible],
  );

  const total = sumInvoiceAmounts(visible);
  const totalLabel = formatDocumentAmount(total) ?? "0,00 €";
  const searchResultLabel =
    !query.trim() && visible.length === invoices.length
      ? undefined
      : `${visible.length} von ${invoices.length} Belegen`;

  const heading =
    categoryId === "repair" && !query.trim()
      ? "Reparaturen"
      : "Rechnungen & Belege";

  const scanFab = showScanFab ? (
    <DashboardScanFab
      tagUuid={tagUuid}
      directAction="menu"
      menuTitle="Beleg hinzufügen"
      hideFuelAction
      manualEntryHref={manualUploadHref}
      manualActionLabel="Manuell hinzufügen"
      manualActionDescription="PDF oder Foto ohne KI-Scan hochladen"
      scanHref={ownerScanEntryHref(
        vehicleSurfaceScope,
        tagUuid,
        categoryId === "repair" ? "repair" : "invoice",
      )}
      scanLocked={isScanFabLocked(
        membershipActive,
        freeInvoiceScanRemaining,
        freeAbeScanRemaining,
        categoryId === "repair" ? "repair" : "invoice",
      )}
      scanActionLabel={
        categoryId === "repair" ? "Reparatur scannen" : "Rechnung scannen"
      }
    />
  ) : null;

  return (
    <IOSListPage
      title={heading}
      subtitle={`Summe ${totalLabel}`}
      backHref={path("")}
      overlay={scanFab}
    >
      <Suspense fallback={null}>
        <VehicleInvoicesUrlQuerySync
          onSaved={onSavedQuery}
          onHighlight={onHighlightQuery}
        />
      </Suspense>

      {showScanFab ? (
        <ProductFeaturesBanner
          discoverHref={path("entdecken")}
          costsHref={path("dokumente/kosten")}
          active
        />
      ) : null}

      {canWrite || invoices.length > 0 ? (
        <InsetGroupedCard>
          {canWrite ? (
            <InsetListRow
              href={manualUploadHref}
              icon={Upload}
              iconTone="amber"
              emphasis="navigation"
              label="Beleg manuell hinzufügen"
            />
          ) : null}
          {invoices.length > 0 ? (
            <InsetListRow
              href={path("dokumente/kosten")}
              icon={BarChart3}
              iconTone="blue"
              emphasis="navigation"
              label="Kostenübersicht"
            />
          ) : null}
        </InsetGroupedCard>
      ) : null}

      <ListSearchControls
        query={query}
        onQueryChange={setQuery}
        placeholder="Werkstatt, Titel, Position, Rechnungsnr."
        chips={categoryChips}
        activeChipId={categoryId}
        onChipChange={setCategoryId}
        resultLabel={searchResultLabel}
      />

      <section aria-label="Belegliste" className="space-y-6">
        {invoices.length === 0 ? (
          <AutomotiveEmptyPanel>
            Noch keine Rechnungen. Scanne deinen ersten Beleg
            {canWrite ? (
              <>
                {" "}
                oder{" "}
                <PressableLink
                  href={manualUploadHref}
                  className={cn("font-medium", IOS_LINK)}
                >
                  lade einen Beleg hoch
                </PressableLink>
                .
              </>
            ) : (
              "."
            )}
          </AutomotiveEmptyPanel>
        ) : visible.length === 0 ? (
          <AutomotiveEmptyPanel>
            Keine Treffer für diese Suche / Filter.
          </AutomotiveEmptyPanel>
        ) : (
          groupedVisible.map(({ monthKey, items: monthDocs }) => (
            <div key={monthKey}>
              <AutomotiveSectionLabel>
                {formatIsoMonthKeyLabel(monthKey)}
              </AutomotiveSectionLabel>
              <AutomotiveList
                aria-label={`Belege ${formatIsoMonthKeyLabel(monthKey)}`}
              >
                {monthDocs.map((doc) => (
                  <InvoiceListRow
                    key={doc.id}
                    document={doc}
                    href={documentDetailHref(
                      tagUuid,
                      doc.id,
                      vehicleSurfaceScope,
                    )}
                    highlighted={highlightId === doc.id}
                  />
                ))}
              </AutomotiveList>
            </div>
          ))
        )}
      </section>

      <VehicleDataDisclaimer />
    </IOSListPage>
  );
}

const CATEGORY_ICON_TONE: Record<InvoiceListCategory, IconBadgeTone> = {
  repair: "amber",
  service: "blue",
  tuning: "purple",
  other: "neutral",
};

function InvoiceListRow({
  document,
  href,
  highlighted,
}: {
  document: Document;
  href: string;
  highlighted: boolean;
}) {
  const category = resolveInvoiceListCategory(document.category);
  const vendor = document.vendor?.trim() || "Unbekannter Anbieter";
  const issued = formatDocumentDateCompact(document.date);
  const paymentBadge = resolveInvoicePaymentBadge(document);

  return (
    <AutomotiveListRow
      className={highlighted ? "bg-emerald-500/10" : undefined}
      href={href}
      icon={Receipt}
      iconTone={CATEGORY_ICON_TONE[category]}
      title={displayDocumentTitle(document.title)}
      amount={formatDocumentAmount(document.amount) ?? undefined}
      meta={`${vendor} · ${issued} · ${INVOICE_LIST_CATEGORY_LABELS[category]}`}
      badge={
        paymentBadge ? (
          <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
            {paymentBadge}
          </span>
        ) : undefined
      }
    />
  );
}

/** Invoice overview matching the "Rechnungen & Belege" dashboard mock. */
export function VehicleInvoicesView(props: VehicleInvoicesViewProps) {
  return <VehicleInvoicesViewContent {...props} />;
}
