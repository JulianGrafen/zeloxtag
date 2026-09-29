"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { resolveZeloxTagShopUrl } from "@/lib/hardware/zelox-tag-product-url";

import {
  HARDWARE_UPSELL_BENEFITS,
  HARDWARE_UPSELL_EYEBROW,
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
        className="vd-surface-card overflow-hidden border border-[color:var(--vd-border)] bg-[#141418] p-5 sm:p-6"
        aria-labelledby="hardware-upsell-title"
      >
        <p
          className="text-[0.68rem] font-semibold tracking-[0.16em] text-[color:var(--vd-muted)] uppercase"
        >
          {HARDWARE_UPSELL_EYEBROW}
        </p>
        <h2
          id="hardware-upsell-title"
          className="claim-title mt-3 text-balance text-[color:var(--vd-text)]"
        >
          {HARDWARE_UPSELL_HEADLINE}
        </h2>
        <p className="mt-3 text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
          {HARDWARE_UPSELL_SUBTEXT}
        </p>

        <ul className="mt-5 space-y-2.5" aria-label="Vorteile des V4A-Tags">
          {HARDWARE_UPSELL_BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex gap-2.5 text-[0.82rem] leading-snug text-[color:var(--vd-text)]"
            >
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--vd-accent)]"
                aria-hidden
              />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <a
            href={shopUrl}
            className="claim-cta inline-flex min-h-11 items-center justify-center px-5 text-center no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {HARDWARE_UPSELL_PRIMARY_CTA}
          </a>
          <button
            type="button"
            className="min-h-11 text-left text-[0.85rem] font-medium leading-snug text-[color:var(--vd-muted)] underline-offset-4 hover:text-[color:var(--vd-text)] hover:underline sm:text-center"
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
