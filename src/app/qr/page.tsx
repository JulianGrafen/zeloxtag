import type { Metadata } from "next";
import Link from "next/link";

import { NetworkMockQr } from "@/components/qr/network-mock-qr";

export const metadata: Metadata = {
  title: "ZeloxTag · Mock QR (Netzwerk)",
  description:
    "Scannbare Demo-QR-Codes für Claim-Flow und Dashboard im lokalen Netzwerk.",
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
            ZeloxTag
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[1.65rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            Mock QR zum Testen
          </h1>
          <p className="text-[0.9rem] leading-relaxed text-[color:var(--vd-muted)]">
            Am Mac diese Seite über die LAN-IP öffnen, QR mit dem Handy scannen.
            Handy und Rechner müssen im selben WLAN sein;{" "}
            <code className="font-mono text-[0.8rem]">npm run dev</code> muss
            laufen.
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
            Statische PNGs (aktuell{" "}
            <span className="font-mono">192.168.178.109</span>):{" "}
            <a
              className="underline underline-offset-2"
              href="/qr/mock-unclaimed-lan.png"
            >
              Unclaimed
            </a>
            {" · "}
            <a
              className="underline underline-offset-2"
              href="/qr/mock-active-lan.png"
            >
              Active
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
