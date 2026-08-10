import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

import { PublicGallery } from "./PublicGallery";
import { PublicHeader } from "./PublicHeader";
import { PublicModList } from "./PublicModList";

type PublicShowcaseViewProps = {
  data: PublicShowcasePayload;
};

export function PublicShowcaseView({ data }: PublicShowcaseViewProps) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
      <PublicHeader profile={data.profile} />
      <PublicGallery photos={data.photos} />
      <PublicModList
        modifications={data.modifications}
        hideFinancials={data.profile.hideFinancials}
      />
      <footer className="pb-2 text-center text-[0.72rem] text-[color:var(--vd-muted)]">
        Powered by ZeloxTag · Digitale Fahrzeugakte
      </footer>
    </main>
  );
}
