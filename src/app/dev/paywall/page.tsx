import { notFound } from "next/navigation";

import { PaywallDevPreview } from "@/components/billing/paywall-dev-preview";
import { AppShell } from "@/components/layout/app-shell";

export default function DevPaywallPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <AppShell showNavbar={false}>
      <PaywallDevPreview />
    </AppShell>
  );
}
