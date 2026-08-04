"use client";

import { useState } from "react";

import { InvoiceUploader } from "@/components/dashboard/InvoiceUploader";
import type { InvoiceTextParseCategory } from "@/lib/ocr/text-parse-schema";
import type { Document, Vehicle } from "@/types/database";

import { TagDashboardView } from "./tag-dashboard-view";

type DashboardMode = "dashboard" | "scanner";

interface TagDashboardShellProps {
  vehicle: Vehicle;
  documents: Document[];
  tagUuid: string;
  ownerName?: string | null;
  /** Only the vehicle owner may open the scanner / upload. */
  isOwner?: boolean;
  sessionEmail?: string | null;
  initialMode?: DashboardMode;
  initialScanType?: "abe";
}

/**
 * Owner-only active-tag surface (scanner + document dashboard).
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
  const [mode, setMode] = useState<DashboardMode>(
    isOwner ? initialMode : "dashboard",
  );
  const [scanCategory, setScanCategory] = useState<
    InvoiceTextParseCategory | undefined
  >(isOwner && initialScanType === "abe" ? "abe" : undefined);
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;

  if (!isOwner) {
    return null;
  }

  if (mode === "scanner") {
    const isAbe = scanCategory === "abe";
    return (
      <InvoiceUploader
        vehicleId={vehicle.id}
        tagUuid={tagUuid}
        vehicleLabel={vehicleLabel}
        backHref={`/v/${tagUuid}`}
        backLabel="Dashboard"
        onBack={() => {
          setMode("dashboard");
          setScanCategory(undefined);
        }}
        initialCategory={scanCategory ?? "service"}
        lockCategory={isAbe}
        heading={isAbe ? "ABE scannen" : "Rechnung scannen"}
        subheading={
          isAbe
            ? `${vehicleLabel} · Ein Bauteil · alle Seiten`
            : undefined
        }
        successHref={
          isAbe ? `/v/${tagUuid}/dokumente?type=abe` : undefined
        }
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
        setScanCategory(undefined);
        setMode("scanner");
      }}
    />
  );
}
