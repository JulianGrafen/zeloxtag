"use client";

import { useEffect, useRef, useState } from "react";

import { InvoiceUploader } from "@/components/dashboard/InvoiceUploader";
import { FreeScanSuccessModal } from "@/components/billing/free-scan-success-modal";
import { ProPaywallModal } from "@/components/billing/pro-paywall-modal";
import { VehicleSilhouetteUpload } from "@/components/onboarding/VehicleSilhouetteUpload";
import type { SilhouetteUploadResult } from "@/components/onboarding/VehicleSilhouetteUpload";
import { ScanTypePicker } from "@/components/documents/scan-type-picker";
import {
  parseScanType,
  isInvoiceFamilyScanType,
  SCHRAUBER_SCAN_TYPES,
  type ScanType,
} from "@/lib/documents/scan-types";
import { prefetchSilhouetteImage } from "@/lib/vehicles/prefetch-silhouette-image";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import {
  FEATURE,
  type FeatureFlag,
  type PaywallVariant,
} from "@/lib/permissions/feature-access";
import {
  readSilhouettePreviewFromSession,
  writeSilhouettePreviewToSession,
} from "@/lib/vehicles/silhouette-preview-session";
import {
  cacheBustFromSilhouetteUrl,
  silhouetteCacheBustEqual,
  silhouetteDisplayUrl,
} from "@/lib/vehicles/silhouette-display-url";
import {
  readSilhouetteFromSession,
  writeSilhouetteToSession,
} from "@/lib/vehicles/silhouette-session";
import type { Document, Vehicle } from "@/types/database";

import { DashboardOnboardingTour } from "./dashboard-onboarding-tour";
import { TagDashboardView } from "./tag-dashboard-view";

function silhouetteSkipKey(vehicleId: string): string {
  return `zlx-silhouette-skip:${vehicleId}`;
}

function initialSilhouetteStorageUrl(vehicle: Vehicle): string | null {
  const fromServer = vehicle.silhouette_image_url?.trim();
  if (fromServer) return fromServer;
  return readSilhouetteFromSession(vehicle.id);
}

function proxyUrlForStorage(
  vehicleId: string,
  storageUrl: string | null | undefined,
): string | null {
  if (!storageUrl?.trim()) return null;
  const bust =
    cacheBustFromSilhouetteUrl(storageUrl) ?? Date.now().toString();
  return silhouetteDisplayUrl(vehicleId, bust);
}

function initialVehicleImageOverride(
  vehicleId: string,
  storageUrl: string | null | undefined,
): string | null {
  const preview = readSilhouettePreviewFromSession(vehicleId);
  if (preview) return preview;
  return proxyUrlForStorage(vehicleId, storageUrl);
}

type DashboardMode = "dashboard" | "pick-scan" | "scanner";

interface TagDashboardShellProps {
  vehicle: Vehicle;
  documents: Document[];
  tagUuid: string;
  ownerName?: string | null;
  isOwner?: boolean;
  isContributor?: boolean;
  sessionEmail?: string | null;
  initialMode?: DashboardMode;
  initialScanType?: string | null;
  /** Post-claim first registration (`?tour=1`) — run the guided tour. */
  startTour?: boolean;
  /** Vehicle owner's ZeloxTag Pro is active. */
  membershipActive?: boolean;
  /** Remaining complimentary KI invoice scans for the vehicle owner. */
  freeInvoiceScanRemaining?: number;
  /** Post-save upsell after the one free scan (`?freeScanWelcome=1`). */
  showFreeScanWelcome?: boolean;
  /** Inventory minter tile for configured superuser. */
  showOperatorMinter?: boolean;
}

