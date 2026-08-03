import type { ReactNode } from "react";

import { Navbar } from "./navbar";

interface AppShellProps {
  children: ReactNode;
  /** Hide navbar on immersive scan/claim surfaces when needed. */
  showNavbar?: boolean;
}

export function AppShell({ children, showNavbar = true }: AppShellProps) {
  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />
      <div className="relative z-10 flex min-h-dvh flex-col">
        {showNavbar ? <Navbar /> : null}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
