import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { TagDashboardView } from "@/components/tags/tag-dashboard-view";
import {
  getMockTagScan,
  MOCK_TAG_UUIDS,
} from "@/lib/tags/mock-tags";

export const metadata: Metadata = {
  title: "Demo · ZeloxTag",
  description:
    "Öffentliche Demo des ZeloxTag Fahrzeug-Dashboards (Mazda RX-8).",
};

/**
 * Optional showcase of the vehicle twin — not the production landing page.
 * Landing remains `/` (login). Deep-link: `/demo`.
 */
export default function DemoPage() {
  const result = getMockTagScan(MOCK_TAG_UUIDS.active);
  if (!result?.vehicle) {
    return null;
  }

  return (
    <AppShell showNavbar={false}>
      <div className="relative">
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
          <div className="pointer-events-auto mx-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]/95 px-3 py-2 shadow-[var(--vd-shadow-sm)] backdrop-blur-md">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[0.78rem] font-medium text-[color:var(--vd-text)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Anmelden
            </Link>
            <p className="truncate text-[0.72rem] font-medium text-[color:var(--vd-muted)]">
              Demo · Mazda RX-8
            </p>
            <Link
              href="/"
              className="shrink-0 rounded-full bg-neutral-900 px-3 py-1.5 text-[0.72rem] font-semibold text-white"
            >
              Login
            </Link>
          </div>
        </div>

        <div className="pt-14">
          <TagDashboardView
            vehicle={result.vehicle}
            documents={result.documents}
            tagUuid={result.tag.uuid}
            ownerName="Demo"
            canScan={false}
            demoMode
          />
        </div>
      </div>
    </AppShell>
  );
}
