import Image from "next/image";

import type { PublicShowcaseB2bPartner } from "@/lib/vehicles/public-showcase-data";
import { cn } from "@/lib/utils";

type ShowcasePartnerLogoMarkProps = {
  partner: PublicShowcaseB2bPartner;
  size?: "sm" | "md";
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-5 w-[4.75rem] max-w-[38vw]",
  md: "h-7 w-[6.25rem] max-w-[42vw]",
} as const;

/** White partner wordmark for Umbauten headers and carousel cards. */
export function ShowcasePartnerLogoMark({
  partner,
  size = "md",
  className,
}: ShowcasePartnerLogoMarkProps) {
  const logoSrc = partner.logoSrc?.trim();
  if (!logoSrc) return null;

  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden",
        SIZE_CLASS[size],
        className,
      )}
    >
      <Image
        src={logoSrc}
        alt={partner.logoAlt ?? partner.name}
        fill
        sizes={size === "sm" ? "80px" : "110px"}
        className="object-contain object-left"
        unoptimized
      />
    </span>
  );
}
