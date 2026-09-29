import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { HardwareUpsellWidget } from "@/components/hardware/hardware-upsell-widget";
import { TagDashboardShell } from "@/components/tags/tag-dashboard-shell";
import { getCurrentUser } from "@/lib/auth/get-user";
import { loginGateHref } from "@/lib/auth/login-gate-url";
import { loadOwnerDashboardForVehicle } from "@/lib/vehicle-surface/load-owner-dashboard";
interface GarageDashboardPageProps {
  params: Promise<{ vehicleId: string }>;
  searchParams: Promise<{
    scan?: string;
    type?: string;
    tour?: string;
    session_id?: string;
    freeScanWelcome?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Garage · ZeloxTag",
    description: "Deine digitale Fahrzeugakte — Belege, Termine und Profil.",
  };
}

export default async function GarageDashboardPage({
  params,
  searchParams,
}: GarageDashboardPageProps) {
  const { vehicleId: rawId } = await params;
  const vehicleId = rawId.trim();
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginGateHref(`/garage/${vehicleId}`));
  }

  const query = await searchParams;
  const dashboard = await loadOwnerDashboardForVehicle(vehicleId, query);

  if (
    dashboard.scope.linkedTagUuid &&
    query.session_id?.startsWith("cs_")
  ) {
    redirect(`/v/${dashboard.scope.linkedTagUuid}`);
  }

  return (
    <AppShell showNavbar={false}>
      <div className="flex flex-col gap-4">
        {!dashboard.scope.linkedTagUuid ? (
          <div className="px-4 pt-4 sm:px-5">
            <HardwareUpsellWidget
              vehicleId={dashboard.scope.vehicleId}
              userId={user.id}
              userEmail={user.email}
            />
          </div>
        ) : null}
        <TagDashboardShell
          vehicle={dashboard.vehicle}
          documents={dashboard.documents}
          tagUuid={dashboard.tagUuidForUi}
          vehicleSurfaceScope={dashboard.scope}
          ownerName={dashboard.ownerName}
          isOwner={dashboard.isOwner}
          isContributor={dashboard.isContributor}
          sessionEmail={dashboard.sessionEmail}
          initialMode={dashboard.wantsScan ? "pick-scan" : "dashboard"}
          initialScanType={dashboard.openScanner ? (query.type ?? null) : null}
          startTour={dashboard.startTour}
          membershipActive={dashboard.membershipActive}
          freeInvoiceScanRemaining={dashboard.freeInvoiceScanRemaining}
          freeAbeScanRemaining={dashboard.freeAbeScanRemaining}
          showFreeScanWelcome={dashboard.showFreeScanWelcome}
          showOperatorMinter={dashboard.showOperatorMinter}
          accountDeletionGraceEndsAt={dashboard.accountDeletionGraceEndsAt}
          showcaseSwipeUnreadLikes={dashboard.showcaseSwipeUnreadLikes}
          showcaseSwipeTotalLikes={dashboard.showcaseSwipeTotalLikes}
          operatingCostHint={dashboard.operatingCostHint}
          showTagShopPromo={
            dashboard.isOwner && !dashboard.scope.linkedTagUuid
          }
          tagShopUserId={user.id}
          tagShopUserEmail={user.email}
        />
      </div>
    </AppShell>
  );
}
