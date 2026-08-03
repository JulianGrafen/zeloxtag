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
  /** Open scanner immediately (e.g. after claim). */
  initialMode?: DashboardMode;
  /** Prefill/lock scanner category (e.g. ABE-only upload). */
  initialScanType?: "abe";
}

/**
 * Active-tag surface: dashboard + inline invoice scanner (no read-only gate).
 */
export function TagDashboardShell({
  vehicle,
  documents,
  tagUuid,
  ownerName,
  initialMode = "dashboard",
  initialScanType,
}: TagDashboardShellProps) {
  const [mode, setMode] = useState<DashboardMode>(initialMode);
  const [scanCategory, setScanCategory] = useState<
    InvoiceTextParseCategory | undefined
  >(initialScanType === "abe" ? "abe" : undefined);
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;

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
      onOpenScanner={() => {
        setScanCategory(undefined);
        setMode("scanner");
      }}
    />
  );
}
