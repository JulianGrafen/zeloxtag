import { InvoicesView } from "@/components/vehicle-dashboard";
import { DEMO_SHOWCASE_BACK_HREF } from "@/lib/tags/demo-showcase";

export default function RechnungenPage() {
  return (
    <InvoicesView
      vehicleModel="Supra"
      backHref={DEMO_SHOWCASE_BACK_HREF}
    />
  );
}
