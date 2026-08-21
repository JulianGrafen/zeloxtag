"use client";

import { useState } from "react";

import { ManualEntryModal } from "@/components/service/ManualEntryModal";
import { VehicleDashboard } from "@/components/vehicle-dashboard";
import { buildDefaultTiles } from "@/components/vehicle-dashboard/buildDefaultTiles";
import {
  featureForDashboardTile,
  isProOnlyFeature,
  type FeatureFlag,
} from "@/lib/permissions/feature-access";
import type { Document, Vehicle } from "@/types/database";

import {
  filterOilChangeDocuments,
  latestOilChangeIsoDate,
} from "@/lib/documents/oil-changes";
import { dokumenteLabel, belegeLabel } from "@/lib/i18n/pluralize-de";
import {
  filterManualVehicleEntries,
  isTuningLikeCategory,
} from "@/lib/documents/manual-entries";
import { filterServiceInspectionDocuments } from "@/lib/documents/service-inspections";
import { deriveNextInspectionFromDocuments } from "@/lib/documents/tuev-schedule";
import { buildTimelineFromDocuments } from "@/services/timeline";
import {
  countFilledTechSpecs,
  parseVehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";
import { resolveVehicleCatalogImage, resolveVehicleImage } from "@/lib/vehicles/vehicle-image";
import {
  DEMO_SHOWCASE_VEHICLE_IMAGE,
  isDemoActiveTag,
} from "@/lib/tags/demo-showcase";

import { DashboardScanFab } from "./dashboard-scan-fab";
import { DashboardMoreSheet } from "./dashboard-more-sheet";

/** Home grid — launch set. */
const CORE_OWNER_TILE_IDS = new Set([
  "invoices",
  "abe",
  "tuv",
  "oil-change",
  "timeline",
  "vehicle-settings",
  "settings",
]);

/** One tap deeper via „Mehr“. */
const SECONDARY_OWNER_TILE_IDS = new Set([
  "service",
  "schrauber",
  "modifications",
  "tuning-history",
  "specs",
]);

interface TagDashboardViewProps {
  vehicle: Vehicle;
  documents: Document[];
  tagUuid: string;
  ownerName?: string | null;
  /** When false, hide the scan FAB (guest / wrong account). */
  canScan?: boolean;
  isOwner?: boolean;
  isContributor?: boolean;
  /**
   * Showcase mode: all dashboard tiles link to tag routes; sub-pages load via
   * demo showcase access (read-only, no login).
   */
  demoMode?: boolean;
  /** Owner's ZeloxTag Pro is active — unlocks vault, scan, and exposé tiles. */
  cloudUnlocked?: boolean;
  onOpenScanner?: () => void;
  /** Pro tile without href — open the action-based paywall. */
  onLockedFeature?: (feature: FeatureFlag) => void;
  /** Owner: tap header cutout to change silhouette. */
  onEditVehicleImage?: () => void;
  /** Immediate header refresh after silhouette upload (same-origin display URL). */
  vehicleImageOverride?: string | null;
  /** Data URL / blob fallback when proxy fails to load. */
  previewFallbackUrl?: string | null;
  onSilhouetteProxyLoad?: () => void;
}

/**
 * Maps a claimed tag's vehicle into the existing dashboard presentation layer.
 */
export function TagDashboardView({
  vehicle,
  documents,
  tagUuid,
  ownerName,
  canScan = true,
  isOwner = true,
  isContributor = false,
  demoMode = false,
  cloudUnlocked = true,
  onOpenScanner,
  onLockedFeature,
  onEditVehicleImage,
  vehicleImageOverride,
  previewFallbackUrl,
  onSilhouetteProxyLoad,
}: TagDashboardViewProps) {
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const invoiceCount = documents.filter((doc) => doc.type === "invoice").length;
  const abeCount = documents.filter((doc) => doc.type === "abe").length;
  const tuevCount = documents.filter((doc) => doc.type === "tuev").length;
  const serviceCount = filterServiceInspectionDocuments(documents).length;
  const manualEntries = filterManualVehicleEntries(documents);
  const manualEntryCount = manualEntries.length;
  const umbauCount = documents.filter(
    (doc) => doc.type === "invoice" && isTuningLikeCategory(doc.category),
  ).length + manualEntries.filter((doc) => doc.category === "tuning").length;
  const oilChangeCount = filterOilChangeDocuments(documents).length;
  const timelineEventCount = buildTimelineFromDocuments(documents).length;
  const lastOilChange = latestOilChangeIsoDate(documents);
  const vehicleModel = `${vehicle.make} ${vehicle.model}`;
  const vinLabel = vehicle.vin ? `VIN ${vehicle.vin}` : "VIN nicht hinterlegt";
  const demoShowcase = isDemoActiveTag(tagUuid);
  const cutout = resolveVehicleImage({
    make: vehicle.make,
    model: vehicle.model,
    vehicleId: vehicle.id,
    silhouetteImageUrl: vehicle.silhouette_image_url,
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
    vehicleImageFrameless: demoShowcase,
    vehicleImageAlt: cutout?.alt ?? catalogCutout?.alt ?? `${vehicleModel} (${vehicle.year})`,
    statusLabel: "ZeloxTag · Verbunden",
    lastOilChange: lastOilChange ?? undefined,
    nextInspection: deriveNextInspectionFromDocuments(documents),
  };

  const tiles = buildDefaultTiles(data).map((tile) => {
    if (tile.id === "invoices") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: `/v/${tagUuid}/dokumente?type=invoice`,
          subtitle:
            invoiceCount > 0
              ? belegeLabel(invoiceCount)
              : "Noch keine Belege",
        },
      };
    }

    if (tile.id === "abe") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: `/v/${tagUuid}/dokumente?type=abe`,
          subtitle:
            abeCount > 0 ? dokumenteLabel(abeCount) : "Noch keine ABEs",
        },
      };
    }

    if (tile.id === "tuv") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: `/v/${tagUuid}/dokumente?type=tuev`,
          subtitle:
            tuevCount > 0
              ? tile.meta?.subtitle
              : "TÜV-Bericht scannen",
        },
      };
    }

    if (tile.id === "service") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: `/v/${tagUuid}/service`,
          subtitle:
            serviceCount > 0
              ? `${serviceCount} Inspektionen`
              : "Inspektion scannen",
        },
      };
    }

    if (tile.id === "timeline") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: `/v/${tagUuid}/historie`,
          subtitle:
            timelineEventCount > 0
              ? `${timelineEventCount} Meilensteine`
              : "Nach KM-Stand",
        },
      };
    }

    if (tile.id === "tuning-history") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: `/v/${tagUuid}/eintrag`,
          subtitle:
            manualEntryCount > 0
              ? `${manualEntryCount} eigene Einträge`
              : "Wartung oder Tuning notieren",
        },
      };
    }

    if (tile.id === "modifications") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: `/v/${tagUuid}/umbauten`,
          subtitle:
            umbauCount > 0
              ? `${umbauCount} Umbau-Fotos`
              : "Umbau fotografieren",
        },
      };
    }

    if (tile.id === "oil-change") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: `/v/${tagUuid}/intervalle`,
          subtitle:
            oilChangeCount > 0
              ? tile.meta?.subtitle ??
                `${oilChangeCount} Ölwechsel`
              : "Manuell eintragen oder scannen",
        },
      };
    }

    if (tile.id === "schrauber") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: `/v/${tagUuid}/schrauber`,
          subtitle: "Einladen & verwalten",
        },
      };
    }

    if (tile.id === "specs") {
      const filledSpecs = countFilledTechSpecs(
        parseVehicleTechSpecs(vehicle.tech_specs),
      );
      return {
        ...tile,
        description: `${vehicle.make} · ${vehicle.year}`,
        meta: {
          ...tile.meta,
          href: `/v/${tagUuid}/daten`,
          subtitle:
            filledSpecs > 0
              ? `${filledSpecs} technische Angaben`
              : vinLabel,
        },
      };
    }

    if (tile.id === "vehicle-settings") {
      return {
        ...tile,
        meta: {
          ...tile.meta,
          href: `/v/${tagUuid}/einstellungen`,
          subtitle: vehicle.is_public
            ? "Profil ist öffentlich"
            : "Profil & Exposé",
        },
      };
    }

    return tile;
  });

  const secondaryTiles = tiles.filter((tile) =>
    SECONDARY_OWNER_TILE_IDS.has(String(tile.id)),
  );

  let visibleTiles = tiles.filter((tile) => {
    if (demoMode) {
      return tile.id !== "settings";
    }
    if (tile.id === "settings") return isOwner && !demoMode;
    if (tile.id === "vehicle-settings") return isOwner || demoMode;
    if (tile.id === "schrauber") return isOwner || demoMode;
    if (SECONDARY_OWNER_TILE_IDS.has(String(tile.id))) return false;
    if (isContributor && !isOwner) {
      return (
        tile.id === "invoices" ||
        tile.id === "service" ||
        tile.id === "oil-change" ||
        tile.id === "timeline" ||
        tile.id === "tuning-history"
      );
    }
    if (isOwner || demoMode) {
      return CORE_OWNER_TILE_IDS.has(String(tile.id));
    }
    return true;
  });

  if (isOwner && !isContributor) {
    visibleTiles = [
      ...visibleTiles,
      {
        id: "more",
        title: "Mehr",
        description: "Service, Umbauten, Technik",
        icon: "grid" as const,
        meta: { subtitle: `${secondaryTiles.length} Bereiche` },
      },
    ];
  }

  visibleTiles = visibleTiles.map((tile) => {
    if (cloudUnlocked || demoMode || demoShowcase) return tile;
    const feature = featureForDashboardTile(tile.id);
    if (!feature || !isProOnlyFeature(feature)) return tile;
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

  return (
    <div className="relative">
      <VehicleDashboard
        data={{ ...data, tiles: visibleTiles }}
        className={canScan ? "pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))]" : undefined}
        onTileClick={(tileId) => {
          if (tileId === "more") {
            setMoreOpen(true);
            return;
          }
          const feature = featureForDashboardTile(tileId);
          if (feature && isProOnlyFeature(feature)) {
            onLockedFeature?.(feature);
          }
        }}
        onEditVehicleImage={
          isOwner && !demoMode && !demoShowcase
            ? onEditVehicleImage
            : undefined
        }
        onSilhouetteProxyLoad={onSilhouetteProxyLoad}
      />
      {canScan ? (
        <DashboardScanFab
          tagUuid={tagUuid}
          onOpenScanner={onOpenScanner}
          onManualEntry={() => setManualEntryOpen(true)}
        />
      ) : null}
      <DashboardMoreSheet
        open={moreOpen}
        tiles={secondaryTiles}
        onClose={() => setMoreOpen(false)}
        onManualEntry={canScan ? () => setManualEntryOpen(true) : undefined}
      />
      {canScan ? (
        <ManualEntryModal
          tagUuid={tagUuid}
          vehicleId={vehicle.id}
          open={manualEntryOpen}
          onClose={() => setManualEntryOpen(false)}
        />
      ) : null}
    </div>
  );
}
