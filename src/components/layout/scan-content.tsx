import type { ReactNode } from "react";

interface ScanContentProps {
  children: ReactNode;
  className?: string;
  /** Wider layout for review steps (e.g. ABE wizard). */
  wide?: boolean;
  centered?: boolean;
}

/**
 * Standard inner wrapper for scan / dashboard surfaces inside AppShell.
 */
export function ScanContent({
  children,
  className = "",
  wide = false,
  centered = false,
}: ScanContentProps) {
  return (
    <div
      className={[
        "mx-auto flex w-full flex-col gap-5 px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5",
        wide ? "max-w-5xl" : "max-w-lg",
        centered ? "min-h-[calc(100dvh-env(safe-area-inset-top))] justify-center pb-12" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
