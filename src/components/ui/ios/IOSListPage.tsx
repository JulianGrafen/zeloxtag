import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { IOSPageHeader } from "./IOSPageHeader";
import { IOSScreen } from "./IOSScreen";

const LIST_PAGE_MAX_WIDTH = "max-w-lg";

export type IOSListPageProps = {
  title: string;
  subtitle?: ReactNode;
  backHref: string;
  backLabel?: string;
  children: ReactNode;
  /** Fixed-position chrome (FAB, bottom bar) rendered outside the scroll column. */
  overlay?: ReactNode;
  className?: string;
};

/** Forced-dark page for lists behind dashboard tiles: large title, inset-grouped body. */
export function IOSListPage({
  title,
  subtitle,
  backHref,
  backLabel = "Dashboard",
  children,
  overlay,
  className,
}: IOSListPageProps) {
  return (
    <IOSScreen>
      <IOSPageHeader
        title={title}
        subtitle={subtitle}
        backHref={backHref}
        backLabel={backLabel}
        maxWidthClassName={LIST_PAGE_MAX_WIDTH}
      />
      <main
        className={cn(
          "mx-auto flex w-full flex-col gap-6 px-4 pb-28 pt-3",
          LIST_PAGE_MAX_WIDTH,
          className,
        )}
      >
        {children}
      </main>
      {overlay}
    </IOSScreen>
  );
}
