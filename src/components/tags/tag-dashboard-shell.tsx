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
  isComplimentaryAbeScanType,
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
import {
  DASHBOARD_FAB_CLEARANCE,
  resetDashboardPromptOrchestrator,
  setDashboardPromptPhase,
} from "@/lib/ui/dashboard-prompt-orchestrator";
import type { Document, Vehicle } from "@/types/database";

import { DashboardOnboardingTour } from "./dashboard-onboarding-tour";
import { TagDashboardView } from "./tag-dashboard-view";

function silhouetteSkipKey(vehicleId: string): string {
  return `zlx-silhouette-skip:${vehicleId}`;
}

function readSilhouetteSkipped(vehicleId: string): boolean {
  try {
    return window.localStorage.getItem(silhouetteSkipKey(vehicleId)) === "1";
  } catch {
    return false;
  }
}

function persistSilhouetteSkipped(vehicleId: string): void {
  try {
    window.localStorage.setItem(silhouetteSkipKey(vehicleId), "1");
  } catch {
    /* ignore quota / private mode */
  }
}

const SILHOUETTE_PROMPT_DELAY_MS = 700;
const PWA_AFTER_SILHOUETTE_MS = 900;
const PWA_ALONE_DELAY_MS = 1_600;

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
  /** Remaining complimentary KI ABE scans for the vehicle owner. */
  freeAbeScanRemaining?: number;
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
  freeAbeScanRemaining = 0,
  showFreeScanWelcome = false,
  showOperatorMinter = false,
}: TagDashboardShellProps) {
  const canWrite = isOwner || isContributor;
  const role = isOwner ? "owner" : "contributor";
  const demoShowcase = isDemoActiveTag(tagUuid);
  const canAiScan =
    membershipActive ||
    freeInvoiceScanRemaining > 0 ||
    freeAbeScanRemaining > 0;
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
    freeInvoiceScanRemaining === 0 &&
      freeAbeScanRemaining === 0 &&
      !membershipActive
      ? "free_scan_exhausted"
      : "default",
  );
  const [showFreeScanSuccess, setShowFreeScanSuccess] = useState(
    showFreeScanWelcome,
  );
  const [localFreeInvoiceScanRemaining, setLocalFreeInvoiceScanRemaining] =
    useState(freeInvoiceScanRemaining);
  const [localFreeAbeScanRemaining, setLocalFreeAbeScanRemaining] = useState(
    freeAbeScanRemaining,
  );
  const [scanType, setScanType] = useState<ScanType | null>(null);
  const [silhouettePromptVisible, setSilhouettePromptVisible] = useState(false);
  const [showSilhouetteEditor, setShowSilhouetteEditor] = useState(false);
  const promptTimersRef = useRef<number[]>([]);
  const postTourSequenceHandledRef = useRef(false);
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
    setLocalFreeInvoiceScanRemaining(freeInvoiceScanRemaining);
  }, [freeInvoiceScanRemaining]);

  useEffect(() => {
    setLocalFreeAbeScanRemaining(freeAbeScanRemaining);
  }, [freeAbeScanRemaining]);

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
    if (!membershipActive) {
      if (isInvoiceFamilyScanType(type)) {
        if (localFreeInvoiceScanRemaining <= 0) {
          openPaywall(FEATURE.SCAN_AI_RECEIPT, "free_scan_exhausted");
          return;
        }
      } else if (isComplimentaryAbeScanType(type)) {
        if (localFreeAbeScanRemaining <= 0) {
          openPaywall(FEATURE.SCAN_AI_RECEIPT, "free_scan_exhausted");
          return;
        }
      } else {
        openPaywall(FEATURE.SCAN_AI_RECEIPT, "default");
        return;
      }
    }
    setScanType(type);
    setMode("scanner");
  }

  function handleOpenScanner() {
    if (
      !membershipActive &&
      localFreeInvoiceScanRemaining <= 0 &&
      localFreeAbeScanRemaining <= 0
    ) {
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
  const wantsSilhouettePrompt =
    isOwner &&
    !hasSilhouette &&
    !demoShowcase &&
    !readSilhouetteSkipped(vehicle.id);

  function clearPromptTimers() {
    promptTimersRef.current.forEach((id) => window.clearTimeout(id));
    promptTimersRef.current = [];
  }

  function schedulePrompt(task: () => void, delayMs: number) {
    const id = window.setTimeout(task, delayMs);
    promptTimersRef.current.push(id);
  }

  function schedulePwaPrompt(delayMs = PWA_ALONE_DELAY_MS) {
    schedulePrompt(() => {
      setSilhouettePromptVisible(false);
      setDashboardPromptPhase("pwa");
    }, delayMs);
  }

  function scheduleSilhouettePrompt(delayMs = SILHOUETTE_PROMPT_DELAY_MS) {
    schedulePrompt(() => {
      setDashboardPromptPhase("silhouette");
      setSilhouettePromptVisible(true);
    }, delayMs);
  }

  function dismissSilhouettePrompt(persistSkip = false) {
    if (persistSkip) {
      persistSilhouetteSkipped(vehicle.id);
    }
    setSilhouettePromptVisible(false);
    schedulePwaPrompt(PWA_AFTER_SILHOUETTE_MS);
  }

  function handleTourOpenChange(open: boolean) {
    if (!open) return;
    clearPromptTimers();
    setDashboardPromptPhase("tour");
    setSilhouettePromptVisible(false);
  }

  function handleTourSettled() {
    setDeferSilhouetteForTour(false);
    setForceTour(false);
    postTourSequenceHandledRef.current = true;
    clearPromptTimers();

    if (wantsSilhouettePrompt) {
      scheduleSilhouettePrompt(SILHOUETTE_PROMPT_DELAY_MS);
      return;
    }

    schedulePwaPrompt(PWA_ALONE_DELAY_MS);
  }

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
    postTourSequenceHandledRef.current = false;
  }, [vehicle.id]);

  useEffect(() => {
    if (mode !== "dashboard" || !canWrite) {
      clearPromptTimers();
      resetDashboardPromptOrchestrator();
      setSilhouettePromptVisible(false);
      return;
    }

    if (forceTour || deferSilhouetteForTour) {
      setDashboardPromptPhase("tour");
      return () => {
        clearPromptTimers();
      };
    }

    if (postTourSequenceHandledRef.current) {
      return () => {
        clearPromptTimers();
        resetDashboardPromptOrchestrator();
      };
    }

    clearPromptTimers();
    if (wantsSilhouettePrompt) {
      scheduleSilhouettePrompt(SILHOUETTE_PROMPT_DELAY_MS);
    } else {
      schedulePwaPrompt(PWA_ALONE_DELAY_MS);
    }

    return () => {
      clearPromptTimers();
      resetDashboardPromptOrchestrator();
    };
  }, [
    mode,
    canWrite,
    forceTour,
    deferSilhouetteForTour,
    wantsSilhouettePrompt,
    vehicle.id,
  ]);

  useEffect(() => {
    if (
      !isOwner ||
      hasSilhouette ||
      demoShowcase ||
      deferSilhouetteForTour ||
      forceTour
    ) {
      setSilhouettePromptVisible(false);
    }
  }, [
    isOwner,
    hasSilhouette,
    demoShowcase,
    deferSilhouetteForTour,
    forceTour,
  ]);

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
            membershipActive ? 0 : localFreeInvoiceScanRemaining
          }
          freeAbeScanRemaining={
            membershipActive ? 0 : localFreeAbeScanRemaining
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
            !membershipActive &&
            ((scanType != null &&
              isInvoiceFamilyScanType(scanType) &&
              localFreeInvoiceScanRemaining > 0) ||
              (scanType != null &&
                isComplimentaryAbeScanType(scanType) &&
                localFreeAbeScanRemaining > 0))
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
          membershipActive ? 0 : localFreeInvoiceScanRemaining
        }
        freeAbeScanRemaining={
          membershipActive ? 0 : localFreeAbeScanRemaining
        }
        onOpenScanner={handleOpenScanner}
        onLockedFeature={(feature) => {
          openPaywall(
            feature,
            !membershipActive &&
              localFreeInvoiceScanRemaining <= 0 &&
              localFreeAbeScanRemaining <= 0
              ? "free_scan_exhausted"
              : "default",
          );
        }}
        onEditVehicleImage={
          isOwner && !demoShowcase
            ? () => {
                setSilhouettePromptVisible(false);
                setShowSilhouetteEditor(true);
              }
            : undefined
        }
        vehicleImageOverride={vehicleImageOverride}
        previewFallbackUrl={previewFallbackUrl}
        onSilhouetteProxyLoad={handleSilhouetteProxyLoad}
      />
      {silhouettePromptVisible && mode === "dashboard" && !showSilhouetteEditor ? (
        <div
          className="fixed inset-x-0 z-40 mx-auto max-w-lg px-4 pt-2"
          style={{ bottom: DASHBOARD_FAB_CLEARANCE }}
        >
          <VehicleSilhouetteUpload
            vehicleId={vehicle.id}
            tagUuid={tagUuid}
            title="Bilder hinzufügen"
            description="Lade ein Foto deines Autos hoch — es erscheint oben im Dashboard."
            onUploaded={(result) => {
              handleSilhouetteUploaded(result);
              dismissSilhouettePrompt(true);
            }}
            onSkip={() => dismissSilhouettePrompt(true)}
            onDismiss={() => dismissSilhouettePrompt(true)}
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
              onDismiss={() => setShowSilhouetteEditor(false)}
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
          (forceTour || deferSilhouetteForTour)
        }
        role={isOwner ? "owner" : "contributor"}
        force={forceTour}
        onOpenChange={handleTourOpenChange}
        onSettled={handleTourSettled}
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
