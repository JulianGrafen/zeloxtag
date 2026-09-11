import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

import { PublicGallery } from "./PublicGallery";
import { ShowroomDetails } from "./ShowroomDetails";
import { ShowroomDyno } from "./ShowroomDyno";
import { ShowroomHero } from "./ShowroomHero";
import { ShowroomMods } from "./ShowroomMods";
import { ShowroomSoundcheck } from "./ShowroomSoundcheck";
import { ShowroomSpecifications } from "./ShowroomSpecifications";
import { ShowroomStats } from "./ShowroomStats";
import { showroom } from "./showroom-styles";

type PublicShowcaseViewProps = {
  data: PublicShowcasePayload;
};

export function PublicShowcaseView({ data }: PublicShowcaseViewProps) {
  return (
    <div className={showroom.page}>
      <ShowroomHero profile={data.profile} photos={data.photos} />
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-7 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <ShowroomStats profile={data.profile} />
        <ShowroomSoundcheck profile={data.profile} />
        <ShowroomSpecifications profile={data.profile} />
        <ShowroomMods modifications={data.modifications} />
        <ShowroomDyno profile={data.profile} />
        <ShowroomDetails profile={data.profile} />
        <PublicGallery photos={data.photos} />
        <footer className={`px-4 pb-2 ${showroom.footer}`}>
          ZeloxTag · Digitaler Showroom
        </footer>
      </div>
    </div>
  );
}
