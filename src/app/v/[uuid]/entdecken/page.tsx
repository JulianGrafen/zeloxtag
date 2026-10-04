import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { LegalFooterNav } from "@/components/legal/legal-footer-nav";
import { ShowcaseDiscoverIntro } from "@/components/showcase-swipe/showcase-discover-intro";
import { ShowcaseDiscoverExperience } from "@/components/showcase-swipe/showcase-discover-experience";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { getCurrentUser } from "@/lib/auth/get-user";
import { loadShowcaseSwipeDeck } from "@/lib/showcase/swipe-deck";
import { loadWeeklyTopBuilds } from "@/lib/showcase/weekly-top-builds";
import { getTagByUuid } from "@/lib/tags/get-tag-by-uuid";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { getSupabaseEnv } from "@/lib/supabase/env";

interface EntdeckenPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Builds entdecken · ZeloxTag",
    description: "Öffentliche Showcases swipen — Like oder Pass.",
  };
}

export default async function ShowcaseEntdeckenPage({
  params,
}: EntdeckenPageProps) {
  const { uuid } = await params;
  const result = await getTagByUuid(uuid);

  if (!result?.vehicle || result.tag.status !== "active") {
    notFound();
  }

  if (isDemoActiveTag(uuid)) {
    redirect(`/v/${uuid}`);
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/v/${uuid}/entdecken`)}`);
  }

  const { isConfigured } = getSupabaseEnv();
  let initialCards: Awaited<ReturnType<typeof loadShowcaseSwipeDeck>> = [];
  let initialWeeklyBuilds: Awaited<ReturnType<typeof loadWeeklyTopBuilds>> = [];
  if (isConfigured) {
    try {
      initialCards = await loadShowcaseSwipeDeck(15);
    } catch (error) {
      console.error("[entdecken] deck preload failed", error);
    }
    try {
      initialWeeklyBuilds = await loadWeeklyTopBuilds(10);
    } catch (error) {
      console.error("[entdecken] weekly top preload failed", error);
    }
  }

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={uuid}
        title="Builds entdecken"
        description={
          <ShowcaseDiscoverIntro
            profilSettingsHref={`/v/${uuid}/einstellungen/profil`}
            galerieSettingsHref={`/v/${uuid}/einstellungen/galerie`}
          />
        }
        backHref={`/v/${uuid}`}
        backLabel="Dashboard"
      >
        <ShowcaseDiscoverExperience
          tagUuid={uuid}
          initialCards={initialCards}
          initialWeeklyBuilds={initialWeeklyBuilds}
        />
        <LegalFooterNav className="pt-2" />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
