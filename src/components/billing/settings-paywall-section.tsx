"use client";

import { ProPaywallSection } from "@/components/billing/pro-paywall-section";
import type { ProCheckoutAudience } from "@/lib/billing/pro-plan";

type SettingsPaywallSectionProps = {
  successPath?: string;
  cancelPath?: string;
  audience?: ProCheckoutAudience;
  showPortal?: boolean;
  statusMessage?: React.ReactNode;
};

/** Konto: gleiche Pro-Paywall wie Cloud-Abo / Inline-Sections (nicht abgespeckte Settings-Variante). */
export function SettingsPaywallSection({
  successPath = "/settings",
  cancelPath = "/settings",
  audience = "new",
  showPortal = false,
  statusMessage,
}: SettingsPaywallSectionProps) {
  return (
    <ProPaywallSection
      successPath={successPath}
      cancelPath={cancelPath}
      audience={audience}
      showPortal={showPortal}
      statusMessage={statusMessage}
    />
  );
}
