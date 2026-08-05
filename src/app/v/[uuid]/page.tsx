import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { ClaimFlow } from "@/components/tags/claim-flow";
import { PrivateTwinGate } from "@/components/tags/private-twin-gate";
import { TagDashboardShell } from "@/components/tags/tag-dashboard-shell";
import { TagDashboardView } from "@/components/tags/tag-dashboard-view";
import { TagNotFound } from "@/components/tags/tag-not-found";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTagVehicleAccess } from "@/lib/auth/vehicle-access";
import { getTagByUuid } from "@/lib/tags/get-tag-by-uuid";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import { toOwnerClientTagScanResult } from "@/lib/tags/public-tag-dto";

interface TagScanPageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ scan?: string; type?: string }>;
}

export async function generateMetadata({
  params,
}: TagScanPageProps): Promise<Metadata> {
  const { uuid } = await params;
  return {
    title: `ZeloxTag · ${uuid}`,
    description: "QR-Scan-Ziel für ZeloxTag Fahrzeugdokumente.",
  };
}

/**
 * QR scan landing route — resolves physical tag UUID.
 *
 * - State A `unclaimed` → Claim Flow (+ account creation)
 * - State B `active` + owner → full digital twin
 * - State B `active` + guest → locked private gate (no invoices / PDFs)
 * - State C missing → clean not-found UI
 */
export default async function TagScanPage({
  params,
  searchParams,
}: TagScanPageProps) {
  const { uuid } = await params;
  const { scan, type: scanType } = await searchParams;
  const result = await getTagByUuid(uuid);

  if (!result) {
    return (
      <AppShell showNavbar={false}>
        <TagNotFound uuid={uuid} />
      </AppShell>
    );
  }

  const { tag, vehicle } = result;
  const user = await getCurrentUser();

  if (tag.status === "unclaimed") {
    return (
      <AppShell showNavbar={false}>
        <ClaimFlow
          tagUuid={tag.uuid}
          isAuthenticated={Boolean(user)}
          userEmail={user?.email ?? null}
        />
      </AppShell>
    );
  }

  if (tag.status === "active" && vehicle) {
    const access = await getTagVehicleAccess(tag.uuid, vehicle.user_id);

    if (!access.isOwner && !access.isContributor) {
      // Public mock twin for the optional /demo showcase links.
      if (tag.uuid === MOCK_TAG_UUIDS.active) {
        return (
          <AppShell showNavbar={false}>
            <TagDashboardView
              vehicle={vehicle}
              documents={result.documents}
              tagUuid={tag.uuid}
              ownerName="Demo"
              canScan={false}
              demoMode
            />
          </AppShell>
        );
      }

      return (
        <AppShell showNavbar={false}>
          <PrivateTwinGate
            tagUuid={tag.uuid}
            vehicleLabel={`${vehicle.make} ${vehicle.model} · ${vehicle.year}`}
            ownerName={access.ownerName}
            sessionEmail={access.sessionEmail}
          />
        </AppShell>
      );
    }

    const openScanner = scan === "1";
    const ownerTwin = toOwnerClientTagScanResult(result);

    return (
      <AppShell showNavbar={false}>
        <TagDashboardShell
          vehicle={ownerTwin.vehicle!}
          documents={ownerTwin.documents}
          tagUuid={tag.uuid}
          ownerName={access.ownerName}
          isOwner={access.isOwner}
          isContributor={access.isContributor}
          sessionEmail={access.sessionEmail}
          initialMode={openScanner ? "pick-scan" : "dashboard"}
          initialScanType={openScanner ? (scanType ?? null) : null}
        />
      </AppShell>
    );
  }

  return (
    <AppShell showNavbar={false}>
      <TagNotFound uuid={uuid} />
    </AppShell>
  );
}
