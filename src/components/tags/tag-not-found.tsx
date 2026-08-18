import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";

import { ScanContent } from "@/components/layout/scan-content";

/**
 * Clean 404 for unknown / invalid ZeloxTag UUIDs (State C).
 */
export function TagNotFound() {
  return (
    <ScanContent centered className="pb-12">
      <div className="vd-surface-card vd-anim-header p-6">
        <div className="vd-icon-badge h-12 w-12">
          <TriangleAlert className="h-5 w-5" aria-hidden />
        </div>
        <p className="claim-kicker mt-4">404</p>
        <h1 className="claim-title mt-2">Tag nicht gefunden</h1>
        <p className="claim-copy mt-2">
          Für diesen QR-Code existiert kein ZeloxTag-Eintrag. Prüfe den Scan oder
          kontaktiere den Support.
        </p>

        <Link
          href="/"
          className="vd-back-pill mt-6 inline-flex items-center gap-2 font-semibold no-underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zur Startseite
        </Link>
      </div>
    </ScanContent>
  );
}
