"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  isNativeTabActive,
  NATIVE_TAB_DEFINITIONS,
  resolveNativeTabHref,
} from "@/lib/navigation/native-tab-routes";
import {
  useNativeGarageHref,
  useNativeScanHref,
} from "@/lib/navigation/use-native-garage-href";
import { useIosHaptics } from "@/components/ui/ios/use-ios-haptics";
import { cn } from "@/lib/utils";

export function IOSBottomTabBar() {
  const pathname = usePathname() ?? "";
  const garageHref = useNativeGarageHref();
  const scanHref = useNativeScanHref();
  const { hapticSelection } = useIosHaptics();
  const [pressedTab, setPressedTab] = useState<string | null>(null);

  return (
    <nav
      data-ios-ui
      aria-label="Hauptnavigation"
      className="ios-ui fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-black/80 backdrop-blur-2xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 pt-1.5 pb-1">
        {NATIVE_TAB_DEFINITIONS.map((tab) => {
          const href = resolveNativeTabHref(tab, garageHref, scanHref);
          const active = isNativeTabActive(pathname, tab);
          const Icon = tab.icon;
          const isScan = tab.id === "scan";
          const pressed = pressedTab === tab.id;

          return (
            <li key={tab.id} className="flex justify-center">
              <Link
                href={href}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 transition-transform duration-75",
                  pressed && "scale-95",
                  isScan && "relative -mt-3",
                )}
                onPointerDown={() => setPressedTab(tab.id)}
                onPointerUp={() => setPressedTab(null)}
                onPointerLeave={() => setPressedTab(null)}
                onClick={() => hapticSelection()}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-2xl",
                    isScan
                      ? "bg-[#0A84FF] text-white shadow-lg shadow-blue-500/30"
                      : active
                        ? "text-white"
                        : "text-zinc-500",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    active ? "text-white" : "text-zinc-500",
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
