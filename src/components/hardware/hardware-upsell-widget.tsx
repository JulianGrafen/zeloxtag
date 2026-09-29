"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { ClaimTagModelHero } from "@/components/tags/claim/ClaimTagModelHero";
import { resolveZeloxTagShopUrl } from "@/lib/hardware/zelox-tag-product-url";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

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
  /** QR on the 3D preview — defaults to demo tag when garage has no hardware yet. */
  tagModelUuid?: string | null;
}

export function HardwareUpsellWidget({
  vehicleId,
  userId,
  userEmail,
  tagModelUuid,
}: HardwareUpsellWidgetProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const shopUrl = resolveZeloxTagShopUrl({ userId, email: userEmail });
  const modelUuid =
    tagModelUuid?.trim() || MOCK_TAG_UUIDS.active;

  return (
    <>
      <section
        className="vd-surface-card overflow-hidden border border-[color:var(--vd-border)] bg-[#141418]"
        aria-labelledby="hardware-upsell-title"
      >
        <div className="grid sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] sm:items-stretch">
          <div
            className="relative border-b border-[color:var(--vd-border)] bg-[#0a0a0c] sm:border-b-0 sm:border-r"
          >
            <div className="hardware-upsell-model-slot">
              <ClaimTagModelHero tagUuid={modelUuid} />
            </div>
          </div>

          <div className="flex flex-col justify-center p-5 sm:p-6">
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
          </div>
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
