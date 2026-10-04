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

export type ClaimTagModelPresentation = "claim" | "hardware-upsell";

type ClaimTagModelHeroProps = {
  tagUuid: string;
  presentation?: ClaimTagModelPresentation;
};

export function ClaimTagModelHero({
  tagUuid,
  presentation = "claim",
}: ClaimTagModelHeroProps) {
  const { reduceMotion } = useClaimMotion();
  const isHardware = presentation === "hardware-upsell";

  return (
    <ClaimTagModelErrorBoundary>
      <div
        className={
          isHardware
            ? "claim-intro-model-slot claim-intro-model-slot--hardware"
            : "claim-intro-model-slot"
        }
        aria-hidden
      >
        <ClaimTagModelCanvas
          tagUuid={tagUuid}
          reduceMotion={reduceMotion}
          presentation={presentation}
        />
      </div>
    </ClaimTagModelErrorBoundary>
  );
}
