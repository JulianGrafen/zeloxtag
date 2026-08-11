import { InvoicesView } from "@/components/vehicle-dashboard";
import { DEMO_SHOWCASE_BACK_HREF } from "@/lib/tags/demo-showcase";

export default function RechnungenPage() {
  return (
    <InvoicesView
      vehicleModel="328i"
      backHref={DEMO_SHOWCASE_BACK_HREF}
    />
  );
}
