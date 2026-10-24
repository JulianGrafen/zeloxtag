"use client";

import { useCallback, useMemo, type ReactNode } from "react";

import { VehicleDashboard } from "@/components/vehicle-dashboard";
import { buildDefaultTiles } from "@/components/vehicle-dashboard/buildDefaultTiles";
import {
  FEATURE,
  featureForDashboardTile,
  isProOnlyFeature,
  type FeatureFlag,
} from "@/lib/permissions/feature-access";
import type { Document, Vehicle } from "@/types/database";

import { filterOilChangeDocuments, isOilChangeDocument } from "@/lib/documents/oil-changes";
import { serviceHistoryFromData } from "@/lib/service/merge-service-history";
import { buildServiceMaintenanceTileMeta } from "@/lib/service/service-due-priority";
import type { ServiceRecordRow } from "@/types/database";
import { latestKnownMileageKm } from "@/lib/vehicles/mileage-velocity";
import { filterAbeFamilyDocuments } from "@/lib/documents/abe-family-documents";
import { filterInvoiceReceiptDocuments, isInvoiceReceiptDocument } from "@/lib/documents/invoice-receipts";
import { bilderLabel, dokumenteLabel, belegeLabel } from "@/lib/i18n/pluralize-de";
import {
  filterManualVehicleEntries,
} from "@/lib/documents/manual-entries";
import { isViewableDocumentUrl } from "@/lib/documents/viewable-url";
import { filterServiceInspectionDocuments } from "@/lib/documents/service-inspections";
import { deriveNextInspectionFromDocuments } from "@/lib/documents/tuev-schedule";
import { formatBuildDiscoverDashboardSubtitle } from "@/lib/showcase/build-discover-dashboard-subtitle";
import { resolveDocumentAmount } from "@/lib/vehicles/expose-data";
import { buildTimelineFromDocuments } from "@/services/timeline";
import type { TimelineEvent } from "@/lib/validations/timelineSchema";
import {
  countFilledTechSpecs,
  parseVehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";
import { resolveVehicleCatalogImage, resolveVehicleImage } from "@/lib/vehicles/vehicle-image";
import {
  formatMonthlyAverageLabel,
} from "@/lib/vehicles/operating-costs/summary";
import type { OperatingCostDashboardHint } from "@/lib/vehicles/operating-costs/types";
import {
  DEMO_SHOWCASE_VEHICLE_IMAGE,
  isDemoActiveTag,
} from "@/lib/tags/demo-showcase";

import { HardwareUpsellWidget } from "@/components/hardware/hardware-upsell-widget";
import { GarageSwitcherTile } from "@/components/garage/garage-switcher-tile";
import { ProductFeaturesBanner } from "@/components/onboarding/product-features-banner";

import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

import { DashboardScanFab } from "./dashboard-scan-fab";

function dashboardPath(
  scope: VehicleSurfaceScope | undefined,
  tagUuid: string,
  segment: string,
): string {
  if (scope) {
    return vehicleSurfaceHref(scope, segment);
  }
  const normalized = segment.startsWith("/") ? segment : `/${segment}`;
  return `/v/${tagUuid}${normalized}`;
}

interface TagDashboardViewProps {
  vehicle: Vehicle;
  documents: Document[];
  tagUuid: string;
  vehicleSurfaceScope?: VehicleSurfaceScope;
  ownerName?: string | null;
  /** When false, hide the scan FAB (guest / wrong account). */
  canScan?: boolean;
  isOwner?: boolean;
  isContributor?: boolean;
  /** Superuser inventory minter — show tile linking to /qr. */
  showOperatorMinter?: boolean;
  /**
   * Showcase mode: all dashboard tiles link to tag routes; sub-pages load via
   * demo showcase access (read-only, no login).
   */
  demoMode?: boolean;
  /** Owner's ZeloxTag Pro is active — unlocks vault, scan, and exposé tiles. */
  cloudUnlocked?: boolean;
  /** One free KI invoice scan still available for the owner. */
  freeInvoiceScanRemaining?: number;
  /** One free KI ABE scan still available for the owner. */
  freeAbeScanRemaining?: number;
  /** Complimentary KI fuel receipt scans still available for the owner. */
  freeFuelScanRemaining?: number;
  onOpenScanner?: () => void;
  onOpenFuelScanner?: () => void;
  /** Hide the scan FAB while a photo sheet/modal is open. */
  hideScanFab?: boolean;
  /** Pro tile without href — open the action-based paywall. */
  onLockedFeature?: (feature: FeatureFlag, tileId?: string) => void;
  /** Demo / custom tiles without href (e.g. in-app Builds entdecken). */
  onDashboardTileClick?: (tileId: string) => void;
  /** Demo: subtitle for Builds entdecken tile (e.g. Build der Woche). */
  demoEntdeckenSubtitle?: string | null;
  /** Immediate header refresh after silhouette upload (same-origin display URL). */
  vehicleImageOverride?: string | null;
  /** Data URL / blob fallback when proxy fails to load. */
  previewFallbackUrl?: string | null;
  onSilhouetteProxyLoad?: () => void;
  /** Owner: unread build-swipe likes for badge on discover tile. */
  showcaseSwipeUnreadLikes?: number;
  showcaseSwipeTotalLikes?: number;
  /** One-time neue Features (Swipe, Kostenübersicht). */
  productFeaturesBannerActive?: boolean;
  /** Owner-only Betriebskosten for dashboard tile subtitles. */
  operatingCostHint?: OperatingCostDashboardHint | null;
  buildPlannerHint?: { subtitle: string } | null;
  /** Digital garage without linked hardware tag — V4A upsell + link CTA. */
  showTagShopPromo?: boolean;
  tagShopUserId?: string;
  tagShopUserEmail?: string | null;
  /** Server-loaded timeline (parity with /historie). Falls back to document-derived. */
  timelineEvents?: TimelineEvent[];
  /** Persisted service book rows (merged with document legacy at display time). */
  serviceRecordRows?: ServiceRecordRow[];
  /** Default Chronik tab (e.g. demo). */
  defaultDashboardTab?: "overview" | "timeline";
  /** Slot under Zelox wordmark (demo view switch). */
  belowBrandBanner?: ReactNode;
  /** Parent renders brand header (e.g. /demo sticky chrome). */
  hideBrandBanner?: boolean;
}

/**
 * Maps a claimed tag's vehicle into the existing dashboard presentation layer.
 */
export function TagDashboardView({
  vehicle,
  documents,
  tagUuid,
  vehicleSurfaceScope,
  ownerName,
  canScan = true,
  isOwner = true,
  isContributor = false,
  showOperatorMinter = false,
  demoMode = false,
  cloudUnlocked = true,
  freeInvoiceScanRemaining = 0,
  freeAbeScanRemaining = 0,
  freeFuelScanRemaining = 0,
  onOpenScanner,
  onOpenFuelScanner,
  hideScanFab = false,
  onLockedFeature,
  onDashboardTileClick,
  demoEntdeckenSubtitle = null,
  vehicleImageOverride,
  previewFallbackUrl,
  onSilhouetteProxyLoad,
  showcaseSwipeUnreadLikes = 0,
  showcaseSwipeTotalLikes = 0,
  productFeaturesBannerActive = true,
  operatingCostHint = null,
  showTagShopPromo = false,
  tagShopUserId,
  tagShopUserEmail = null,
  timelineEvents: timelineEventsProp,
  serviceRecordRows = [],
  defaultDashboardTab = "overview",
  belowBrandBanner,
  hideBrandBanner = false,
}: TagDashboardViewProps) {
  const manualEntryHref = `${dashboardPath(vehicleSurfaceScope, tagUuid, "umbauten")}?neu=1`;
  const path = (segment: string) =>
    dashboardPath(vehicleSurfaceScope, tagUuid, segment);
  const timelineEvents = useMemo(
    () =>
      timelineEventsProp ??
      buildTimelineFromDocuments(documents, "desc"),
    [timelineEventsProp, documents],
  );
  const resolveDocumentHref = useCallback(
    (documentId: string) => {
      const document = documents.find((doc) => doc.id === documentId);
      if (document && isOilChangeDocument(document)) {
        return dashboardPath(
          vehicleSurfaceScope,
          tagUuid,
          `intervalle/${documentId}`,
        );
      }
      return dashboardPath(
        vehicleSurfaceScope,
        tagUuid,
        `dokumente/${documentId}`,
      );
    },
    [documents, tagUuid, vehicleSurfaceScope],
  );
  const scanLocked =
    !cloudUnlocked &&
    freeInvoiceScanRemaining <= 0 &&
    freeAbeScanRemaining <= 0;
  const fuelScanLocked = !cloudUnlocked && freeFuelScanRemaining <= 0;
  const invoiceDocuments = filterInvoiceReceiptDocuments(documents);
  const invoiceCount = invoiceDocuments.length;
  const hasInvoiceAmounts = invoiceDocuments.some(
    (doc) => resolveDocumentAmount(doc) != null,
  );
  const abeCount = filterAbeFamilyDocuments(documents).length;
  const tuevCount = documents.filter((doc) => doc.type === "tuev").length;
  const serviceCount = filterServiceInspectionDocuments(documents).length;
  const manualEntries = filterManualVehicleEntries(documents);
  const manualEntryCount = manualEntries.length;
  const umbauCount = manualEntries.filter(
    (doc) =>
      doc.category === "tuning" && isViewableDocumentUrl(doc.file_url),
  ).length;
  const oilChangeCount = filterOilChangeDocuments(documents).length;
  const serviceHistory = useMemo(
    () =>
      serviceHistoryFromData({
        vehicleId: vehicle.id,
        documents,
        databaseRows: serviceRecordRows,
        techSpecs: vehicle.tech_specs,
      }),
    [vehicle.id, vehicle.tech_specs, documents, serviceRecordRows],
  );
  const serviceMaintenance = useMemo(
    () =>
      buildServiceMaintenanceTileMeta(serviceHistory, {
        currentMileageKm: latestKnownMileageKm(documents),
      }),
    [serviceHistory, documents],
  );
  const vehicleModel = `${vehicle.make} ${vehicle.model}`;
  const vinLabel = vehicle.vin ? `VIN ${vehicle.vin}` : "VIN nicht hinterlegt";
  const demoShowcase = isDemoActiveTag(tagUuid);
  const cutout = resolveVehicleImage({
    make: vehicle.make,
    model: vehicle.model,
    vehicleId: vehicle.id,
    silhouetteImageUrl: vehicle.silhouette_image_url,
    silhouetteCacheBust: vehicle.updated_at,
  });
  const catalogCutout = resolveVehicleCatalogImage(vehicle.make, vehicle.model);
  const hasOwnerSilhouette = Boolean(
    !demoShowcase &&
      (vehicleImageOverride || vehicle.silhouette_image_url?.trim()),
  );

  const data = {
    ownerName: ownerName?.trim() || "Fahrer",
    vehicleModel: `${vehicleModel} · ${vehicle.year}`,
    vehicleImage: demoShowcase
      ? DEMO_SHOWCASE_VEHICLE_IMAGE
      : vehicleImageOverride ?? cutout?.src,
    vehicleImageFallback: hasOwnerSilhouette
      ? undefined
      : demoMode
        ? catalogCutout?.src
        : undefined,
    vehicleImagePreviewFallback: demoShowcase
      ? undefined
      : previewFallbackUrl ?? undefined,
    vehicleImageFrameless:
      demoShowcase || (!hasOwnerSilhouette && Boolean(catalogCutout?.src)),
    vehicleImageAlt: cutout?.alt ?? catalogCutout?.alt ?? `${vehicleModel} (${vehicle.year})`,
    serviceMaintenance,
    nextInspection: deriveNextInspectionFromDocuments(documents),
    showcaseSwipeUnreadLikes,
  };

  const tiles = [
    ...buildDefaultTiles(data),
    ...(showOperatorMinter
      ? [
          {
            id: "operator-mint",
            title: "Tag minten",
            description: "QR für Gravur",
            icon: "grid" as const,
            tone: "accent" as const,
            featured: true,
            meta: {
              href: "/qr",
              subtitle: "Minter",
            },
          },
        ]
      : []),
  ].map((tile) => {
    if (tile.id === "invoices") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: `${path("dokumente")}?type=invoice`,
          subtitle:
            invoiceCount > 0
              ? hasInvoiceAmounts
                ? `${belegeLabel(invoiceCount)} · Kostenübersicht`
                : belegeLabel(invoiceCount)
              : !cloudUnlocked && freeInvoiceScanRemaining > 0
                ? "1× KI-Scan gratis"
                : "Leer",
        },
      };
    }

    if (tile.id === "abe") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: `${path("dokumente")}?type=abe`,
          subtitle:
            abeCount > 0
              ? dokumenteLabel(abeCount)
              : !cloudUnlocked && freeAbeScanRemaining > 0
                ? "1× KI-Scan gratis"
                : "Scannen",
        },
      };
    }

    if (tile.id === "tuv") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: `${path("dokumente")}?type=tuev`,
          subtitle:
            tuevCount > 0
              ? tile.meta?.subtitle
              : "Scannen",
        },
      };
    }

    if (tile.id === "service") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: path("service"),
          subtitle:
            serviceCount > 0
              ? `${serviceCount} Einträge`
              : "Scannen",
        },
      };
    }

    if (tile.id === "modifications") {
      const subtitle =
        manualEntryCount > 0
          ? umbauCount > 0
            ? `${manualEntryCount} Einträge · ${bilderLabel(umbauCount)}`
            : `${manualEntryCount} Einträge`
          : "Selbst eintragen";
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: path("umbauten"),
          subtitle,
        },
      };
    }

    if (tile.id === "service-maintenance") {
      return {
        ...tile,
        tone: serviceMaintenance.tone ?? tile.tone,
        meta: {
          ...tile.meta,
          href: path("intervalle"),
          subtitle:
            serviceMaintenance.subtitle ??
            (serviceHistory.length > 0
              ? `${serviceHistory.length} Einträge`
              : oilChangeCount > 0
                ? `${oilChangeCount} Öl-Einträge`
                : "Eintragen"),
          badge:
            serviceMaintenance.tone === "critical"
              ? "Fällig"
              : serviceMaintenance.tone === "warning"
                ? "Bald fällig"
                : tile.meta?.badge,
        },
      };
    }

    if (tile.id === "fuel-log") {
      const fuelSubtitle =
        operatingCostHint?.lastFuelDateLabel != null
          ? `Letzter Tank ${operatingCostHint.lastFuelDateLabel}`
          : operatingCostHint?.fuelEntryCount
            ? `${operatingCostHint.fuelEntryCount} Tankungen`
            : "Eintragen";
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: path("tanken"),
          subtitle: fuelSubtitle,
        },
      };
    }

    if (tile.id === "operating-costs") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: path("kosten"),
          subtitle: formatMonthlyAverageLabel(
            operatingCostHint?.totalMonthlyAverage ?? null,
          ),
        },
      };
    }

    if (tile.id === "schrauber") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: path("schrauber"),
          subtitle: "Verwalten",
        },
      };
    }

    if (tile.id === "specs") {
      const filledSpecs = countFilledTechSpecs(
        parseVehicleTechSpecs(vehicle.tech_specs),
      );
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: path("daten"),
          subtitle:
            filledSpecs > 0
              ? `${filledSpecs} Felder`
              : vinLabel,
        },
      };
    }

    if (tile.id === "vehicle-settings") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: path("einstellungen"),
          subtitle: vehicle.is_public
            ? "Öffentlich"
            : "Privat",
        },
      };
    }

    if (tile.id === "build-discover") {
      const likeSubtitle = formatBuildDiscoverDashboardSubtitle({
        totalLikes: isOwner ? showcaseSwipeTotalLikes : 0,
        unreadLikes: isOwner ? showcaseSwipeUnreadLikes : 0,
        demoMode,
        demoSubtitle: demoEntdeckenSubtitle,
      });
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: demoMode ? undefined : path("entdecken"),
          subtitle: likeSubtitle,
        },
      };
    }

    return tile;
  })
    .filter((tile) => {
      if (tile.id === "settings") return isOwner && !demoMode;
      if (tile.id === "fuel-log" || tile.id === "operating-costs") {
        return isOwner || demoMode;
      }
      if (tile.id === "build-discover") {
        return demoMode || isOwner || isContributor;
      }
      if (tile.id === "vehicle-settings") return isOwner || demoMode;
      if (tile.id === "schrauber") return isOwner || demoMode;
      if (isContributor && !isOwner) {
        return (
          tile.id === "invoices" ||
          tile.id === "service" ||
          tile.id === "service-maintenance" ||
          tile.id === "oil-change" ||
          tile.id === "modifications"
        );
      }
      return true;
    })
    .map((tile) => {
      if (demoMode || demoShowcase) return tile;
      const feature = featureForDashboardTile(tile.id);
      // Vault read + manual history stay open on Free; only Pro-only tiles lock.
      if (!feature || !isProOnlyFeature(feature)) return tile;
      if (cloudUnlocked) return tile;
      return {
        ...tile,
        locked: true,
        meta: {
          ...tile.meta,
          href: undefined,
          subtitle: "Pro",
        },
      };
    });

  const showProductFeaturesBanner =
    !demoMode &&
    !demoShowcase &&
    (isOwner || isContributor);

  const showTagShop =
    showTagShopPromo &&
    isOwner &&
    !demoMode &&
    !demoShowcase &&
    Boolean(tagShopUserId?.trim());

  const quickAccessCandidates = [
    {
      id: "invoices",
      label: "Dokumente",
      icon: "file-text" as const,
      href: path("dokumente"),
    },
    {
      id: "operating-costs",
      label: "Kosten",
      icon: "wallet" as const,
      href: path("kosten"),
    },
    {
      id: "build-planner",
      label: "To-dos",
      icon: "list-checks" as const,
      href: path("build-planner"),
    },
    {
      id: "fuel-log",
      label: "Tanken",
      icon: "fuel" as const,
      href: path("tanken"),
    },
  ];
  const quickAccessItems = quickAccessCandidates.filter((item) =>
    tiles.some((tile) => tile.id === item.id),
  );

  return (
    <div className="relative min-w-0 max-w-full overflow-x-clip">
      <VehicleDashboard
        data={{ ...data, tiles }}
        quickAccessItems={quickAccessItems}
        timelineEvents={timelineEvents}
        documents={documents}
        resolveDocumentHref={resolveDocumentHref}
        chronikEmptyCtaHref={manualEntryHref}
        canAddChronikEntry={canScan && (isOwner || isContributor) && !demoMode}
        defaultTab={defaultDashboardTab}
        belowBrandBanner={belowBrandBanner}
        hideBrandBanner={hideBrandBanner}
        banner={
          showTagShop || showProductFeaturesBanner ? (
            <div className="flex flex-col gap-2.5">
              {showTagShop ? (
                <HardwareUpsellWidget
                  vehicleId={vehicle.id}
                  userId={tagShopUserId!}
                  userEmail={tagShopUserEmail}
                  tagModelUuid={vehicleSurfaceScope?.linkedTagUuid}
                />
              ) : null}
              {showProductFeaturesBanner ? (
                <ProductFeaturesBanner
                  discoverHref={path("entdecken")}
                  costsHref={path("dokumente/kosten")}
                  active={productFeaturesBannerActive}
                />
              ) : null}
            </div>
          ) : undefined
        }
        className={canScan ? "pb-20" : undefined}
        extraTiles={
          isOwner && !demoMode && !demoShowcase ? (
            <GarageSwitcherTile />
          ) : null
        }
        onTileClick={(tileId) => {
          onDashboardTileClick?.(tileId);
          const feature = featureForDashboardTile(tileId);
          if (feature && isProOnlyFeature(feature)) {
            onLockedFeature?.(feature, tileId);
          }
        }}
        onSilhouetteProxyLoad={onSilhouetteProxyLoad}
      />
      {canScan ? (
        <DashboardScanFab
          tagUuid={tagUuid}
          scanHref={
            vehicleSurfaceScope
              ? `${vehicleSurfaceHref(vehicleSurfaceScope, "?scan=1")}`
              : `/v/${tagUuid}?scan=1`
          }
          hidden={hideScanFab}
          onOpenScanner={onOpenScanner}
          onFuelScan={onOpenFuelScanner}
          scanLocked={scanLocked}
          onScanLocked={() => onLockedFeature?.(FEATURE.SCAN_AI_RECEIPT)}
          fuelScanLocked={fuelScanLocked}
          onFuelScanLocked={() => onLockedFeature?.(FEATURE.SCAN_AI_RECEIPT)}
          fuelLogHref={path("tanken")}
          manualEntryHref={manualEntryHref}
          scanActionLabel="Rechnung scannen"
          scanLabel={
            !cloudUnlocked &&
            !scanLocked &&
            (freeInvoiceScanRemaining > 0 || freeAbeScanRemaining > 0)
              ? "Beleg scannen (gratis)"
              : "Beleg scannen"
          }
        />
      ) : null}
    </div>
  );
}
