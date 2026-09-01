import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";

import { ScanContent } from "@/components/layout/scan-content";

/**
 * 404 for identifiers that cannot be a physical plaque (not a UUID / demo slug).
 * Unclaimed and unknown plaque UUIDs share the claim landing instead — otherwise
 * GET `/v/{uuid}` is an inventory oracle.
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
          Dieser Link ist kein gültiges ZeloxTag. Prüfe den Scan oder
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
