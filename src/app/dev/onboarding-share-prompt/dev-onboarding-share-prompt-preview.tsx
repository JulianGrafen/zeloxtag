"use client";

import { useState } from "react";

import { DashboardShowcaseSharePrompt } from "@/components/onboarding/dashboard-showcase-share-prompt";
import { getMockTagScan, MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

/** Local UI preview of the post-tour showcase share modal (E36 mock vehicle). */
export function DevOnboardingSharePromptPreview() {
  const [open, setOpen] = useState(true);
  const scan = getMockTagScan(MOCK_TAG_UUIDS.active);
  const vehicle = scan?.vehicle;
  const documents = scan?.documents ?? [];

  if (!vehicle) {
    return (
      <p className="p-8 text-sm text-white/70">Mock-Fahrzeug nicht verfügbar.</p>
    );
  }

  return (
    <div className="min-h-dvh bg-[color:var(--vd-bg)]">
      {!open ? (
        <div className="flex min-h-dvh items-center justify-center p-6">
          <button
            type="button"
            className="rounded-xl bg-[color:var(--vd-accent)] px-5 py-3 text-sm font-semibold text-white"
            onClick={() => setOpen(true)}
          >
            Showcase-Share-Popup öffnen
          </button>
        </div>
      ) : null}

      <DashboardShowcaseSharePrompt
        open={open}
        vehicle={vehicle}
        documents={documents}
        tagUuid={MOCK_TAG_UUIDS.active}
        onDismiss={() => setOpen(false)}
      />
    </div>
  );
}
