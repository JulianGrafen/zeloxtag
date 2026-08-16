import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

import { PublicGallery } from "./PublicGallery";
import { ShowroomDetails } from "./ShowroomDetails";
import { ShowroomDyno } from "./ShowroomDyno";
import { ShowroomHero } from "./ShowroomHero";
import { ShowroomMods } from "./ShowroomMods";
import { ShowroomStats } from "./ShowroomStats";

type PublicShowcaseViewProps = {
  data: PublicShowcasePayload;
  dashboardHref?: string | null;
};

export function PublicShowcaseView({
  data,
  dashboardHref = null,
}: PublicShowcaseViewProps) {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-50">
      <ShowroomHero profile={data.profile} dashboardHref={dashboardHref} />
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <ShowroomStats profile={data.profile} />
        <ShowroomMods modifications={data.modifications} />
        <ShowroomDyno profile={data.profile} />
        <ShowroomDetails profile={data.profile} />
        <PublicGallery photos={data.photos} />
        <footer className="px-4 pb-2 text-center text-[0.68rem] uppercase tracking-[0.18em] text-zinc-600">
          ZeloxTag · Digitaler Showroom
        </footer>
      </div>
    </div>
  );
}
