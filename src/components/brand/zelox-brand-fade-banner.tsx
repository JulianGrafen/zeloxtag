import { ZeloxBrandWordmark } from "@/components/brand/zelox-brand-wordmark";
import { cn } from "@/lib/utils";

type ZeloxBrandFadeBannerProps = {
  /** Schwarzer Verlauf unter dem Wordmark (z. B. aus bei 3D-Tag direkt darunter). */
  bottomFade?: boolean;
};

/** Schwarzer Balken + optional Verlauf — Login, Dashboard, Claim, Showcase. */
export function ZeloxBrandFadeBanner({
  bottomFade = true,
}: ZeloxBrandFadeBannerProps) {
  return (
    <div
      className={cn(
        "pointer-events-none relative w-full",
        !bottomFade && "zelox-brand-fade-banner--solid",
      )}
    >
      <div
        className={cn(
          "zelox-brand-fade-banner__bar px-5 pb-2.5 pt-[max(0.65rem,env(safe-area-inset-top))]",
        )}
      >
        <p className="text-center">
          <ZeloxBrandWordmark size="banner" className="text-white" />
        </p>
      </div>
      {bottomFade ? (
        <div className="zelox-brand-fade-banner__fade" aria-hidden>
          <div className="zelox-brand-fade-banner__tail" />
          <div className="zelox-brand-fade-banner__tail-halo" />
        </div>
      ) : null}
    </div>
  );
}
