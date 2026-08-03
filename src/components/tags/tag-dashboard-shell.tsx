"use client";

import { useState } from "react";
import Link from "next/link";

import { signOutToLoginForm } from "@/lib/auth/actions";
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
 * Active-tag surface: owner gets write tools; guests get a read-only twin.
 */
export function TagDashboardShell({
  vehicle,
  documents,
  tagUuid,
  ownerName,
  isOwner = false,
  sessionEmail = null,
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

  if (mode === "scanner" && isOwner) {
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
    <div className="relative">
      {!isOwner ? (
        <div className="mx-auto max-w-lg px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
          <div className="rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-[0.82rem] leading-relaxed text-amber-950">
            {sessionEmail ? (
              <>
                Angemeldet als{" "}
                <span className="font-semibold">{sessionEmail}</span>
                . Dieses Fahrzeug gehört zu{" "}
                <span className="font-semibold">{ownerName || "einem anderen Konto"}</span>
                {" "}
                — nur Ansicht.{" "}
                <form action={signOutToLoginForm} className="inline">
                  <input type="hidden" name="next" value={`/v/${tagUuid}`} />
                  <button
                    type="submit"
                    className="font-semibold underline underline-offset-2"
                  >
                    Konto wechseln
                  </button>
                </form>
              </>
            ) : (
              <>
                Öffentliche Fahrzeugansicht. Speichern und Scannen nur für den
                Eigentümer.
                {" "}
                <Link
                  href={`/login?next=${encodeURIComponent(`/v/${tagUuid}`)}`}
                  className="font-semibold underline underline-offset-2"
                >
                  Anmelden
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}

      <TagDashboardView
        vehicle={vehicle}
        documents={documents}
        tagUuid={tagUuid}
        ownerName={ownerName}
        canScan={isOwner}
        onOpenScanner={
          isOwner
            ? () => {
                setScanCategory(undefined);
                setMode("scanner");
              }
            : undefined
        }
      />
    </div>
  );
}
