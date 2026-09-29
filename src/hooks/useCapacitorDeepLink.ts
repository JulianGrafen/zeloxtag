"use client";

import { App } from "@capacitor/app";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { resolveCapacitorDeepLinkPath } from "@/lib/capacitor/app-link-config";
import { isNativeCapacitor } from "@/lib/capacitor/platform";

export function useCapacitorDeepLink(): void {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeCapacitor()) return;

    let listener: { remove: () => Promise<void> } | undefined;

    const attach = async () => {
      listener = await App.addListener("appUrlOpen", (event) => {
        const path = resolveCapacitorDeepLinkPath(event.url);
        if (path) router.push(path);
      });

      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        const path = resolveCapacitorDeepLinkPath(launch.url);
        if (path) router.replace(path);
      }
    };

    void attach();

    return () => {
      void listener?.remove();
    };
  }, [router]);
}
