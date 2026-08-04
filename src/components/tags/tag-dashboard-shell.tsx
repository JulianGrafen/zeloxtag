"use client";

import { useState } from "react";

import { InvoiceUploader } from "@/components/dashboard/InvoiceUploader";
import { ScanTypePicker } from "@/components/documents/scan-type-picker";
import {
  parseScanType,
  scanTypeDefinition,
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
  /** Only the vehicle owner may open the scanner / upload. */
  isOwner?: boolean;
  sessionEmail?: string | null;
  initialMode?: DashboardMode;
  /** Deep-link scan type from `?scan=1&type=…`. */
  initialScanType?: string | null;
}

/**
 * Owner-only active-tag surface (scan picker + scanner + document dashboard).
 * Guests never reach this component — see PrivateTwinGate.
 */
export function TagDashboardShell({
  vehicle,
  documents,
  tagUuid,
  ownerName,
  isOwner = false,
  initialMode = "dashboard",
  initialScanType,
}: TagDashboardShellProps) {
  const parsedInitial = parseScanType(initialScanType ?? undefined);
  const [mode, setMode] = useState<DashboardMode>(() => {
    if (!isOwner) return "dashboard";
    if (parsedInitial) return "scanner";
    if (initialMode === "pick-scan" || initialMode === "scanner") {
      return "pick-scan";
    }
    return "dashboard";
  });
  const [scanType, setScanType] = useState<ScanType | null>(
    isOwner ? parsedInitial : null,
  );
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;

  if (!isOwner) {
    return null;
  }

  if (mode === "pick-scan" || (mode === "scanner" && !scanType)) {
    return (
      <ScanTypePicker
        vehicleLabel={vehicleLabel}
        backHref={`/v/${tagUuid}`}
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
      onOpenScanner={() => {
        setScanType(null);
        setMode("pick-scan");
      }}
    />
  );
}
