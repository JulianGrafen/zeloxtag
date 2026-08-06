"use client";

import { useEffect, useState } from "react";

import { InvoiceUploader } from "@/components/dashboard/InvoiceUploader";
import { VehicleSilhouetteUpload } from "@/components/onboarding/VehicleSilhouetteUpload";
import type { SilhouetteUploadResult } from "@/components/onboarding/VehicleSilhouetteUpload";
import { ScanTypePicker } from "@/components/documents/scan-type-picker";
import {
  parseScanType,
  scanTypeDefinition,
  SCHRAUBER_SCAN_TYPES,
  type ScanType,
} from "@/lib/documents/scan-types";
import {
  cacheBustFromSilhouetteUrl,
  silhouetteDisplayUrl,
} from "@/lib/vehicles/silhouette-display-url";
import type { Document, Vehicle } from "@/types/database";

import { DashboardOnboardingTour } from "./dashboard-onboarding-tour";
import { TagDashboardView } from "./tag-dashboard-view";

function silhouetteSkipKey(vehicleId: string): string {
  return `zlx-silhouette-skip:${vehicleId}`;
}

type DashboardMode = "dashboard" | "pick-scan" | "scanner";

interface TagDashboardShellProps {
  vehicle: Vehicle;
  documents: Document[];
  tagUuid: string;
  ownerName?: string | null;
  /** Vehicle owner — full dashboard. */
  isOwner?: boolean;
  /** Active Schrauber — repair/service/invoice only. */
  isContributor?: boolean;
  sessionEmail?: string | null;
  initialMode?: DashboardMode;
  /** Deep-link scan type from `?scan=1&type=…`. */
  initialScanType?: string | null;
}

function resolveSilhouetteDisplayUrl(
  vehicleId: string,
  storageUrl: string | null | undefined,
): string | null {
  if (!storageUrl?.trim()) return null;
  const bust =
    cacheBustFromSilhouetteUrl(storageUrl) ?? Date.now().toString();
  return silhouetteDisplayUrl(vehicleId, bust);
}

/**
 * Active-tag surface for owners and invited Schrauber.
 * Guests never reach this component — see PrivateTwinGate.
 */
