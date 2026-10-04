import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AutomotiveFeatureLayoutProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Extra bottom padding for fixed FAB (e.g. pb-28). */
  bottomPad?: "default" | "fab";
};

export function AutomotiveFeatureLayout({
  children,
  className,
  contentClassName,
  bottomPad = "default",
}: AutomotiveFeatureLayoutProps) {
  const pb =
    bottomPad === "fab"
      ? "pb-28"
      : "pb-10";

  return (
    <div className={cn("vd-root relative min-h-dvh overflow-x-hidden", className)}>
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />
      <div
        className={cn(
          "relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5",
          pb,
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
