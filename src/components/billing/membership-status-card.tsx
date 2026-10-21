import { StripePortalButton } from "@/components/billing/stripe-checkout-button";
import { getMembershipForUser } from "@/lib/billing/membership-store";
import {
  isActiveMembership,
  isMembershipProEntitled,
} from "@/lib/billing/membership";

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
    ? isMembershipProEntitled({
        status: membership.status,
        currentPeriodEnd: membership.current_period_end,
        trialEndsAt: membership.trial_ends_at,
        stripeSubscriptionId: membership.stripe_subscription_id,
      })
    : false;
  const periodLabel = formatPeriodEnd(membership?.current_period_end ?? null);
  const trialLabel = formatPeriodEnd(membership?.trial_ends_at ?? null);
  const trialEndsAt = membership?.trial_ends_at ?? null;
  const trialEndMs = trialEndsAt ? Date.parse(trialEndsAt) : NaN;
  const inTrialWindow =
    Number.isFinite(trialEndMs) && trialEndMs > Date.now();
  const showTrialCopy =
    Boolean(trialLabel) &&
    inTrialWindow &&
    !isActiveMembership(
      membership?.status ?? "pending",
      membership?.current_period_end ?? null,
    );

  if (active) {
    return (
      <section
        aria-label="Mitgliedschaft"
        className="min-w-0 w-full max-w-full"
      >
        {justLinked || checkoutState === "success" ? (
          <p className="mt-2 text-[0.82rem] text-[color:var(--vd-alert-success-text)]">
            Mitgliedschaft ist aktiv.
          </p>
        ) : null}
        {claimError ? (
          <p className="mt-2 text-[0.82rem] text-[color:var(--vd-alert-error-text)]" role="alert">
            {claimError}
          </p>
        ) : null}
        <p className="mt-1 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
          Mitgliedschaft aktiv
          {showTrialCopy
            ? ` · Probeabo bis ${trialLabel}`
            : periodLabel
              ? ` · bezahlt bis ${periodLabel}`
              : ""}
          .
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

  return (
    <div className="min-w-0 w-full max-w-full space-y-2">
      {justLinked ? (
        <p className="text-[0.82rem] text-[color:var(--vd-alert-success-text)]">
          Mitgliedschaft ist aktiv.
        </p>
      ) : null}
      {checkoutState === "success" ? (
        <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
          Zahlung eingegangen. Das Abo wird in wenigen Sekunden freigeschaltet.
        </p>
      ) : null}
      {checkoutState === "cancel" ? (
        <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
          Checkout abgebrochen.
        </p>
      ) : null}
      {claimError ? (
        <p
          className="text-[0.82rem] text-[color:var(--vd-alert-error-text)]"
          role="alert"
        >
          {claimError}
        </p>
      ) : null}
      {membership?.status === "past_due" ? (
        <p className="text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
          Zahlung fehlgeschlagen. Bitte im Kundenportal prüfen.
        </p>
      ) : membership?.status === "canceled" ? (
        <p className="text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
          Mitgliedschaft beendet.
        </p>
      ) : (
        <p className="text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
          Kein aktives ZeloxTag Pro-Abo.
        </p>
      )}
      {membership?.stripe_customer_id ? (
        <StripePortalButton returnPath="/settings" />
      ) : null}
    </div>
  );
}
