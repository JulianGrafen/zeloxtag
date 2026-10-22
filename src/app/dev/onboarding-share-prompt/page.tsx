import { notFound } from "next/navigation";

import { DevOnboardingSharePromptPreview } from "./dev-onboarding-share-prompt-preview";

/** Post-onboarding „Bio-Link“ modal — dev-only (same component as after dashboard tour). */
export default function DevOnboardingSharePromptPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <DevOnboardingSharePromptPreview />;
}
