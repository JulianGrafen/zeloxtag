import Image from "next/image";

import { landingHeroShowcase } from "@/data/landingContent";
import { cn } from "@/lib/utils";

type LandingTagProductImageProps = {
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function LandingTagProductImage({
  className,
  priority = false,
  sizes = "(max-width: 1024px) 88vw, 20rem",
}: LandingTagProductImageProps) {
  return (
    <Image
      src={landingHeroShowcase.tagImageSrc}
      alt={landingHeroShowcase.tagImageAlt}
      width={502}
      height={460}
      priority={priority}
      sizes={sizes}
      draggable={false}
      className={cn("h-auto w-full max-w-[20rem] object-contain", className)}
    />
  );
}
