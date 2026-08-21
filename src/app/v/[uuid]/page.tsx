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
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { getActiveTagUuidForVehicle } from "@/lib/tags/get-active-tag-uuid-for-vehicle";
import {
  loadPublicShowcaseDocuments,
  resolvePublicVehicleEntry,
} from "@/lib/vehicles/get-public-vehicle";
import { buildPublicShowcasePayload, vehicleSupportsPublicShowcase } from "@/lib/vehicles/public-showcase-data";
import {
  pageSocialMetadata,
  SHOWCASE_OG_DESCRIPTION,
} from "@/lib/seo/open-graph";
import { DEMO_SHOWCASE_OWNER_NAME } from "@/lib/tags/demo-showcase";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import { toOwnerClientTagScanResult } from "@/lib/tags/public-tag-dto";
import {
  dashboardTourHref,
  isForcedDashboardTourSearch,
} from "@/lib/onboarding/dashboard-tour";
import { syncStripeCheckoutSessionAction } from "@/actions/stripe-checkout";
import type { Vehicle } from "@/types/database";

interface TagScanPageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{
    scan?: string;
    type?: string;
    dashboard?: string;
    tour?: string;
    checkout?: string;
    session_id?: string;
  }>;
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
  const user = await getCurrentUser();

  async function titleForVehicle(
    make: string,
    model: string,
    year: number | null,
    vehicleUserId: string,
    vehicleId: string,
    tagUuid?: string,
    isPublic?: boolean,
  ): Promise<Metadata> {
    const title = vehicleTitle(make, model, year);
    const ogPath = tagUuid ? `/v/${tagUuid}/opengraph-image` : "/opengraph-image";

    if (user && tagUuid) {
      const access = await getTagVehicleAccess(tagUuid, vehicleUserId, vehicleId);
      if (access.isOwner || access.isContributor) {
        return {
          title,
          description: "Dein Fahrzeug-Dashboard — Belege, Termine und Profil.",
        };
      }
    }
    if (isPublic) {
      return {
        title: `${title} · Showcase`,
        description: SHOWCASE_OG_DESCRIPTION,
        ...pageSocialMetadata({
          title: `${title} · ZeloxTag Showcase`,
          description: SHOWCASE_OG_DESCRIPTION,
          path: tagUuid ? `/v/${tagUuid}` : undefined,
          imagePath: ogPath,
        }),
      };
    }
    return {
      title,
      description: "QR-Scan-Ziel für ZeloxTag Fahrzeugdokumente.",
    };
  }

  if (entry?.kind === "slug" && entry.vehicle.is_public) {
    const tagUuid = await getActiveTagUuidForVehicle(entry.vehicle.id);
    return titleForVehicle(
      entry.vehicle.make,
      entry.vehicle.model,
      entry.vehicle.year,
      entry.vehicle.user_id,
      entry.vehicle.id,
      tagUuid ?? undefined,
      true,
    );
  }

  if (entry?.kind === "tag" && entry.result.vehicle) {
    const v = entry.result.vehicle;
    return titleForVehicle(
      v.make,
      v.model,
      v.year,
      v.user_id,
      v.id,
      entry.result.tag.uuid,
      v.is_public,
    );
  }

  return {
    title: "ZeloxTag",
    description: "QR-Scan-Ziel für ZeloxTag Fahrzeugdokumente.",
  };
}

async function renderPublicShowcase(vehicle: Vehicle, tagUuid?: string) {
  const documents = await loadPublicShowcaseDocuments(vehicle.id);
  const payload = buildPublicShowcasePayload(vehicle, documents);

  return (
    <PublicShowcaseView
      data={payload}
      dashboardHref={tagUuid ? `/v/${tagUuid}?scan=1` : null}
    />
  );
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
  const { scan, type: scanType, dashboard, tour, checkout, session_id } =
    await searchParams;
  const wantsDashboard = dashboard === "1" || scan === "1";
  const entry = await resolvePublicVehicleEntry(identifier);

  if (!entry) {
    return (
      <AppShell showNavbar={false}>
        <TagNotFound />
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

    const slugTagUuid = await getActiveTagUuidForVehicle(vehicle.id);
    return renderPublicShowcase(vehicle, slugTagUuid ?? undefined);
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
      return renderPublicShowcase(vehicle, tag.uuid);
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

    const membershipActive = await userHasActiveMembership(vehicle.user_id);
    const wantsScan =
      scan === "1" && !isForcedDashboardTourSearch({ tour, checkout });
    const openScanner = wantsScan && membershipActive;
    const startTour =
      access.isOwner && isForcedDashboardTourSearch({ tour, checkout });

    if (session_id?.startsWith("cs_") && user) {
      await syncStripeCheckoutSessionAction(session_id);
      redirect(dashboardTourHref(tag.uuid));
    }
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
          initialMode={wantsScan ? "pick-scan" : "dashboard"}
          initialScanType={openScanner ? (scanType ?? null) : null}
          startTour={startTour}
          membershipActive={membershipActive}
        />
      </AppShell>
    );
  }

  return (
    <AppShell showNavbar={false}>
      <TagNotFound />
    </AppShell>
  );
}
