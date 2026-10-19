"use client";

import { CLAIM_INTRO_PILLARS } from "./claim-intro-copy";

export function ClaimCommunityStrip({
  items = CLAIM_INTRO_PILLARS,
  ariaLabel = "Das bringt dir ZeloxTag",
}: {
  items?: readonly string[];
  ariaLabel?: string;
}) {
  return (
    <ul className="claim-intro-pillars" aria-label={ariaLabel}>
      {items.map((label) => (
        <li key={label}>{label}</li>
      ))}
    </ul>
  );
}
