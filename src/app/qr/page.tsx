import type { Metadata } from "next";
import Link from "next/link";

import { NetworkMockQr } from "@/components/qr/network-mock-qr";

export const metadata: Metadata = {
  title: "ZeloxTag · Unclaimed QR",
  description:
    "Online-QR-Generator für den nächsten unclaimed ZeloxTag (Vercel / Produktion).",
};

export default function QrPage() {
  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-5">
        <header className="space-y-2">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            ZeloxTag · Online
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[1.65rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            Unclaimed QR
          </h1>
          <p className="text-[0.9rem] leading-relaxed text-[color:var(--vd-muted)]">
            Erzeugt echte Supabase-Tags (UUID) für physische Plaques. Scannen →
            Claim → Fahrzeug. Keine Demo-QR. Nach jedem Claim aktualisieren oder
            „Neuen Tag minten“. App-Host:{" "}
            <span className="font-mono text-[color:var(--vd-text)]">
              zeloxtag.vercel.app
            </span>
            , nicht der Shopify-Shop.
          </p>
        </header>

        <NetworkMockQr />

        <div className="flex flex-col gap-2 text-center text-[0.82rem]">
          <Link
            href="/"
            className="font-medium text-[color:var(--vd-muted)] underline-offset-2 hover:underline"
          >
            Zur Startseite
          </Link>
          <p className="text-[color:var(--vd-muted)]">
            Seite:{" "}
            <span className="font-mono text-[color:var(--vd-text)]">/qr</span>
          </p>
        </div>
      </main>
    </div>
  );
}
