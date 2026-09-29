import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { syncStripeCheckoutSessionAction } from "@/actions/stripe-checkout";
import { ActivateCloudView } from "@/components/billing/activate-cloud-view";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/get-user";
import { loginGateHref } from "@/lib/auth/login-gate-url";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import { userHasActiveMembership } from "@/lib/billing/membership-store";

interface ActivateCloudPageProps {
  params: Promise<{ vehicleId: string }>;
  searchParams: Promise<{ session_id?: string; checkout?: string }>;
}

export const metadata: Metadata = {
  title: "Cloud aktivieren · ZeloxTag",
  description:
    "ZeloxTag Pro: 14 Tage kostenlos, danach 4,99 € im Monat. Digitale Fahrzeugakte, Belege, ABEs und TÜV.",
};

export default async function ActivateCloudPage({
  params,
  searchParams,
}: ActivateCloudPageProps) {
  const { vehicleId } = await params;
  const { session_id } = await searchParams;
  const { scope } = await requireVehicleSurfaceOwner({ vehicleId });
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginGateHref(vehicleSurfaceHref(scope, "abo")));
  }

  if (session_id?.startsWith("cs_")) {
    await syncStripeCheckoutSessionAction(session_id);
  }

  if (await userHasActiveMembership(user.id)) {
    redirect(`${vehicleSurfaceHref(scope)}`);
  }

  return (
    <AppShell showNavbar={false}>
      <ActivateCloudView tagUuid={scope.linkedTagUuid ?? vehicleId} />
    </AppShell>
  );
}
