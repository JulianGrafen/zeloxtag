import { VehicleDashboard } from "@/components/vehicle-dashboard";
import { buildDefaultTiles } from "@/components/vehicle-dashboard/buildDefaultTiles";
import type { Document, Vehicle } from "@/types/database";

import {
  filterOilChangeDocuments,
  latestOilChangeIsoDate,
} from "@/lib/documents/oil-changes";
import { filterManualVehicleEntries } from "@/lib/documents/manual-entries";
import { filterServiceInspectionDocuments } from "@/lib/documents/service-inspections";
import { deriveNextInspectionFromDocuments } from "@/lib/documents/tuev-schedule";
import { buildTimelineFromDocuments } from "@/services/timeline";
import {
  countFilledTechSpecs,
  parseVehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";
import { resolveVehicleCatalogImage, resolveVehicleImage } from "@/lib/vehicles/vehicle-image";

import { DashboardScanFab } from "./dashboard-scan-fab";

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
  onOpenScanner?: () => void;
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
  onOpenScanner,
  onEditVehicleImage,
  vehicleImageOverride,
  previewFallbackUrl,
  onSilhouetteProxyLoad,
}: TagDashboardViewProps) {
  const invoiceCount = documents.filter((doc) => doc.type === "invoice").length;
  const abeCount = documents.filter((doc) => doc.type === "abe").length;
  const tuevCount = documents.filter((doc) => doc.type === "tuev").length;
  const serviceCount = filterServiceInspectionDocuments(documents).length;
  const manualEntries = filterManualVehicleEntries(documents);
  const manualEntryCount = manualEntries.length;
  const umbauCount = manualEntries.filter(
    (doc) => doc.category === "tuning",
  ).length;
  const oilChangeCount = filterOilChangeDocuments(documents).length;
  const timelineEventCount = buildTimelineFromDocuments(documents).length;
  const lastOilChange = latestOilChangeIsoDate(documents);
  const shortTag = tagUuid.length > 12 ? `${tagUuid.slice(0, 12)}…` : tagUuid;
  const vehicleModel = `${vehicle.make} ${vehicle.model}`;
  const vinLabel = vehicle.vin ? `VIN ${vehicle.vin}` : "VIN nicht hinterlegt";
  const cutout = resolveVehicleImage({
    make: vehicle.make,
    model: vehicle.model,
    vehicleId: vehicle.id,
    silhouetteImageUrl: vehicle.silhouette_image_url,
  });
  const catalogCutout = resolveVehicleCatalogImage(vehicle.make, vehicle.model);
  const hasOwnerSilhouette = Boolean(
    vehicleImageOverride || vehicle.silhouette_image_url?.trim(),
  );

  const data = {
    ownerName: ownerName?.trim() || "Fahrer",
    vehicleModel: `${vehicleModel} · ${vehicle.year}`,
    vehicleImage: vehicleImageOverride ?? cutout?.src,
    vehicleImageFallback: hasOwnerSilhouette
      ? undefined
      : demoMode
        ? catalogCutout?.src
        : undefined,
    vehicleImagePreviewFallback: previewFallbackUrl ?? undefined,
    vehicleImageAlt: cutout?.alt ?? catalogCutout?.alt ?? `${vehicleModel} (${vehicle.year})`,
    statusLabel: `ZeloxTag · ${shortTag}`,
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
              ? `${invoiceCount} Belege`
              : "Noch keine Belege",
          badge: invoiceCount > 0 ? String(invoiceCount) : undefined,
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
            abeCount > 0 ? `${abeCount} Dokumente` : "Noch keine ABEs",
          badge: abeCount > 0 ? String(abeCount) : undefined,
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
          badge: serviceCount > 0 ? String(serviceCount) : undefined,
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
          badge:
            timelineEventCount > 0 ? String(timelineEventCount) : undefined,
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
          badge: manualEntryCount > 0 ? String(manualEntryCount) : undefined,
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
          badge: umbauCount > 0 ? String(umbauCount) : undefined,
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
              : "Ölwechsel scannen",
          badge: oilChangeCount > 0 ? String(oilChangeCount) : undefined,
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

    return tile;
  }).filter((tile) => {
    // Account settings (2FA) require a real session — hide in public demo.
    if (tile.id === "settings") return isOwner && canScan && !demoMode;
    // Schrauber: owner feature, but visible in the public showcase.
    if (tile.id === "schrauber") return isOwner || demoMode;
    // Schrauber: focused write surface (invoices + service + scan).
    if (isContributor && !isOwner) {
      return (
        tile.id === "invoices" ||
        tile.id === "service" ||
        tile.id === "oil-change" ||
        tile.id === "timeline" ||
        tile.id === "tuning-history"
      );
    }
    return true;
  });

  return (
    <div className="relative">
      <VehicleDashboard
        data={{ ...data, tiles }}
        className={canScan ? "pb-24" : undefined}
        onEditVehicleImage={
          isOwner && !demoMode ? onEditVehicleImage : undefined
        }
        onSilhouetteProxyLoad={onSilhouetteProxyLoad}
      />
      {canScan ? (
        <DashboardScanFab tagUuid={tagUuid} onOpenScanner={onOpenScanner} />
      ) : null}
    </div>
  );
}
