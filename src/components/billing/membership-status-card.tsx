import {
  StripePortalButton,
} from "@/components/billing/stripe-checkout-button";
import { ProPaywallSection } from "@/components/billing/pro-paywall-section";
import { getMembershipForUser } from "@/lib/billing/membership-store";
import { isActiveMembership } from "@/lib/billing/membership";
import {
  type ProCheckoutAudience,
} from "@/lib/billing/pro-plan";

import { formatCompactGermanDate } from "@/lib/documents/format";

function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null;
  const compact = formatCompactGermanDate(iso.trim());
  return compact || null;
}

export async function MembershipStatusCard({
  userId,
  claimError,
  justLinked,
  checkoutState,
}: {
  userId: string;
  email?: string | null;
  claimError?: string | null;
  justLinked?: boolean;
  checkoutState?: "success" | "cancel" | null;
}) {
  const membership = await getMembershipForUser(userId);
  const active = membership
    ? isActiveMembership(membership.status, membership.current_period_end)
    : false;
  const periodLabel = formatPeriodEnd(membership?.current_period_end ?? null);

  if (active) {
    return (
      <section
        aria-label="Mitgliedschaft"
        className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]"
      >
        <h2 className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
          Mitgliedschaft
        </h2>
        {justLinked || checkoutState === "success" ? (
          <p className="mt-2 text-[0.82rem] text-emerald-800">
            Mitgliedschaft ist aktiv.
          </p>
        ) : null}
        {claimError ? (
          <p className="mt-2 text-[0.82rem] text-red-700" role="alert">
            {claimError}
          </p>
        ) : null}
        <p className="mt-1 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
          Mitgliedschaft aktiv
          {periodLabel ? ` · bezahlt bis ${periodLabel}` : ""}.
        </p>
        {membership?.stripe_customer_id ? (
          <StripePortalButton returnPath="/settings" />
        ) : (
          <p className="mt-3 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
            Kündigung und Verlängerung laufen über Stripe.
          </p>
        )}
      </section>
    );
  }

  const audience: ProCheckoutAudience =
    membership?.status === "canceled" || membership?.status === "past_due"
      ? "returning"
      : "new";

  return (
    <ProPaywallSection
      successPath="/settings"
      cancelPath="/settings"
      audience={audience}
      showPortal={Boolean(membership?.stripe_customer_id)}
      dismissHref="/dashboard"
      statusMessage={
        <>
          {justLinked ? (
            <p className="text-[0.82rem] text-emerald-800">
              Mitgliedschaft ist aktiv.
            </p>
          ) : null}
          {checkoutState === "success" ? (
            <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
              Zahlung eingegangen — das Abo wird in wenigen Sekunden freigeschaltet.
            </p>
          ) : null}
          {checkoutState === "cancel" ? (
            <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
              Checkout abgebrochen. Du kannst jederzeit neu starten.
            </p>
          ) : null}
          {claimError ? (
            <p className="text-[0.82rem] text-red-700" role="alert">
              {claimError}
            </p>
          ) : null}
          {membership?.status === "past_due" ? (
            <p className="text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
              Zahlung fehlgeschlagen — bitte in Stripe prüfen oder erneut abschließen.
            </p>
          ) : membership?.status === "canceled" ? (
            <p className="text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
              Mitgliedschaft beendet. Du kannst sie hier neu starten.
            </p>
          ) : null}
        </>
      }
    />
  );
}
