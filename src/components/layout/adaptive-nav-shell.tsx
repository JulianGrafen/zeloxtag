"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { Navbar } from "@/components/layout/navbar";
import { IOSBottomTabBar } from "@/components/layout/ios-bottom-tab-bar";
import { usePlatformServices } from "@/services/platform/context/platform-services-context";
import { cn } from "@/lib/utils";

type AdaptiveNavShellProps = {
  showNavbar?: boolean;
  /** Full-bleed content on web, but keep native bottom tabs (e.g. Swipe). */
  immersiveNativeNav?: boolean;
  children: ReactNode;
};

/** Web top bar + native bottom tab bar; adds safe bottom padding on native. */
export function AdaptiveNavShell({
  showNavbar = true,
  immersiveNativeNav = false,
  children,
}: AdaptiveNavShellProps) {
  const { platform } = usePlatformServices();
  const searchParams = useSearchParams();
  const devNativePreview =
    process.env.NODE_ENV === "development" &&
    searchParams.get("native") === "1";
  const isNative = platform.isNativePlatform || devNativePreview;
  const showNativeChrome = isNative && (showNavbar || immersiveNativeNav);

  if (!showNavbar && !showNativeChrome) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!isNative && showNavbar ? <Navbar /> : null}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          showNativeChrome &&
            "pb-[calc(4rem+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </div>
      {showNativeChrome ? <IOSBottomTabBar /> : null}
    </div>
  );
}
