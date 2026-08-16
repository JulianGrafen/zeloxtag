import Image from "next/image";

import {
  instagramHandleLabel,
  instagramProfileUrl,
} from "@/lib/vehicles/instagram-handle";
import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import { InstagramGlyph } from "./InstagramGlyph";

type ShowroomHeroProps = {
  profile: PublicShowcaseProfile;
  dashboardHref?: string | null;
};

export function ShowroomHero({
  profile,
  dashboardHref = null,
}: ShowroomHeroProps) {
  const title = [profile.make, profile.model].filter(Boolean).join(" ");
  const yearLabel = profile.year ? String(profile.year) : null;

  return (
    <header className="relative isolate min-h-[78dvh] overflow-hidden">
      <div className="absolute inset-0 bg-zinc-950" aria-hidden>
        {profile.heroImageSrc ? (
          <Image
            src={profile.heroImageSrc}
            alt=""
            fill
            priority
            unoptimized
            className="object-cover object-center opacity-60"
            sizes="100vw"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-zinc-950/25" />
      </div>

      {dashboardHref ? (
        <a
          href={dashboardHref}
          className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 inline-flex min-h-11 items-center rounded-full border border-white/15 bg-black/35 px-4 text-[0.78rem] font-medium text-zinc-100 backdrop-blur-md"
        >
          Dashboard
        </a>
      ) : null}

      <div className="relative z-10 flex min-h-[78dvh] flex-col justify-end px-5 pb-8 pt-[max(4.5rem,env(safe-area-inset-top))]">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-emerald-400/90">
          {profile.make || "ZeloxTag"}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[2.05rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[2.45rem]">
          {title || "Fahrzeug"}
        </h1>
        {yearLabel ? (
          <p className="mt-2 text-[0.95rem] font-medium text-zinc-300">
            Baujahr {yearLabel}
          </p>
        ) : null}

        {profile.instagramHandle ? (
          <a
            href={instagramProfileUrl(profile.instagramHandle)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-[0.82rem] font-semibold text-white backdrop-blur-md"
          >
            <InstagramGlyph className="h-4 w-4 text-white" />
            {instagramHandleLabel(profile.instagramHandle)}
          </a>
        ) : null}
      </div>
    </header>
  );
}
