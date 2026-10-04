"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, BarChart3, Receipt, Upload } from "lucide-react";

import { ListSearchControls } from "@/components/documents/list-search-controls";
import { ProductFeaturesBanner } from "@/components/onboarding/product-features-banner";
import { VehicleDataDisclaimer } from "@/components/documents/vehicle-data-disclaimer";
import { DashboardScanFab } from "@/components/tags/dashboard-scan-fab";
import {
  AutomotiveEmptyPanel,
  AutomotiveList,
  AutomotiveListRow,
  AutomotiveSectionLabel,
  AutomotiveSummaryPanel,
  automotiveSecondaryButtonClassName,
} from "@/components/ui/automotive";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import {
  displayDocumentTitle,
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
import { matchesSearchQuery } from "@/lib/documents/list-search";
import { resolveInvoicePaymentBadge } from "@/lib/documents/payment-status";
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
}

const ALL_CHIP = "all";

function VehicleInvoicesViewContent({
  tagUuid,
  vehicleSurfaceScope,
  vehicleModel,
  documents,
  canScan,
  canWrite = false,
  initialCategory = "all",
}: VehicleInvoicesViewProps) {
  const showScanFab = canScan ?? canWrite;
  const path = (segment?: string) =>
    surfacePath(vehicleSurfaceScope, tagUuid, segment);
  const manualUploadHref = `${path("hochladen")}?mode=manual&type=invoice`;
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>(initialCategory);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("saved") === "1") {
      setCategoryId(ALL_CHIP);
    }
    const highlight = searchParams.get("highlight")?.trim();
    if (highlight) {
      setHighlightId(highlight);
    }
  }, [searchParams]);

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
      const lineLabels =
        doc.line_items?.map((item) => item.label).join(" ") ?? "";
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

  const total = sumInvoiceAmounts(visible);
  const searchResultLabel =
    visible.length === invoices.length
      ? undefined
      : `${visible.length} von ${invoices.length} Belegen`;

  const heading =
    categoryId === "repair" && !query.trim()
      ? "Reparaturen"
      : "Rechnungen & Belege";

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        {showScanFab ? (
          <ProductFeaturesBanner
            discoverHref={path("entdecken")}
            costsHref={path("dokumente/kosten")}
            active
          />
        ) : null}

        <header className="vd-anim-header space-y-4">
          <PressableLink
            href={path("")}
            variant="pill"
            className="vd-back-pill"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Zurück
          </PressableLink>

          <AutomotiveSummaryPanel
            title={heading}
            metric={`Summe ${formatEur(total)}`}
          >
            {canWrite ? (
              <PressableLink
                href={manualUploadHref}
                variant="button"
                className={`${automotiveSecondaryButtonClassName} mt-4`}
              >
                <Upload className="h-4 w-4 text-amber-300" aria-hidden />
                Beleg manuell hinzufügen
              </PressableLink>
            ) : null}
            {invoices.length > 0 ? (
              <PressableLink
                href={path("dokumente/kosten")}
                variant="button"
                className={`${automotiveSecondaryButtonClassName} mt-3`}
              >
                <BarChart3 className="h-4 w-4 text-amber-300" aria-hidden />
                Kostenübersicht
              </PressableLink>
            ) : null}
          </AutomotiveSummaryPanel>
        </header>

        <ListSearchControls
          query={query}
          onQueryChange={setQuery}
          placeholder="Werkstatt, Titel, Position, Rechnungsnr…"
          chips={categoryChips}
          activeChipId={categoryId}
          onChipChange={setCategoryId}
          resultLabel={searchResultLabel}
        />

        <section aria-label="Belegliste" className="space-y-2">
          <AutomotiveSectionLabel>Belegliste</AutomotiveSectionLabel>

          {invoices.length === 0 ? (
            <AutomotiveEmptyPanel>
              Noch keine Rechnungen. Scanne deinen ersten Beleg
              {canWrite ? (
                <>
                  {" "}
                  oder{" "}
                  <PressableLink
                    href={manualUploadHref}
                    className="font-medium text-[color:var(--vd-text)] underline decoration-[color:var(--vd-border)] underline-offset-4"
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
            <AutomotiveList aria-label="Belege">
              {visible.map((doc, index) => {
                const amount =
                  typeof doc.amount === "number" ? formatEur(doc.amount) : null;
                const vendor = doc.vendor?.trim() || "Unbekannter Anbieter";
                const issued = formatDocumentDateCompact(doc.date);
                const categoryLabel =
                  INVOICE_LIST_CATEGORY_LABELS[
                    resolveInvoiceListCategory(doc.category)
                  ];
                const paymentBadge = resolveInvoicePaymentBadge(doc);

                return (
                  <AutomotiveListRow
                    key={doc.id}
                    className={
                      highlightId === doc.id
                        ? "bg-emerald-500/8 ring-1 ring-inset ring-emerald-500/25"
                        : undefined
                    }
                    href={documentDetailHref(
                      tagUuid,
                      doc.id,
                      vehicleSurfaceScope,
                    )}
                    icon={Receipt}
                    title={displayDocumentTitle(doc.title)}
                    amount={amount ?? undefined}
                    meta={`${vendor} · ${issued} · ${categoryLabel}`}
                    badge={
                      paymentBadge ? (
                        <span className="inline-flex rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-emerald-400">
                          {paymentBadge}
                        </span>
                      ) : undefined
                    }
                    showDivider={index < visible.length - 1}
                  />
                );
              })}
            </AutomotiveList>
          )}
        </section>

        <VehicleDataDisclaimer />
      </div>

      {showScanFab ? (
        <DashboardScanFab
          tagUuid={tagUuid}
          scanHref={
            categoryId === "repair"
              ? `${path()}?scan=1&type=repair`
              : `${path()}?scan=1&type=invoice`
          }
          scanLabel={
            categoryId === "repair" ? "Reparatur scannen" : "Rechnung scannen"
          }
        />
      ) : null}
    </div>
  );
}

/** Invoice overview matching the "Rechnungen & Belege" dashboard mock. */
export function VehicleInvoicesView(props: VehicleInvoicesViewProps) {
  return (
    <Suspense fallback={null}>
      <VehicleInvoicesViewContent {...props} />
    </Suspense>
  );
}
