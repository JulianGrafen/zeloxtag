import "server-only";

import { filterDocumentsForContributorAccess } from "@/lib/auth/contributor-document-access";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getAccountDeletionState } from "@/lib/account/account-lifecycle";
import { isOperatorEmail } from "@/lib/auth/require-operator";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { resolveDashboardScanGate } from "@/lib/billing/ai-scan-access";
import {
  getFreeAbeScanQuota,
  getFreeInvoiceScanQuota,
} from "@/lib/billing/free-scan-quota";
import type { ScanType } from "@/lib/documents/scan-types";
import {
  isForcedDashboardTourSearch,
} from "@/lib/onboarding/dashboard-tour";
import { hasPendingDashboardTour } from "@/lib/onboarding/pending-dashboard-tour";
import { syncStripeCheckoutSessionAction } from "@/actions/stripe-checkout";
import {
  toContributorClientTagScanResult,
  toOwnerClientTagScanResult,
} from "@/lib/tags/public-tag-dto";
import { loadShowcaseSwipeInboxSummary } from "@/lib/showcase/swipe-deck";
import { listOperatingCostsForVehicle } from "@/lib/vehicles/load-operating-costs";
import { buildPlannerDashboardHint } from "@/lib/build-planner/build-planner-summary";
import { listPlannedModsWithTodosForVehicle } from "@/lib/build-planner/planned-mods-repository";
import { buildOperatingCostDashboardHint } from "@/lib/vehicles/operating-costs/summary";
import type { OperatingCostDashboardHint } from "@/lib/vehicles/operating-costs/types";
import type { Document, Vehicle } from "@/types/database";

import type { VehicleSurfaceScope } from "./types";

export type OwnerDashboardPayload = {
  scope: VehicleSurfaceScope;
  vehicle: Vehicle;
  documents: Document[];
  tagUuidForUi: string;
  ownerName: string;
  isOwner: boolean;
  isContributor: boolean;
  sessionEmail: string | null;
  wantsScan: boolean;
  scanGateInitialType: ScanType | null;
  showScanPaywall: boolean;
  startTour: boolean;
  membershipActive: boolean;
  freeInvoiceScanRemaining: number;
  freeAbeScanRemaining: number;
  showFreeScanWelcome: boolean;
  showOperatorMinter: boolean;
  accountDeletionGraceEndsAt: string | null;
  showcaseSwipeUnreadLikes: number;
  showcaseSwipeTotalLikes: number;
  operatingCostHint: OperatingCostDashboardHint | null;
  buildPlannerHint: { subtitle: string } | null;
};

export async function loadOwnerDashboardForVehicle(
  vehicleId: string,
  searchParams: {
    scan?: string;
    type?: string;
    tour?: string;
    session_id?: string;
    freeScanWelcome?: string;
  },
): Promise<OwnerDashboardPayload> {
  const { scan, type: scanType, tour, session_id, freeScanWelcome } =
    searchParams;

  const { scope, result, access, isDemoShowcase } =
    await requireVehicleSurfaceOwner({ vehicleId });

  const vehicle = result.vehicle!;
  const user = await getCurrentUser();

  if (session_id?.startsWith("cs_") && user) {
    await syncStripeCheckoutSessionAction(session_id);
  }

  const membershipActive = await userHasActiveMembership(vehicle.user_id);
  const freeInvoiceScanQuota = membershipActive
    ? { remaining: 0, used: 0, limit: 1 }
    : await getFreeInvoiceScanQuota(vehicle.user_id);
  const freeAbeScanQuota = membershipActive
    ? { remaining: 0, used: 0, limit: 1 }
    : await getFreeAbeScanQuota(vehicle.user_id);
  const wantsScan = scan === "1" && tour !== "1";
  const scanGate = resolveDashboardScanGate({
    wantsScan,
    membershipActive,
    freeInvoiceRemaining: freeInvoiceScanQuota.remaining,
    freeAbeRemaining: freeAbeScanQuota.remaining,
    scanTypeRaw: scanType,
  });
  const pendingTour = await hasPendingDashboardTour();
  const startTour =
    access.isOwner &&
    (isForcedDashboardTourSearch({ tour }) || pendingTour);

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
  const deletionState =
    access.isOwner && vehicle.user_id
      ? await getAccountDeletionState(vehicle.user_id)
      : null;

  let operatingCostHint = null;
  let buildPlannerHint = null;
  if (access.isOwner && !isDemoShowcase) {
    try {
      const operatingCosts = await listOperatingCostsForVehicle(vehicle.id);
      operatingCostHint = buildOperatingCostDashboardHint(operatingCosts);
    } catch (error) {
      console.error("[garage-dashboard] operating costs", error);
    }
    try {
      const mods = await listPlannedModsWithTodosForVehicle(vehicle.id);
      buildPlannerHint = buildPlannerDashboardHint({
        mods,
        todos: mods.flatMap((mod) => mod.todos),
      });
    } catch (error) {
      console.error("[garage-dashboard] build planner", error);
    }
  }

  let showcaseSwipeUnreadLikes = 0;
  let showcaseSwipeTotalLikes = 0;
  if (access.isOwner && user && !isDemoShowcase) {
    try {
      const inbox = await loadShowcaseSwipeInboxSummary();
      const row = inbox.find((entry) => entry.vehicleId === vehicle.id);
      showcaseSwipeUnreadLikes = row?.unreadLikes ?? 0;
      showcaseSwipeTotalLikes = row?.totalLikes ?? 0;
    } catch (error) {
      console.error("[garage-dashboard] swipe inbox", error);
    }
  }

  const tagUuidForUi = scope.linkedTagUuid ?? vehicleId;

  return {
    scope,
    vehicle: ownerTwin.vehicle!,
    documents: ownerTwin.documents,
    tagUuidForUi,
    ownerName: access.ownerName,
    isOwner: access.isOwner,
    isContributor: access.isContributor,
    sessionEmail: access.sessionEmail,
    wantsScan,
    scanGateInitialType: scanGate.initialScanType,
    showScanPaywall: scanGate.showScanPaywall,
    startTour,
    membershipActive,
    freeInvoiceScanRemaining: freeInvoiceScanQuota.remaining,
    freeAbeScanRemaining: freeAbeScanQuota.remaining,
    showFreeScanWelcome: freeScanWelcome === "1",
    showOperatorMinter,
    accountDeletionGraceEndsAt:
      deletionState?.status === "grace" ? deletionState.graceEndsAt : null,
    showcaseSwipeUnreadLikes,
    showcaseSwipeTotalLikes,
    operatingCostHint,
    buildPlannerHint,
  };
}
