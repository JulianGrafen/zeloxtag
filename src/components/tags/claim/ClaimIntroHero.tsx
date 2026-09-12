"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ClaimBrandBanner } from "./ClaimBrandBanner";
import { ClaimCommunityStrip } from "./ClaimCommunityStrip";
import { ClaimTagModelHero } from "./ClaimTagModelHero";
import {
  CLAIM_INTRO_FOOTNOTE,
  CLAIM_INTRO_HEADLINE,
  CLAIM_INTRO_LEAD,
} from "./claim-intro-copy";

type ClaimIntroHeroProps = {
  tagUuid: string;
  needsAccount: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  onStart: () => void;
};

export function ClaimIntroHero({
  tagUuid,
  needsAccount,
  isAuthenticated,
  userEmail,
  onStart,
}: ClaimIntroHeroProps) {
  return (
    <section className="claim-intro claim-premium-intro flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="claim-intro-brand-bleed pointer-events-none relative z-20 -mt-[max(1.25rem,env(safe-area-inset-top))]">
        <ClaimBrandBanner />
      </div>

      <div className="claim-intro-bridge" aria-hidden />

      <ClaimTagModelHero tagUuid={tagUuid} />

      <div className="relative z-[1] flex flex-col gap-8 pt-1">
        <div className="space-y-5">
          <span className="claim-intro-status">
            <span className="claim-intro-status__dot" aria-hidden />
            Tag bereit
          </span>

          <h1 className="claim-intro-headline">{CLAIM_INTRO_HEADLINE}</h1>

          <p className="claim-intro-lead">{CLAIM_INTRO_LEAD}</p>

          <ClaimCommunityStrip />
        </div>

        <div className="space-y-3">
          {isAuthenticated && userEmail ? (
            <p className="text-center text-[0.8rem] text-[color:var(--vd-muted)]">
              Angemeldet als{" "}
              <span className="font-medium text-[color:var(--vd-text)]">
                {userEmail}
              </span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={onStart}
            className="claim-cta inline-flex w-full items-center justify-center gap-2"
          >
            Jetzt aktivieren
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          {needsAccount ? (
            <p className="text-center text-[0.78rem] text-[color:var(--vd-muted)]">
              Im nächsten Schritt legst du dein Konto an.
            </p>
          ) : null}
          <p className="claim-intro-footnote text-center">{CLAIM_INTRO_FOOTNOTE}</p>
          <div className="flex flex-col gap-2 pt-1">
            <Link href="/" className="claim-later">
              Später fortfahren
            </Link>
            {!isAuthenticated ? (
              <Link
                href={`/login?next=${encodeURIComponent(`/v/${tagUuid}`)}`}
                className="claim-later"
              >
                Bereits ein Konto? Anmelden
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
