import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { ScanContent } from "@/components/layout/scan-content";

export default function NotFound() {
  return (
    <AppShell showNavbar={false}>
      <ScanContent className="pb-12">
        <div className="claim-panel text-center">
          <p className="claim-kicker">404</p>
          <h1 className="claim-title mt-2">Seite nicht gefunden</h1>
          <p className="claim-copy mt-3">
            Diese Adresse existiert nicht oder wurde verschoben.
          </p>
          <Link href="/" className="claim-cta mt-6 inline-flex no-underline">
            Zur Startseite
          </Link>
        </div>
      </ScanContent>
    </AppShell>
  );
}
