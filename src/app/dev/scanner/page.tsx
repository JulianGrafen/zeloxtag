import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ScannerDevPreview } from "@/app/dev/scanner/scanner-dev-preview";

/** Local mock scanner for invoice capture UI work (no camera / auth). */
export default function DevScannerPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <ScannerDevPreview />
    </Suspense>
  );
}
