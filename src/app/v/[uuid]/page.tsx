import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ClaimFlow } from "@/components/tags/claim-flow";
import { TagDashboardShell } from "@/components/tags/tag-dashboard-shell";
import { TagNotFound } from "@/components/tags/tag-not-found";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getTagByUuid } from "@/lib/tags/get-tag-by-uuid";

interface TagScanPageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ scan?: string; type?: string }>;
}

export async function generateMetadata({
  params,
}: TagScanPageProps): Promise<Metadata> {
  const { uuid } = await params;
  return {
    title: `ZeloxTag · ${uuid}`,
    description: "QR-Scan-Ziel für ZeloxTag Fahrzeugdokumente.",
  };
}

/**
 * QR scan landing route — resolves physical tag UUID.
 *
 * - State A `unclaimed` → Claim Flow
 * - State B `active` → Vehicle dashboard (+ inline scanner)
 * - State C missing → clean not-found UI
 */
export default async function TagScanPage({
  params,
  searchParams,
}: TagScanPageProps) {
  const { uuid } = await params;
  const { scan, type: scanType } = await searchParams;
  const result = await getTagByUuid(uuid);

  // State C — tag does not exist
  if (!result) {
    return (
      <AppShell showNavbar={false}>
        <TagNotFound uuid={uuid} />
      </AppShell>
    );
  }

  const { tag, vehicle, documents } = result;
  const user = await getCurrentUser();

  // State A — claim / register
  if (tag.status === "unclaimed") {
    return (
      <AppShell showNavbar={false}>
        <ClaimFlow
          tagUuid={tag.uuid}
          isAuthenticated={Boolean(user)}
          userEmail={user?.email ?? null}
        />
      </AppShell>
    );
  }

  // State B — active digital twin (full access; auth deferred)
  if (tag.status === "active" && vehicle) {
    const ownerName = await resolveOwnerName();

    return (
      <AppShell showNavbar={false}>
        <TagDashboardShell
          vehicle={vehicle}
          documents={documents}
          tagUuid={tag.uuid}
          ownerName={ownerName}
          initialMode={scan === "1" ? "scanner" : "dashboard"}
          initialScanType={scanType === "abe" ? "abe" : undefined}
        />
      </AppShell>
    );
  }

  // Inconsistent row (active without vehicle)
  notFound();
}

async function resolveOwnerName(): Promise<string | null> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return "Julian";

  const user = await getCurrentUser();
  if (user && typeof user.user_metadata?.name === "string") {
    return user.user_metadata.name;
  }
  return user?.email?.split("@")[0] ?? "Fahrer";
}
