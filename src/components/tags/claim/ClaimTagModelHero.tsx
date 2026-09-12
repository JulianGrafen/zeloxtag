"use client";

import dynamic from "next/dynamic";

import { ClaimTagModelErrorBoundary } from "./ClaimTagModelErrorBoundary";
import { useClaimMotion } from "./claim-motion";

const ClaimTagModelCanvas = dynamic(
  () =>
    import("./ClaimTagModelCanvas").then((mod) => ({
      default: mod.ClaimTagModelCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="claim-intro-model-slot claim-intro-model-slot--loading"
        aria-hidden
      />
    ),
  },
);

type ClaimTagModelHeroProps = {
  tagUuid: string;
};

export function ClaimTagModelHero({ tagUuid }: ClaimTagModelHeroProps) {
  const { reduceMotion } = useClaimMotion();

  return (
    <ClaimTagModelErrorBoundary>
      <div className="claim-intro-model-slot" aria-hidden>
        <ClaimTagModelCanvas tagUuid={tagUuid} reduceMotion={reduceMotion} />
      </div>
    </ClaimTagModelErrorBoundary>
  );
}
