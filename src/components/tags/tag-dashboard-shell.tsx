"use client";

import { useState } from "react";

import { InvoiceUploader } from "@/components/dashboard/InvoiceUploader";
import { ScanTypePicker } from "@/components/documents/scan-type-picker";
import {
  parseScanType,
  scanTypeDefinition,
  SCHRAUBER_SCAN_TYPES,
  type ScanType,
} from "@/lib/documents/scan-types";
import type { Document, Vehicle } from "@/types/database";

import { TagDashboardView } from "./tag-dashboard-view";

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
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;

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
    <TagDashboardView
      vehicle={vehicle}
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
    />
  );
}
