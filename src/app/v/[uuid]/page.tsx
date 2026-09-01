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
import { isOperatorEmail } from "@/lib/auth/require-operator";
import { getTagVehicleAccess, getVehicleAccess } from "@/lib/auth/vehicle-access";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { getFreeInvoiceScanQuota } from "@/lib/billing/free-scan-quota";
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
import { isClaimLandingIdentifier } from "@/lib/tags/claim-landing";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import {
  toContributorClientTagScanResult,
  toOwnerClientTagScanResult,
} from "@/lib/tags/public-tag-dto";
import {
  isForcedDashboardTourSearch,
} from "@/lib/onboarding/dashboard-tour";
import { hasPendingDashboardTour } from "@/lib/onboarding/pending-dashboard-tour";
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
    freeScanWelcome?: string;
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

function renderClaimLanding(
  tagUuid: string,
  user: { email?: string | null } | null,
) {
  return (
    <AppShell showNavbar={false}>
      <ClaimFlow
        tagUuid={tagUuid}
        isAuthenticated={Boolean(user)}
        userEmail={user?.email ?? null}
      />
    </AppShell>
  );
}

/**
 * QR scan + public share landing — resolves tag UUID or vehicles.public_slug.
 */
export default async function TagScanPage({
  params,
  searchParams,
}: TagScanPageProps) {
  const { uuid: identifier } = await params;
  const { scan, type: scanType, dashboard, tour, session_id, freeScanWelcome } =
    await searchParams;
  const wantsDashboard = dashboard === "1" || scan === "1";
  const [entry, user] = await Promise.all([
    resolvePublicVehicleEntry(identifier),
    getCurrentUser(),
  ]);

  if (!entry) {
    if (isClaimLandingIdentifier(identifier)) {
      return renderClaimLanding(identifier.trim(), user);
    }
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
        <PublicProfilePrivate
          vehicleLabel={vehicleTitle(vehicle.make, vehicle.model, vehicle.year)}
        />
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
    return renderPublicShowcase(vehicle);
  }

  const result = entry.result;
  const { tag, vehicle } = result;

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

    const membershipActive = await userHasActiveMembership(vehicle.user_id);
    const freeScanQuota = membershipActive
      ? { remaining: 0, used: 0, limit: 1 }
      : await getFreeInvoiceScanQuota(vehicle.user_id);
    const wantsScan = scan === "1" && tour !== "1";
    const openScanner =
      wantsScan && (membershipActive || freeScanQuota.remaining > 0);
    const pendingTour = await hasPendingDashboardTour();
    const startTour =
      access.isOwner &&
      (isForcedDashboardTourSearch({ tour }) || pendingTour);

    if (session_id?.startsWith("cs_") && user) {
      await syncStripeCheckoutSessionAction(session_id);
      redirect(`/v/${tag.uuid}`);
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
    const projectTwin = access.isOwner
      ? toOwnerClientTagScanResult
      : toContributorClientTagScanResult;
    const ownerTwin = projectTwin({
      ...result,
      documents: visibleDocuments,
    });
    const showOperatorMinter =
      access.isOwner && isOperatorEmail(user?.email ?? null);

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
          freeInvoiceScanRemaining={freeScanQuota.remaining}
          showFreeScanWelcome={freeScanWelcome === "1"}
          showOperatorMinter={showOperatorMinter}
        />
      </AppShell>
    );
  }

  if (isClaimLandingIdentifier(identifier)) {
    return renderClaimLanding(identifier.trim(), user);
  }

  return (
    <AppShell showNavbar={false}>
      <TagNotFound />
    </AppShell>
  );
}
