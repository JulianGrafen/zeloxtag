import { notFound } from "next/navigation";

import { FuelReviewDevPreview } from "@/app/dev/fuel-review/fuel-review-dev-preview";
import { AppShell } from "@/components/layout/app-shell";

/** Local mock for post-scan fuel receipt review UI (no auth). */
export default function DevFuelReviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <AppShell showNavbar={false}>
      <FuelReviewDevPreview />
    </AppShell>
  );
}
