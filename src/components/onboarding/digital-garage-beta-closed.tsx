import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { ScanContent } from "@/components/layout/scan-content";
import { DIGITAL_GARAGE_BETA_FULL_MESSAGE } from "@/lib/onboarding/digital-garage-beta";

type DigitalGarageBetaClosedProps = {
  maxSlots: number;
};

export function DigitalGarageBetaClosed({ maxSlots }: DigitalGarageBetaClosedProps) {
  return (
    <AppShell showNavbar={false}>
      <ScanContent className="max-w-md gap-6 pb-12">
        <div className="vd-surface-card p-6">
          <p className="claim-kicker">Beta</p>
          <h1 className="claim-title mt-2">Alle Plätze vergeben</h1>
          <p className="claim-copy mt-3">{DIGITAL_GARAGE_BETA_FULL_MESSAGE}</p>
          <p className="mt-3 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
            Limit: {maxSlots} Plätze für die digitale Garage ohne Tag. Hast du
            bereits einen ZeloxTag am Auto, aktivierst du ihn wie gewohnt per
            QR-Scan — der Claim ist nicht begrenzt.
          </p>
          <Link href="/" className="claim-cta mt-6 inline-flex w-full justify-center no-underline">
            Zur Startseite
          </Link>
        </div>
      </ScanContent>
    </AppShell>
  );
}
