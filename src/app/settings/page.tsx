import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-user";
import { resolvePostLoginPath } from "@/lib/auth/post-login-path";
import {
  claimMembershipForUser,
  userHasActiveMembership,
} from "@/lib/billing/membership-store";
import { extractUnguessableOrderSecret } from "@/lib/billing/shopify-membership";
import { AppShell } from "@/components/layout/app-shell";
import { ChangePasswordPanel } from "@/components/auth/change-password-panel";
import { MembershipStatusCard } from "@/components/billing/membership-status-card";
import { MfaSetupPanel } from "@/components/auth/mfa-setup-panel";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { accountHasPasswordLogin } from "@/lib/auth/account-password";
import { syncStripeCheckoutSessionAction } from "@/actions/stripe-checkout";
import {
  isPostPaymentReturn,
} from "@/lib/onboarding/dashboard-tour";

export const metadata: Metadata = {
  title: "Konto · ZeloxTag",
  description: "Konto, Sicherheit und Abmelden für ZeloxTag.",
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

  return (
    <AppShell>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-12 pt-6 sm:px-5">
        <div>
          <Link
            href="/dashboard"
            className="text-[0.8rem] font-medium text-[color:var(--vd-muted)]"
          >
            ← Zurück zum Dashboard
          </Link>
          <h1 className="claim-title mt-3">Konto</h1>
          <p className="claim-copy mt-1">
            Sicherheit & Sitzung ·{" "}
            <span className="font-medium text-[color:var(--vd-text)]">
              {user.email ?? user.id}
            </span>
          </p>
        </div>

        <MembershipStatusCard
          userId={user.id}
          email={user.email}
          claimError={claimError}
          justLinked={justLinked}
          checkoutState={checkoutState}
        />

        <ChangePasswordPanel hasPasswordLogin={accountHasPasswordLogin(user)} />

        <MfaSetupPanel />

        <section aria-label="Sitzung" className="vd-surface-card p-5 shadow-[var(--vd-shadow-sm)]">
          <h2 className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            Sitzung
          </h2>
          <p className="mt-1 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
            Melde dich ab, wenn du dieses Gerät nicht mehr nutzen willst.
          </p>
          <div className="mt-4">
            <SignOutButton />
          </div>
        </section>
      </section>
    </AppShell>
  );
}
