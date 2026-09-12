import { showroom } from "@/components/public-showcase/showroom-styles";

type ZeloxBrandFadeBannerProps = {
  /** Schwarzer Verlauf unter dem Wordmark (z. B. aus bei 3D-Tag direkt darunter). */
  bottomFade?: boolean;
};

/** Schwarzer Balken + optional Verlauf — Login, Dashboard, Claim, Showcase. */
export function ZeloxBrandFadeBanner({
  bottomFade = true,
}: ZeloxBrandFadeBannerProps) {
  return (
    <div className="pointer-events-none relative w-full">
      <div className="bg-black px-5 pb-2.5 pt-[max(0.65rem,env(safe-area-inset-top))]">
        <p className={`text-center ${showroom.brandWordmark}`}>
          <span className="sr-only">ZeloxTag</span>
          <span aria-hidden>ZELOX TAG</span>
        </p>
      </div>
      {bottomFade ? (
        <div
          className="h-[4.5rem] bg-gradient-to-b from-black via-black/85 to-transparent sm:h-[5.5rem]"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
