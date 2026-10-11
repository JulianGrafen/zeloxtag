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
        className="hardware-upsell-widget max-h-[min(24rem,68dvh)] overflow-hidden rounded-[var(--vd-radius-panel)] border shadow-[var(--vd-shadow)] sm:max-h-none"
        aria-labelledby="hardware-upsell-title"
      >
        <div className="grid min-h-0 sm:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] sm:items-stretch">
          <div
            className="hardware-upsell-widget__stage relative shrink-0 border-b border-white/[0.08] py-0.5 sm:border-b-0 sm:border-r sm:py-0"
          >
            <div className="hardware-upsell-model-slot">
              <ClaimTagModelHero
                tagUuid={modelUuid}
                presentation="hardware-upsell"
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-col p-3 sm:justify-center sm:p-4 sm:py-5">
            <div
              className="min-h-0 max-h-[min(9.5rem,26dvh)] overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:max-h-none sm:overflow-visible"
              tabIndex={0}
              aria-label="V4A-Tag Informationen"
            >
              <p
                className="text-[0.58rem] font-semibold tracking-[0.14em] text-[color:var(--hardware-upsell-muted)] uppercase sm:text-[0.62rem]"
              >
                {HARDWARE_UPSELL_EYEBROW}
              </p>
              <h2
                id="hardware-upsell-title"
                className="claim-title mt-1.5 text-balance text-[1.05rem] leading-[1.18] text-[color:var(--hardware-upsell-fg)] sm:mt-2 sm:text-[1.32rem] sm:leading-[1.15]"
              >
                {HARDWARE_UPSELL_HEADLINE}
              </h2>
              <p className="mt-1.5 text-[0.75rem] leading-snug text-[color:var(--hardware-upsell-muted)] sm:mt-2 sm:text-[0.8rem]">
                {HARDWARE_UPSELL_SUBTEXT}
              </p>

              <ul
                className="mt-2 space-y-1 sm:mt-3 sm:space-y-1.5"
                aria-label="Vorteile des V4A-Tags"
              >
                {HARDWARE_UPSELL_BENEFITS.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex gap-2 text-[0.72rem] leading-snug text-[color:var(--hardware-upsell-fg)] sm:text-[0.76rem]"
                  >
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-300"
                      aria-hidden
                    />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 flex shrink-0 flex-col gap-2 border-t border-white/[0.06] pt-3 sm:mt-4 sm:border-t-0 sm:pt-0 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href={shopUrl}
                className="claim-cta inline-flex min-h-10 items-center justify-center px-4 text-center text-[0.88rem] no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {HARDWARE_UPSELL_PRIMARY_CTA}
              </a>
              <button
                type="button"
                className="min-h-10 text-left text-[0.8rem] font-medium leading-snug text-[color:var(--hardware-upsell-muted)] underline-offset-4 hover:text-[color:var(--hardware-upsell-fg)] hover:underline sm:text-center"
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