/**
 * Active-tag surface for owners and invited Schrauber.
 * Silhouette: Supabase Storage URL in DB → same-origin proxy for display.
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
  startTour = false,
  membershipActive = false,
  freeInvoiceScanRemaining = 0,
  showFreeScanWelcome = false,
  showOperatorMinter = false,
}: TagDashboardShellProps) {
  const canWrite = isOwner || isContributor;
  const role = isOwner ? "owner" : "contributor";
  const demoShowcase = isDemoActiveTag(tagUuid);
  const canAiScan =
    membershipActive || freeInvoiceScanRemaining > 0;
  const parsedInitial = parseScanType(initialScanType ?? undefined);
  const allowedInitial =
    parsedInitial &&
    (isOwner ||
      (SCHRAUBER_SCAN_TYPES as readonly string[]).includes(parsedInitial))
      ? parsedInitial
      : null;

  const [mode, setMode] = useState<DashboardMode>(() => {
    if (!canWrite || !canAiScan) return "dashboard";
    if (initialMode === "pick-scan" || initialMode === "scanner") {
      return "pick-scan";
    }
    return "dashboard";
  });
  const [paywallFeature, setPaywallFeature] = useState<FeatureFlag | null>(
    () => {
      if (
        canWrite &&
        !canAiScan &&
        (initialMode === "pick-scan" || initialMode === "scanner")
      ) {
        return FEATURE.SCAN_AI_RECEIPT;
      }
      return null;
    },
  );
  const [paywallVariant, setPaywallVariant] = useState<PaywallVariant>(
    freeInvoiceScanRemaining === 0 && !membershipActive
      ? "free_scan_exhausted"
      : "default",
  );
  const [showFreeScanSuccess, setShowFreeScanSuccess] = useState(
    showFreeScanWelcome,
  );
  const [localFreeScanRemaining, setLocalFreeScanRemaining] = useState(
    freeInvoiceScanRemaining,
  );
  const [scanType, setScanType] = useState<ScanType | null>(null);
  const [showSilhouettePrompt, setShowSilhouettePrompt] = useState(false);
  const [showSilhouetteEditor, setShowSilhouetteEditor] = useState(false);
  const [deferSilhouetteForTour, setDeferSilhouetteForTour] = useState(
    Boolean(startTour),
  );
  const [forceTour, setForceTour] = useState(startTour);

  useEffect(() => {
    if (startTour) {
      setForceTour(true);
      setDeferSilhouetteForTour(true);
    }
  }, [startTour]);

  useEffect(() => {
    setLocalFreeScanRemaining(freeInvoiceScanRemaining);
  }, [freeInvoiceScanRemaining]);

  useEffect(() => {
    if (showFreeScanWelcome) {
      setShowFreeScanSuccess(true);
    }
  }, [showFreeScanWelcome]);

  function openPaywall(
    feature: FeatureFlag,
    variant: PaywallVariant = "default",
  ) {
    setPaywallFeature(feature);
    setPaywallVariant(variant);
  }

  function handleScanTypeSelect(type: ScanType) {
    if (!membershipActive && !isInvoiceFamilyScanType(type)) {
      openPaywall(FEATURE.SCAN_AI_RECEIPT, "default");
      return;
    }
    if (
      !membershipActive &&
      isInvoiceFamilyScanType(type) &&
      localFreeScanRemaining <= 0
    ) {
      openPaywall(FEATURE.SCAN_AI_RECEIPT, "free_scan_exhausted");
      return;
    }
    setScanType(type);
    setMode("scanner");
  }

  function handleOpenScanner() {
    if (!membershipActive && localFreeScanRemaining <= 0) {
      openPaywall(
        FEATURE.SCAN_AI_RECEIPT,
        "free_scan_exhausted",
      );
      return;
    }
    setScanType(null);
    setMode("pick-scan");
  }

  function dismissFreeScanWelcome() {
    setShowFreeScanSuccess(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("freeScanWelcome")) {
        url.searchParams.delete("freeScanWelcome");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
  }

  const [silhouetteStorageUrl, setSilhouetteStorageUrl] = useState(
    () => initialSilhouetteStorageUrl(vehicle),
  );
  const [vehicleImageOverride, setVehicleImageOverride] = useState<string | null>(
    () =>
      initialVehicleImageOverride(
        vehicle.id,
        initialSilhouetteStorageUrl(vehicle),
      ),
  );
  const [previewFallbackUrl, setPreviewFallbackUrl] = useState<string | null>(
    () => readSilhouettePreviewFromSession(vehicle.id),
  );
  const previewBlobRef = useRef<string | null>(null);

  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;
  const displayVehicle = {
    ...vehicle,
    silhouette_image_url: silhouetteStorageUrl,
  };
  const hasSilhouette = Boolean(silhouetteStorageUrl?.trim());

  /**
   * Sync from server only when the stored Supabase URL actually changed
   * (e.g. another tab or hard refresh). Never fight an in-session upload.
   */
  useEffect(() => {
    const serverUrl = vehicle.silhouette_image_url?.trim();
    if (!serverUrl) return;
    if (silhouetteCacheBustEqual(serverUrl, silhouetteStorageUrl)) return;

    setSilhouetteStorageUrl(serverUrl);
    writeSilhouetteToSession(vehicle.id, serverUrl);
    const proxy = proxyUrlForStorage(vehicle.id, serverUrl);
    if (proxy) {
      setVehicleImageOverride((current) => {
        if (current?.startsWith("blob:")) return current;
        return proxy;
      });
    }
  }, [vehicle.id, vehicle.silhouette_image_url, silhouetteStorageUrl]);

  useEffect(() => {
    return () => {
      if (previewBlobRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previewBlobRef.current);
      }
    };
  }, []);

  function revokePreviewBlob() {
    if (previewBlobRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
  }

  function handleSilhouetteUploaded(result: SilhouetteUploadResult) {
    setSilhouetteStorageUrl(result.storageUrl);
    writeSilhouetteToSession(vehicle.id, result.storageUrl);

    const previewDataUrl = result.previewDataUrl?.trim();
    if (previewDataUrl?.startsWith("data:image/")) {
      writeSilhouettePreviewToSession(vehicle.id, previewDataUrl);
      setPreviewFallbackUrl(previewDataUrl);
    }

    revokePreviewBlob();
    const preview = result.previewUrl?.trim();
    const immediateSrc =
      previewDataUrl?.startsWith("data:image/")
        ? previewDataUrl
        : preview?.startsWith("blob:")
          ? preview
          : result.displayUrl;

    if (preview?.startsWith("blob:")) {
      previewBlobRef.current = preview;
    }

    setVehicleImageOverride(immediateSrc);

    void prefetchSilhouetteImage(result.displayUrl).then((ready) => {
      if (!ready) return;
      setVehicleImageOverride((current) => {
        if (current !== immediateSrc && current !== preview) return current;
        return result.displayUrl;
      });
    });
  }

  function handleSilhouetteProxyLoad() {
    revokePreviewBlob();
  }

  useEffect(() => {
    const storage = silhouetteStorageUrl?.trim();
    if (!storage) return;
    const proxy = proxyUrlForStorage(vehicle.id, storage);
    if (!proxy) return;

    void prefetchSilhouetteImage(proxy).then((ready) => {
      if (!ready) return;
      setVehicleImageOverride((value) => {
        const src = value?.trim() ?? "";
        if (src.startsWith("/api/vehicle/silhouette/")) return value;
        return proxy;
      });
    });
  }, [vehicle.id, silhouetteStorageUrl]);

  useEffect(() => {
    if (
      !isOwner ||
      hasSilhouette ||
      demoShowcase ||
      deferSilhouetteForTour
    ) {
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
  }, [isOwner, vehicle.id, hasSilhouette, demoShowcase, deferSilhouetteForTour]);

  if (!canWrite) {
    return null;
  }

  if (mode === "pick-scan" || (mode === "scanner" && !scanType)) {
    return (
      <>
        <ScanTypePicker
          vehicleLabel={vehicleLabel}
          backHref={`/v/${tagUuid}`}
          role={role}
          suggestedType={allowedInitial}
          freeInvoiceScanRemaining={
            membershipActive ? 0 : localFreeScanRemaining
          }
          onBack={() => {
            setScanType(null);
            setMode("dashboard");
          }}
          onSelect={handleScanTypeSelect}
        />
        <ProPaywallModal
          open={Boolean(paywallFeature)}
          feature={paywallFeature}
          variant={paywallVariant}
          tagUuid={tagUuid}
          isOwner={isOwner}
          onClose={() => setPaywallFeature(null)}
        />
      </>
    );
  }

  if (mode === "scanner" && scanType) {
    return (
      <>
        <InvoiceUploader
          vehicleId={vehicle.id}
          tagUuid={tagUuid}
          vehicleLabel={vehicleLabel}
          vehicleMake={vehicle.make}
          vehicleModel={vehicle.model}
          vehicleVin={vehicle.vin}
          existingDocuments={documents}
          backHref={`/v/${tagUuid}`}
          backLabel="Dashboard"
          onBack={() => {
            setMode("pick-scan");
          }}
          scanType={scanType}
          useFreeScanSaveRedirect={
            !membershipActive && localFreeScanRemaining > 0
          }
        />
        <ProPaywallModal
          open={Boolean(paywallFeature)}
          feature={paywallFeature}
          variant={paywallVariant}
          tagUuid={tagUuid}
          isOwner={isOwner}
          onClose={() => setPaywallFeature(null)}
        />
      </>
    );
  }

  return (
    <>
      <TagDashboardView
        vehicle={displayVehicle}
        documents={documents}
        tagUuid={tagUuid}
        ownerName={ownerName}
        canScan={canWrite}
        isOwner={isOwner}
        isContributor={isContributor}
        showOperatorMinter={showOperatorMinter}
        cloudUnlocked={membershipActive}
        freeInvoiceScanRemaining={
          membershipActive ? 0 : localFreeScanRemaining
        }
        onOpenScanner={handleOpenScanner}
        onLockedFeature={(feature) => {
          openPaywall(
            feature,
            !membershipActive && localFreeScanRemaining <= 0
              ? "free_scan_exhausted"
              : "default",
          );
        }}
        onEditVehicleImage={
          isOwner && !demoShowcase
            ? () => {
                setShowSilhouettePrompt(false);
                setShowSilhouetteEditor(true);
              }
            : undefined
        }
        vehicleImageOverride={vehicleImageOverride}
        previewFallbackUrl={previewFallbackUrl}
        onSilhouetteProxyLoad={handleSilhouetteProxyLoad}
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
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
          style={{ background: "var(--vd-overlay)" }}
        >
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
              title="Fahrzeugfoto ändern"
              description="Neues Foto aus Galerie oder Kamera — es erscheint oben rechts in deinem Dashboard."
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
          !showSilhouetteEditor &&
          (forceTour || !showSilhouettePrompt)
        }
        role={isOwner ? "owner" : "contributor"}
        force={forceTour}
        onSettled={() => setDeferSilhouetteForTour(false)}
      />
      <ProPaywallModal
        open={Boolean(paywallFeature)}
        feature={paywallFeature}
        variant={paywallVariant}
        tagUuid={tagUuid}
        isOwner={isOwner}
        onClose={() => setPaywallFeature(null)}
      />
      <FreeScanSuccessModal
        open={showFreeScanSuccess}
        tagUuid={tagUuid}
        onClose={dismissFreeScanWelcome}
      />
    </>
  );
}
