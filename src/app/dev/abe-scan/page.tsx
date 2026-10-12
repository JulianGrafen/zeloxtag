import { notFound } from "next/navigation";

import { AbeScanDevPreview } from "@/app/dev/abe-scan/abe-scan-dev-preview";
import { AppShell } from "@/components/layout/app-shell";

/** Local mock for ABE capture + OCR flow (no auth). */
export default function DevAbeScanPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <AppShell showNavbar={false}>
      <AbeScanDevPreview />
    </AppShell>
  );
}
