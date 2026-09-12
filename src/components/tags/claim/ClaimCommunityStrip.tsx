"use client";

import { CLAIM_INTRO_PILLARS } from "./claim-intro-copy";

export function ClaimCommunityStrip() {
  return (
    <ul className="claim-intro-pillars" aria-label="Das bringt dir ZeloxTag">
      {CLAIM_INTRO_PILLARS.map((label) => (
        <li key={label}>{label}</li>
      ))}
    </ul>
  );
}
