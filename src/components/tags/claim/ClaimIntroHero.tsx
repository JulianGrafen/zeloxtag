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
import {
  DIGITAL_GARAGE_REGISTER_HEADLINE,
  DIGITAL_GARAGE_REGISTER_LEAD,
} from "@/lib/onboarding/digital-garage-register-copy";

type ClaimIntroHeroProps = {
  variant?: "tag" | "digital";
  tagUuid?: string;
  needsAccount: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  onStart: () => void;
};

export function ClaimIntroHero({
  variant = "tag",
  tagUuid,
  needsAccount,
  isAuthenticated,
  userEmail,
  onStart,
}: ClaimIntroHeroProps) {
  const isDigital = variant === "digital";
  const headline = isDigital ? DIGITAL_GARAGE_REGISTER_HEADLINE : CLAIM_INTRO_HEADLINE;
  const lead = isDigital ? DIGITAL_GARAGE_REGISTER_LEAD : CLAIM_INTRO_LEAD;
  const statusLabel = isDigital ? "Garage bereit" : "Tag bereit";
  const ctaLabel = isDigital ? "Jetzt starten" : "Jetzt aktivieren";
  const loginNext = isDigital ? "/register" : `/v/${tagUuid ?? ""}`;
  const loginHref = `/login?next=${encodeURIComponent(loginNext)}`;

  return (
    <section className="claim-intro claim-premium-intro flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="zelox-brand-banner-bleed pointer-events-none relative z-20 -mt-[max(1.25rem,env(safe-area-inset-top))]">
        <ClaimBrandBanner />
      </div>

      {!isDigital && tagUuid ? <ClaimTagModelHero tagUuid={tagUuid} /> : null}

      <div className="relative z-[1] flex flex-col gap-8 pt-1">
        <div className="space-y-5">
          <span className="claim-intro-status">
            <span className="claim-intro-status__dot" aria-hidden />
            {statusLabel}
          </span>

          <h1 className="claim-intro-headline">{headline}</h1>

          <p className="claim-intro-lead">{lead}</p>

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
            {ctaLabel}
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
              <Link href={loginHref} className="claim-later">
                Bereits ein Konto? Anmelden
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
