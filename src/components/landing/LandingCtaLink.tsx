import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { landingSurface } from "./landing-styles";

type LandingCtaVariant = "primary" | "glass" | "quiet";

type LandingCtaLinkProps = {
  href: string;
  variant: LandingCtaVariant;
  children: ReactNode;
  className?: string;
};

const VARIANT_CLASS: Record<LandingCtaVariant, string> = {
  primary: landingSurface.primaryCta,
  glass: landingSurface.glassCta,
  quiet: landingSurface.quietCta,
};

export function LandingCtaLink({
  href,
  variant,
  children,
  className,
}: LandingCtaLinkProps) {
  const classes = cn(VARIANT_CLASS[variant], className);
  const isHash = href.startsWith("#");
  const isExternal = href.startsWith("https://") || href.startsWith("http://");

  if (isHash || isExternal) {
    return (
      <a
        href={href}
        className={classes}
        {...(isExternal
          ? { target: "_blank", rel: "noopener noreferrer" }
          : undefined)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
