import { AbeDocumentsView } from "@/components/vehicle-dashboard";
import { DEMO_SHOWCASE_BACK_HREF } from "@/lib/tags/demo-showcase";

export default function AbePage() {
  return (
    <AbeDocumentsView
      vehicleModel="Supra"
      backHref={DEMO_SHOWCASE_BACK_HREF}
    />
  );
}
