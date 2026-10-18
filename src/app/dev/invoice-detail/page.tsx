import { notFound } from "next/navigation";

import { InvoiceDetailDevPreview } from "@/app/dev/invoice-detail/invoice-detail-dev-preview";

/** Local mock for saved invoice / Beleg detail UI (no auth). */
export default function DevInvoiceDetailPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <InvoiceDetailDevPreview />;
}
