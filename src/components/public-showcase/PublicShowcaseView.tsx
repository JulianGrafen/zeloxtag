import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

import { LegalFooterNav } from "@/components/legal/legal-footer-nav";

import { PublicShowcaseMarker } from "./public-showcase-marker";
import { ShowroomHero } from "./ShowroomHero";
import { ShowroomStats } from "./ShowroomStats";
import { showroom } from "./showroom-styles";

type PublicShowcaseViewProps = {
  data: PublicShowcasePayload;
};

export function PublicShowcaseView({ data }: PublicShowcaseViewProps) {
  return (
    <div className={showroom.page}>
      <PublicShowcaseMarker />
      <ShowroomHero profile={data.profile} photos={data.photos} />
      <div
        className={`${showroom.content} mx-auto flex w-full max-w-lg flex-col gap-6 pb-[max(2rem,env(safe-area-inset-bottom))]`}
      >
        <ShowroomStats
          profile={data.profile}
          modifications={data.modifications}
        />
        <footer
          className={`relative isolate z-[100] space-y-3 px-4 pb-2 ${showroom.footer}`}
        >
          <p>ZeloxTag</p>
          <LegalFooterNav tone="inverse" />
        </footer>
      </div>
    </div>
  );
}
