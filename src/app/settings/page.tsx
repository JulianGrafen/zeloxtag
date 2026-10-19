import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-user";
import { resolvePostLoginPath } from "@/lib/auth/post-login-path";
import {
  claimMembershipForUser,
  userHasActiveMembership,
} from "@/lib/billing/membership-store";
import { extractUnguessableOrderSecret } from "@/lib/billing/shopify-membership";
import { AppShell } from "@/components/layout/app-shell";
import { MembershipStatusCard } from "@/components/billing/membership-status-card";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { accountHasPasswordLogin } from "@/lib/auth/account-password";
import { getMfaRecoveryStatus } from "@/lib/auth/mfa-actions";
import { getAccountDeletionState } from "@/lib/account/account-lifecycle";
import { syncStripeCheckoutSessionAction } from "@/actions/stripe-checkout";
import { isPostPaymentReturn } from "@/lib/onboarding/dashboard-tour";

export const metadata: Metadata = {
  title: "Einstellungen · ZeloxTag",
  description: "Konto, Erscheinungsbild, Sicherheit und Abmelden für ZeloxTag.",
};

interface SettingsPageProps {
  searchParams: Promise<{
    claim?: string;
    linked?: string;
    checkout?: string;
    session_id?: string;
  }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await getCurrentUser();
  const { claim, linked, checkout, session_id } = await searchParams;
  const token = extractUnguessableOrderSecret(claim ?? "");

  if (!user) {
    const nextParams = new URLSearchParams();
    if (token) nextParams.set("claim", token);
    const qs = nextParams.toString();
    const next = qs ? `/settings?${qs}` : "/settings";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (session_id?.startsWith("cs_")) {
    await syncStripeCheckoutSessionAction(session_id);
  }

  if (
    isPostPaymentReturn({ checkout, session_id }) &&
    (await userHasActiveMembership(user.id))
  ) {
    const destination = await resolvePostLoginPath(user.id);
    if (destination.startsWith("/v/")) {
      redirect(destination);
    }
  }

  if (session_id?.startsWith("cs_")) {
    redirect("/settings?checkout=success");
  }

  let claimError: string | null = null;
  const justLinked = linked === "1";
  const checkoutState =
    checkout === "success" || checkout === "cancel" ? checkout : null;
  if (token) {
    const result = await claimMembershipForUser(user.id, {
      token,
      loginEmail: user.email,
    });
    if (result.status === "ok") {
      redirect("/settings?linked=1");
    }
    if (result.status === "error") {
      claimError = result.message;
    }
  }

  const dashboardHref = await resolvePostLoginPath(user.id);
  const hasPasswordLogin = accountHasPasswordLogin(user);
  const mfaStatus = await getMfaRecoveryStatus();
  const mfaSubtitle =
    mfaStatus.status === "recovery_status" && mfaStatus.hasTotp
      ? `Aktiv · ${mfaStatus.unusedCount} Recovery-Codes übrig`
      : "Optional mit Authenticator aktivieren";
  const deletionState = await getAccountDeletionState(user.id);
  const maintenanceEmailReminders =
    user.user_metadata?.maintenance_email_reminders !== false;

  return (
    <AppShell>
      <SettingsScreen
        email={user.email ?? user.id}
        dashboardHref={dashboardHref}
        mfaSubtitle={mfaSubtitle}
        maintenanceEmailReminders={maintenanceEmailReminders}
        deletionState={deletionState}
        hasPasswordLogin={hasPasswordLogin}
        membershipSection={
          <MembershipStatusCard
            userId={user.id}
            email={user.email}
            claimError={claimError}
            justLinked={justLinked}
            checkoutState={checkoutState}
          />
        }
      />
    </AppShell>
  );
}
