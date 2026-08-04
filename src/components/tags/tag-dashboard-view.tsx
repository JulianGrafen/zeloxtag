import { VehicleDashboard } from "@/components/vehicle-dashboard";
import { buildDefaultTiles } from "@/components/vehicle-dashboard/buildDefaultTiles";
import type { Document, Vehicle } from "@/types/database";

import {
  filterOilChangeDocuments,
  latestOilChangeIsoDate,
} from "@/lib/documents/oil-changes";
import { filterServiceInspectionDocuments } from "@/lib/documents/service-inspections";
import { deriveNextInspectionFromDocuments } from "@/lib/documents/tuev-schedule";
import { resolveVehicleImage } from "@/lib/vehicles/vehicle-image";

import { DashboardScanFab } from "./dashboard-scan-fab";

interface TagDashboardViewProps {
  vehicle: Vehicle;
  documents: Document[];
  tagUuid: string;
  ownerName?: string | null;
  /** When false, hide the scan FAB (guest / wrong account). */
  canScan?: boolean;
  onOpenScanner?: () => void;
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
  onOpenScanner,
}: TagDashboardViewProps) {
  const invoiceCount = documents.filter((doc) => doc.type === "invoice").length;
  const abeCount = documents.filter((doc) => doc.type === "abe").length;
  const tuevCount = documents.filter((doc) => doc.type === "tuev").length;
  const serviceCount = filterServiceInspectionDocuments(documents).length;
  const oilChangeCount = filterOilChangeDocuments(documents).length;
  const lastOilChange = latestOilChangeIsoDate(documents);
  const shortTag = tagUuid.length > 12 ? `${tagUuid.slice(0, 12)}…` : tagUuid;
  const vehicleModel = `${vehicle.make} ${vehicle.model}`;
  const vinLabel = vehicle.vin ? `VIN ${vehicle.vin}` : "VIN nicht hinterlegt";
  const cutout = resolveVehicleImage({
    make: vehicle.make,
    model: vehicle.model,
  });

  const data = {
    ownerName: ownerName?.trim() || "Fahrer",
    vehicleModel: `${vehicleModel} · ${vehicle.year}`,
    vehicleImage: cutout?.src,
    vehicleImageAlt: cutout?.alt ?? `${vehicleModel} (${vehicle.year})`,
    statusLabel: `ZeloxTag · ${shortTag}`,
    lastOilChange: lastOilChange ?? undefined,
    nextInspection: deriveNextInspectionFromDocuments(documents),
    roadsidePhone: "+49 170 1234567",
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

    if (tile.id === "specs") {
      return {
        ...tile,
        description: `${vehicle.make} · ${vehicle.year}`,
        meta: {
          ...tile.meta,
          subtitle: vinLabel,
        },
      };
    }

    return tile;
  });

  return (
    <div className="relative">
      <VehicleDashboard
        data={{ ...data, tiles }}
        className={canScan ? "pb-24" : undefined}
      />
      {canScan ? (
        <DashboardScanFab tagUuid={tagUuid} onOpenScanner={onOpenScanner} />
      ) : null}
    </div>
  );
}
