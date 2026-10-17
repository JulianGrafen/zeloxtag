import {
  PaywallVehicleHeroVisual,
  type PaywallVehicleHeroProps,
} from "@/components/billing/paywall/paywall-vehicle-hero-visual";
import type { PaywallVisualKind } from "@/lib/billing/paywall-personalization";
import { cn } from "@/lib/utils";

export function PaywallGoalVisual({
  kind,
  ariaLabel,
  className,
  vehicleHero,
}: {
  kind: PaywallVisualKind;
  ariaLabel: string;
  compact?: boolean;
  className?: string;
  vehicleHero?: Partial<PaywallVehicleHeroProps> | null;
}) {
  if (kind === "vehicle_hero" || vehicleHero) {
    return (
      <PaywallVehicleHeroVisual
        className={className}
        ariaLabel={ariaLabel}
        vehicleImage={vehicleHero?.vehicleImage ?? null}
        vehicleImageFallback={vehicleHero?.vehicleImageFallback}
        vehicleImagePreviewFallback={vehicleHero?.vehicleImagePreviewFallback}
        vehicleImageFrameless={vehicleHero?.vehicleImageFrameless ?? false}
        vehicleImageAlt={vehicleHero?.vehicleImageAlt ?? ariaLabel}
      />
    );
  }

  return (
    <figure
      className={cn("px-0 py-0", className)}
      aria-label={ariaLabel}
    />
  );
}
