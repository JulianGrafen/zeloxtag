"use client";

import type { ReactNode } from "react";

import { Navbar } from "@/components/layout/navbar";
import { IOSBottomTabBar } from "@/components/layout/ios-bottom-tab-bar";
import { usePlatformServices } from "@/services/platform/context/platform-services-context";
import { cn } from "@/lib/utils";

type AdaptiveNavShellProps = {
  showNavbar?: boolean;
  children: ReactNode;
};

/** Web top bar + native bottom tab bar; adds safe bottom padding on native. */
export function AdaptiveNavShell({
  showNavbar = true,
  children,
}: AdaptiveNavShellProps) {
  const { platform } = usePlatformServices();
  const isNative = platform.isNativePlatform;

  if (!showNavbar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!isNative ? <Navbar /> : null}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          isNative && "pb-[calc(4rem+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </div>
      {isNative ? <IOSBottomTabBar /> : null}
    </div>
  );
}
