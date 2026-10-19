import { ZeloxBrandWordmark } from "@/components/brand/zelox-brand-wordmark";
import { cn } from "@/lib/utils";

type ZeloxBrandFadeBannerProps = {
  /** Schwarzer Verlauf unter dem Wordmark (z. B. aus bei 3D-Tag direkt darunter). */
  bottomFade?: boolean;
  /** Unter dem Wordmark im schwarzen Bereich (z. B. Login/Register). */
  tagline?: string;
  /** Zweite Zeile unter {@link tagline}. */
  subtagline?: string;
};

/** Schwarzer Balken + optional Verlauf — Login, Dashboard, Claim, Showcase. */
export function ZeloxBrandFadeBanner({
  bottomFade = true,
  tagline,
  subtagline,
}: ZeloxBrandFadeBannerProps) {
  return (
    <div
      className={cn(
        "pointer-events-none relative w-full overflow-x-clip",
        !bottomFade && "zelox-brand-fade-banner--solid",
      )}
    >
      <div
        className={cn(
          "zelox-brand-fade-banner__bar px-5 pt-[max(0.65rem,env(safe-area-inset-top))]",
          tagline ? "flex flex-col items-center pb-6 sm:pb-8" : "pb-2.5",
        )}
      >
        <p className="w-full shrink-0 text-center">
          <ZeloxBrandWordmark size="banner" className="text-white" />
        </p>
        {tagline ? (
          <div className="flex w-full min-h-[4.75rem] flex-col items-center justify-center gap-1.5 px-2 sm:min-h-[5.35rem] sm:gap-2">
            <p className="w-full text-center font-[family-name:var(--font-display)] text-[1.12rem] font-bold leading-snug tracking-[-0.02em] text-white sm:text-[1.28rem]">
              {tagline}
            </p>
            {subtagline ? (
              <p className="w-full text-center font-[family-name:var(--font-display)] text-[0.88rem] font-medium leading-snug tracking-[-0.01em] text-white/82 sm:text-[0.95rem]">
                {subtagline}
              </p>
            ) : null}
          </div>
        ) : null}
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
