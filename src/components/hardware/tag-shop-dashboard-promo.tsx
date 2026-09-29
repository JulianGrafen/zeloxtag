"use client";

import { useState } from "react";

import { resolveZeloxTagShopUrl } from "@/lib/hardware/zelox-tag-product-url";

import { LinkTagModal } from "./link-tag-modal";

type TagShopDashboardPromoProps = {
  vehicleId: string;
  userId: string;
  userEmail?: string | null;
};

export function TagShopDashboardPromo({
  vehicleId,
  userId,
  userEmail,
}: TagShopDashboardPromoProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const shopUrl = resolveZeloxTagShopUrl({ userId, email: userEmail });

  return (
    <>
      <section
        className="rounded-[var(--vd-radius-panel)] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3.5 shadow-[var(--vd-shadow-sm)]"
        aria-labelledby="tag-shop-dashboard-promo-title"
      >
        <p
          id="tag-shop-dashboard-promo-title"
          className="text-[0.85rem] font-medium leading-snug text-[color:var(--vd-text)]"
        >
          Mod-Liste &amp; Docs per QR am Auto
        </p>
        <p className="mt-1 text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
          Öffentliches Showcase und Scan am Fahrzeug brauchen einen physischen
          Zelox Tag im Motorraum.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[0.78rem] font-semibold uppercase tracking-wide text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            Zelox Tag erforderlich
            <span aria-hidden>↗</span>
          </a>
          <span className="hidden text-[color:var(--vd-border)] sm:inline" aria-hidden>
            ·
          </span>
          <button
            type="button"
            className="text-left text-[0.82rem] font-medium text-[color:var(--vd-muted)] underline-offset-2 hover:text-[color:var(--vd-text)] hover:underline"
            onClick={() => setLinkOpen(true)}
          >
            Tag verknüpfen
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
