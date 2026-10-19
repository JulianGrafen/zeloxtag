"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { rememberNativeGarageHref } from "@/lib/navigation/use-native-garage-href";

/** Persists last vehicle dashboard path for native tab bar Garage target. */
export function RememberNativeGarageHref() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    if (pathname.startsWith("/v/") || pathname.startsWith("/garage/")) {
      rememberNativeGarageHref(pathname.split("?")[0] ?? pathname);
    }
  }, [pathname]);

  return null;
}
