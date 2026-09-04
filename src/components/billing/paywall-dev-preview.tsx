"use client";

import { useState } from "react";

import { ProPaywallModal } from "@/components/billing/pro-paywall-modal";
import { ProPaywallSection } from "@/components/billing/pro-paywall-section";
import { FEATURE } from "@/lib/permissions/feature-access";

const PREVIEW_TAG = "demo-active-tag";

export function PaywallDevPreview() {
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10">
      <header className="space-y-2">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
          Dev Preview
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-[1.5rem] font-semibold tracking-[-0.03em]">
          Paywall Vorschau
        </h1>
        <p className="text-[0.85rem] text-[color:var(--vd-muted)]">
          Inline-Section und Modal — nur in der lokalen Entwicklung.
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="claim-cta-sm mt-2"
        >
          Modal öffnen
        </button>
      </header>

      <ProPaywallSection
        successPath={`/v/${PREVIEW_TAG}`}
        cancelPath={`/v/${PREVIEW_TAG}/abo`}
        dismissHref={`/v/${PREVIEW_TAG}`}
      />

      <ProPaywallModal
        open={modalOpen}
        feature={FEATURE.DOCUMENT_VAULT}
        tagUuid={PREVIEW_TAG}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
