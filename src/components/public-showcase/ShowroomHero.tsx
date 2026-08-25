import Image from "next/image";

import {
  instagramHandleLabel,
  instagramProfileUrl,
} from "@/lib/vehicles/instagram-handle";
import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import { InstagramGlyph } from "./InstagramGlyph";
import { showroom } from "./showroom-styles";

type ShowroomHeroProps = {
  profile: PublicShowcaseProfile;
};

export function ShowroomHero({ profile }: ShowroomHeroProps) {
  const title = [profile.make, profile.model].filter(Boolean).join(" ");
  const yearLabel = profile.year ? String(profile.year) : null;

  return (
    <header className="relative isolate min-h-[78dvh] overflow-hidden">
      <div className="absolute inset-0 bg-black" aria-hidden>
        {profile.heroImageSrc ? (
          <Image
            src={profile.heroImageSrc}
            alt=""
            fill
            priority
            unoptimized
            className="object-cover object-center"
            sizes="100vw"
          />
        ) : null}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black via-black/55 to-transparent"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex min-h-[78dvh] flex-col justify-end px-5 pb-8 pt-[max(4.5rem,env(safe-area-inset-top))]">
        <p className={showroom.kicker}>{profile.make || "ZeloxTag"}</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[2.05rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[2.45rem]">
          {title || "Fahrzeug"}
        </h1>
        {yearLabel ? (
          <p className="mt-2 text-[0.95rem] font-medium text-white/65">
            Baujahr {yearLabel}
          </p>
        ) : null}

        {profile.instagramHandle ? (
          <a
            href={instagramProfileUrl(profile.instagramHandle)}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-5 ${showroom.pill}`}
          >
            <InstagramGlyph className="h-4 w-4 text-white" />
            {instagramHandleLabel(profile.instagramHandle)}
          </a>
        ) : null}
      </div>
    </header>
  );
}
