"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ProPaywallSection } from "@/components/billing/pro-paywall-section";
import { ExposeShareSettings } from "@/components/vehicles/ExposeShareSettings";
import { VehicleShowcaseSettings } from "@/components/vehicles/vehicle-showcase-settings";
import type { Document, Vehicle } from "@/types/database";

type VehicleSettingsViewProps = {
  tagUuid: string;
  vehicle: Vehicle;
  documents: Document[];
  canEdit: boolean;
  canUseExpose?: boolean;
  membershipActive?: boolean;
  exposeToken: string | null;
  isExposeActive: boolean;
};

export function VehicleSettingsView({
  tagUuid,
  vehicle,
  documents,
  canEdit,
  canUseExpose = true,
  membershipActive = false,
  exposeToken,
  isExposeActive,
}: VehicleSettingsViewProps) {
  return (
    <div className="flex flex-col gap-5">
      {!membershipActive ? (
        <ProPaywallSection
          successPath={`/v/${tagUuid}/einstellungen`}
          cancelPath={`/v/${tagUuid}/abo`}
          dismissHref={`/v/${tagUuid}`}
        />
      ) : null}

      <VehicleShowcaseSettings
        tagUuid={tagUuid}
        vehicle={vehicle}
        documents={documents}
        canEdit={canEdit}
      />

      <ExposeShareSettings
        tagUuid={tagUuid}
        vehicle={vehicle}
        canEdit={canEdit}
        canUseExpose={canUseExpose}
        exposeToken={exposeToken}
        isExposeActive={isExposeActive}
      />

      <Link
        href="/settings"
        data-tour="konto-security-link"
        className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3.5 text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
      >
        <span>
          <span className="block text-[0.88rem] font-medium">Konto & Sicherheit</span>
          <span className="mt-0.5 block text-[0.78rem] text-[color:var(--vd-muted)]">
            2FA, Sitzung und Abmelden
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]" aria-hidden />
      </Link>
    </div>
  );
}
