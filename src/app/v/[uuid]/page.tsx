import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ClaimFlow } from "@/components/tags/claim-flow";
import { PrivateTwinGate } from "@/components/tags/private-twin-gate";
import { TagDashboardShell } from "@/components/tags/tag-dashboard-shell";
import { TagDashboardView } from "@/components/tags/tag-dashboard-view";
import { TagNotFound } from "@/components/tags/tag-not-found";
import { PublicProfilePrivate } from "@/components/public-showcase/PublicProfilePrivate";
import { PublicShowcaseView } from "@/components/public-showcase/PublicShowcaseView";
import { filterDocumentsForContributorAccess } from "@/lib/auth/contributor-document-access";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTagVehicleAccess, getVehicleAccess } from "@/lib/auth/vehicle-access";
import { getActiveTagUuidForVehicle } from "@/lib/tags/get-active-tag-uuid-for-vehicle";
import {
  loadPublicShowcaseDocuments,
  resolvePublicVehicleEntry,
} from "@/lib/vehicles/get-public-vehicle";
import { buildPublicShowcasePayload, vehicleSupportsPublicShowcase } from "@/lib/vehicles/public-showcase-data";
import { DEMO_SHOWCASE_OWNER_NAME } from "@/lib/tags/demo-showcase";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import { toOwnerClientTagScanResult } from "@/lib/tags/public-tag-dto";
import type { Vehicle } from "@/types/database";

interface TagScanPageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ scan?: string; type?: string; dashboard?: string }>;
}

function vehicleTitle(make: string, model: string, year: number | null): string {
  const base = [make, model].filter(Boolean).join(" ");
  return year ? `${base} · ${year}` : base;
}

export async function generateMetadata({
  params,
}: TagScanPageProps): Promise<Metadata> {
  const { uuid } = await params;
  const entry = await resolvePublicVehicleEntry(uuid);

  if (entry?.kind === "slug" && entry.vehicle.is_public) {
    const title = vehicleTitle(
      entry.vehicle.make,
      entry.vehicle.model,
      entry.vehicle.year,
    );
    return {
      title: `${title} · ZeloxTag Showcase`,
      description: "Öffentliches Fahrzeugprofil — Specs, Galerie und Umbauten.",
    };
  }

  if (entry?.kind === "tag" && entry.result.vehicle?.is_public) {
    const v = entry.result.vehicle;
    const title = vehicleTitle(v.make, v.model, v.year);
    return {
      title: `${title} · ZeloxTag Showcase`,
      description: "Öffentliches Fahrzeugprofil — Specs, Galerie und Umbauten.",
    };
  }

  return {
    title: `ZeloxTag · ${uuid}`,
    description: "QR-Scan-Ziel für ZeloxTag Fahrzeugdokumente.",
  };
}

async function renderPublicShowcase(vehicle: Vehicle) {
  const documents = await loadPublicShowcaseDocuments(vehicle.id);
  const payload = buildPublicShowcasePayload(vehicle, documents);

  return <PublicShowcaseView data={payload} />;
}

function hasInsiderAccess(access: {
  isOwner: boolean;
  isContributor: boolean;
}): boolean {
  return access.isOwner || access.isContributor;
}

/**
 * QR scan + public share landing — resolves tag UUID or vehicles.public_slug.
 */
export default async function TagScanPage({
  params,
  searchParams,
}: TagScanPageProps) {
  const { uuid: identifier } = await params;
  const { scan, type: scanType, dashboard } = await searchParams;
  const wantsDashboard = dashboard === "1" || scan === "1";
  const entry = await resolvePublicVehicleEntry(identifier);

  if (!entry) {
    return (
      <AppShell showNavbar={false}>
        <TagNotFound uuid={identifier} />
      </AppShell>
    );
  }

  if (entry.kind === "slug") {
    const { vehicle } = entry;
    if (!vehicle.is_public) {
      return (
        <AppShell showNavbar={false}>
          <PublicProfilePrivate
            vehicleLabel={vehicleTitle(vehicle.make, vehicle.model, vehicle.year)}
          />
        </AppShell>
      );
    }

    const access = await getVehicleAccess(vehicle.user_id, vehicle.id);
    if (hasInsiderAccess(access)) {
      const tagUuid = await getActiveTagUuidForVehicle(vehicle.id);
      if (tagUuid) {
        redirect(`/v/${tagUuid}`);
      }
    }

    return renderPublicShowcase(vehicle);
  }

  const result = entry.result;
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
    const access = await getTagVehicleAccess(tag.uuid, vehicle.user_id, vehicle.id);
    const isPublicShowcase = vehicleSupportsPublicShowcase(vehicle);

    // Public showcase is guest-only; owner and Schrauber land in the private dashboard.
    if (
      isPublicShowcase &&
      !wantsDashboard &&
      !hasInsiderAccess(access)
    ) {
      return renderPublicShowcase(vehicle);
    }

    if (!access.isOwner && !access.isContributor) {
      if (tag.uuid === MOCK_TAG_UUIDS.active) {
        return (
          <AppShell showNavbar={false}>
            <TagDashboardView
              vehicle={vehicle}
              documents={result.documents}
              tagUuid={tag.uuid}
              ownerName={DEMO_SHOWCASE_OWNER_NAME}
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
            vehicleLabel={vehicleTitle(vehicle.make, vehicle.model, vehicle.year)}
            ownerName={access.ownerName}
            sessionEmail={access.sessionEmail}
          />
        </AppShell>
      );
    }

    const openScanner = scan === "1";
    const visibleDocuments = filterDocumentsForContributorAccess(
      result.documents,
      {
        isOwner: access.isOwner,
        isContributor: access.isContributor,
        canReadHistory: access.canReadHistory,
        sessionUserId: access.sessionUserId,
      },
    );
    const ownerTwin = toOwnerClientTagScanResult({
      ...result,
      documents: visibleDocuments,
    });

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
      <TagNotFound uuid={identifier} />
    </AppShell>
  );
}
