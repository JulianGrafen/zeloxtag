import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { syncStripeCheckoutSessionAction } from "@/actions/stripe-checkout";
import { ActivateCloudView } from "@/components/billing/activate-cloud-view";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/get-user";
import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { userHasActiveMembership } from "@/lib/billing/membership-store";

interface ActivateCloudPageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ session_id?: string; checkout?: string }>;
}

export const metadata: Metadata = {
  title: "Cloud aktivieren · ZeloxTag",
  description: "ZeloxTag Cloud Abo über Stripe abschließen.",
};

export default async function ActivateCloudPage({
  params,
  searchParams,
}: ActivateCloudPageProps) {
  const { uuid } = await params;
  const { session_id } = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/v/${uuid}/abo`)}`);
  }

  const { result } = await requireTagOwner(uuid);

  if (session_id?.startsWith("cs_")) {
    await syncStripeCheckoutSessionAction(session_id);
  }

  if (await userHasActiveMembership(user.id)) {
    redirect(`/v/${uuid}?scan=1`);
  }

  return (
    <AppShell showNavbar={false}>
      <ActivateCloudView tagUuid={result.tag.uuid} />
    </AppShell>
  );
}