export function TagDashboardShell({
  vehicle,
  documents,
  tagUuid,
  ownerName,
  isOwner = false,
  isContributor = false,
  initialMode = "dashboard",
  initialScanType,
}: TagDashboardShellProps) {
  const canWrite = isOwner || isContributor;
  const role = isOwner ? "owner" : "contributor";
  const parsedInitial = parseScanType(initialScanType ?? undefined);
  const allowedInitial =
    parsedInitial &&
    (isOwner ||
      (SCHRAUBER_SCAN_TYPES as readonly string[]).includes(parsedInitial))
      ? parsedInitial
      : null;

  // Always ask for document type before capture — never skip via `?type=`.
  const [mode, setMode] = useState<DashboardMode>(() => {
    if (!canWrite) return "dashboard";
    if (initialMode === "pick-scan" || initialMode === "scanner") {
      return "pick-scan";
    }
    return "dashboard";
  });
  const [scanType, setScanType] = useState<ScanType | null>(null);
  const [showSilhouettePrompt, setShowSilhouettePrompt] = useState(false);
  const [showSilhouetteEditor, setShowSilhouetteEditor] = useState(false);
  const [silhouetteStorageUrl, setSilhouetteStorageUrl] = useState(
    () => vehicle.silhouette_image_url,
  );
  const [vehicleImageOverride, setVehicleImageOverride] = useState<
    string | null
  >(() => resolveSilhouetteDisplayUrl(vehicle.id, vehicle.silhouette_image_url));

  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;
  const displayVehicle = {
    ...vehicle,
    silhouette_image_url: silhouetteStorageUrl,
  };
  const hasSilhouette = Boolean(silhouetteStorageUrl || vehicleImageOverride);

  useEffect(() => {
    if (!vehicle.silhouette_image_url) return;

    setSilhouetteStorageUrl(vehicle.silhouette_image_url);
    setVehicleImageOverride(
      resolveSilhouetteDisplayUrl(vehicle.id, vehicle.silhouette_image_url),
    );
  }, [vehicle.id, vehicle.silhouette_image_url]);

  function handleSilhouetteUploaded(result: SilhouetteUploadResult) {
    setSilhouetteStorageUrl(result.storageUrl);
    setVehicleImageOverride(result.displayUrl);
  }

  useEffect(() => {
    if (!isOwner || hasSilhouette) {
      setShowSilhouettePrompt(false);
      return;
    }
    try {
      const skipped = window.localStorage.getItem(
        silhouetteSkipKey(vehicle.id),
      );
      setShowSilhouettePrompt(!skipped);
    } catch {
      setShowSilhouettePrompt(true);
    }
  }, [isOwner, vehicle.id, hasSilhouette]);

  if (!canWrite) {
    return null;
  }

  if (mode === "pick-scan" || (mode === "scanner" && !scanType)) {
    return (
      <ScanTypePicker
        vehicleLabel={vehicleLabel}
        backHref={`/v/${tagUuid}`}
        role={role}
        suggestedType={allowedInitial}
        onBack={() => {
          setScanType(null);
          setMode("dashboard");
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
        vehicleId={vehicle.id}
        tagUuid={tagUuid}
        vehicleLabel={vehicleLabel}
        vehicleMake={vehicle.make}
        vehicleModel={vehicle.model}
        vehicleVin={vehicle.vin}
        backHref={`/v/${tagUuid}`}
        backLabel="Dashboard"
        onBack={() => {
          setMode("pick-scan");
        }}
        scanType={scanType}
        successHref={`/v/${tagUuid}/dokumente?type=${def.successTypeQuery}`}
      />
    );
  }

  return (
    <>
      <TagDashboardView
        vehicle={displayVehicle}
        documents={documents}
        tagUuid={tagUuid}
        ownerName={ownerName}
        canScan
        isOwner={isOwner}
        isContributor={isContributor}
        onOpenScanner={() => {
          setScanType(null);
          setMode("pick-scan");
        }}
        onEditVehicleImage={
          isOwner
            ? () => {
                setShowSilhouettePrompt(false);
                setShowSilhouetteEditor(true);
              }
            : undefined
        }
        vehicleImageOverride={vehicleImageOverride}
      />
      {showSilhouettePrompt && mode === "dashboard" && !showSilhouetteEditor ? (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <VehicleSilhouetteUpload
            vehicleId={vehicle.id}
            tagUuid={tagUuid}
            onUploaded={(result) => {
              handleSilhouetteUploaded(result);
              setShowSilhouettePrompt(false);
            }}
            onSkip={() => {
              try {
                window.localStorage.setItem(
                  silhouetteSkipKey(vehicle.id),
                  "1",
                );
              } catch {
                /* ignore quota / private mode */
              }
              setShowSilhouettePrompt(false);
            }}
          />
        </div>
      ) : null}
      {showSilhouetteEditor ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center">
          <button
            type="button"
            aria-label="Schließen"
            className="absolute inset-0 cursor-default"
            onClick={() => setShowSilhouetteEditor(false)}
          />
          <div className="relative z-10 w-full max-w-lg">
            <VehicleSilhouetteUpload
              vehicleId={vehicle.id}
              tagUuid={tagUuid}
              title="Fahrzeugbild ändern"
              description="Lade ein neues Seitenfoto hoch — Galerie oder Kamera. Exakt von der Seite für die beste Dashboard-Animation."
              skipLabel="Schließen"
              onUploaded={(result) => {
                handleSilhouetteUploaded(result);
                setShowSilhouetteEditor(false);
              }}
              onSkip={() => setShowSilhouetteEditor(false)}
            />
          </div>
        </div>
      ) : null}
      <DashboardOnboardingTour
        enabled={
          mode === "dashboard" &&
          !showSilhouettePrompt &&
          !showSilhouetteEditor
        }
        role={isOwner ? "owner" : "contributor"}
      />
    </>
  );
}
