"use client";

import { useState } from "react";

import { resolveZeloxTagShopUrl } from "@/lib/hardware/zelox-tag-product-url";

import {
  HARDWARE_UPSELL_HEADLINE,
  HARDWARE_UPSELL_PRIMARY_CTA,
  HARDWARE_UPSELL_SECONDARY_CTA,
  HARDWARE_UPSELL_SUBTEXT,
} from "./hardware-upsell-copy";
import { LinkTagModal } from "./link-tag-modal";

interface HardwareUpsellWidgetProps {
  vehicleId: string;
  userId: string;
  userEmail?: string | null;
}

export function HardwareUpsellWidget({
  vehicleId,
  userId,
  userEmail,
}: HardwareUpsellWidgetProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const shopUrl = resolveZeloxTagShopUrl({ userId, email: userEmail });

  return (
    <>
      <section
        className="vd-surface-card border border-[color:var(--vd-border)] bg-[#141418] p-5 sm:p-6"
        aria-labelledby="hardware-upsell-title"
      >
        <p className="claim-kicker text-[color:var(--vd-muted)]">V4A-Tag</p>
        <h2
          id="hardware-upsell-title"
          className="claim-title mt-2 text-[color:var(--vd-text)]"
        >
          {HARDWARE_UPSELL_HEADLINE}
        </h2>
        <p className="claim-copy mt-2 text-[0.9rem] leading-relaxed text-[color:var(--vd-muted)]">
          {HARDWARE_UPSELL_SUBTEXT}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={shopUrl}
            className="claim-cta inline-flex min-h-11 items-center justify-center px-5 no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {HARDWARE_UPSELL_PRIMARY_CTA}
          </a>
          <button
            type="button"
            className="text-[0.88rem] font-medium text-[color:var(--vd-text)] underline-offset-4 hover:underline"
            onClick={() => setLinkOpen(true)}
          >
            {HARDWARE_UPSELL_SECONDARY_CTA}
          </button>
        </div>
      </section>
      <LinkTagModal
        open={linkOpen}
        vehicleId={vehicleId}
        onClose={() => setLinkOpen(false)}
      />
    </>
  );
}
