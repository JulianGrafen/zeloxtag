import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { ClaimFlow } from "@/components/tags/claim-flow";
import { TagDashboardShell } from "@/components/tags/tag-dashboard-shell";
import { TagNotFound } from "@/components/tags/tag-not-found";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getVehicleAccess } from "@/lib/auth/vehicle-access";
import { getTagByUuid } from "@/lib/tags/get-tag-by-uuid";
import { toPublicTagScanResult } from "@/lib/tags/public-tag-dto";

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
 * - State B `active` → Digital twin (owner: write, guest: read-only)
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

  const { tag, vehicle, documents } = result;
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
    const access = await getVehicleAccess(vehicle.user_id);
    const canWrite = access.isOwner;
    const openScanner = canWrite && scan === "1";
    // Strip owner UUID before hydrating the client tree (guests + owners).
    const publicTwin = toPublicTagScanResult({ tag, vehicle, documents });

    return (
      <AppShell showNavbar={false}>
        <TagDashboardShell
          vehicle={publicTwin.vehicle!}
          documents={publicTwin.documents}
          tagUuid={tag.uuid}
          ownerName={access.ownerName}
          isOwner={canWrite}
          sessionEmail={access.sessionEmail}
          initialMode={openScanner ? "scanner" : "dashboard"}
          initialScanType={
            openScanner && scanType === "abe" ? "abe" : undefined
          }
        />
      </AppShell>
    );
  }

  // Active tag without vehicle (or unexpected status) — show product 404,
  // not Next.js default English "page not found".
  return (
    <AppShell showNavbar={false}>
      <TagNotFound uuid={uuid} />
    </AppShell>
  );
}
