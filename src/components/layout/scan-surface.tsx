import type { ReactNode } from "react";

import { ScanContent } from "./scan-content";

interface ScanSurfaceProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  wide?: boolean;
  centered?: boolean;
}

/**
 * Full-page scan shell (atmosphere + content). Use when AppShell is not present.
 */
export function ScanSurface({
  children,
  className = "",
  contentClassName = "",
  wide = false,
  centered = false,
}: ScanSurfaceProps) {
  return (
    <div
      className={`vd-root relative min-h-dvh overflow-x-hidden ${className}`.trim()}
    >
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />
      <div className="relative z-10">
        <ScanContent
          wide={wide}
          centered={centered}
          className={contentClassName}
        >
          {children}
        </ScanContent>
      </div>
    </div>
  );
}
