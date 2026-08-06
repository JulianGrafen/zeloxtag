import { OilIntervalsView } from "@/components/vehicle-dashboard";
import { DEMO_SHOWCASE_BACK_HREF } from "@/lib/tags/demo-showcase";

export default function IntervallePage() {
  return (
    <OilIntervalsView
      vehicleModel="Supra"
      backHref={DEMO_SHOWCASE_BACK_HREF}
    />
  );
}
