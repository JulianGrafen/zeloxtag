import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { IOS_CARD, IOS_SECTION_FOOTER, IOS_SECTION_HEADER } from "./ios-styles";

export type InsetGroupedCardProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  cardClassName?: string;
  id?: string;
};

/** Native inset-grouped section: header/footer outside, one card on black. */
export function InsetGroupedCard({
  header,
  footer,
  children,
  className,
  cardClassName,
  id,
}: InsetGroupedCardProps) {
  return (
    <section id={id} data-ios-ui className={cn("ios-ui w-full", className)}>
      {header ? <h2 className={IOS_SECTION_HEADER}>{header}</h2> : null}
      <div
        className={cn(
          "min-w-0 max-w-full overflow-hidden",
          IOS_CARD,
          cardClassName,
        )}
      >
        {children}
      </div>
      {footer ? <p className={IOS_SECTION_FOOTER}>{footer}</p> : null}
    </section>
  );
}
