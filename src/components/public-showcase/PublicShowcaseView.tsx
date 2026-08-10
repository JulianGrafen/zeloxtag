import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

import { PublicGallery } from "./PublicGallery";
import { PublicHeader } from "./PublicHeader";
import { PublicModList } from "./PublicModList";

type PublicShowcaseViewProps = {
  data: PublicShowcasePayload;
  /** Owner/contributor link back to the private dashboard. */
  dashboardHref?: string | null;
};

export function PublicShowcaseView({
  data,
  dashboardHref = null,
}: PublicShowcaseViewProps) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
      {dashboardHref ? (
        <div className="flex justify-end">
          <a
            href={dashboardHref}
            className="inline-flex min-h-11 items-center rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-2 text-[0.82rem] font-medium text-[color:var(--vd-text)]"
          >
            Zum Dashboard
          </a>
        </div>
      ) : null}
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
