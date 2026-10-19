"use client";

import { useState, useTransition } from "react";

import { IOSListItem } from "@/components/ui/ios";
import { usePlatformServices } from "@/services/platform/context/platform-services-context";

export function NativeRestorePurchasesButton() {
  const { billing, platform } = usePlatformServices();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!platform.isNativeApp) {
    return null;
  }

  return (
    <div className="border-t border-white/[0.07]">
      <IOSListItem
        label={pending ? "Wird wiederhergestellt…" : "Käufe wiederherstellen"}
        sublabel="Apple App Store · Zelox Pro"
        isLast
        disabled={pending}
        onPress={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await billing.restorePurchases();
            if (result.status === "restored") {
              setMessage("Käufe wiederhergestellt.");
              return;
            }
            if (result.status === "nothing_to_restore") {
              setMessage("Keine früheren Käufe gefunden.");
              return;
            }
            if (result.status === "error") {
              setMessage(result.message);
            }
          });
        }}
      />
      {message ? (
        <p className="px-4 pb-2 text-xs text-zinc-400">{message}</p>
      ) : null}
    </div>
  );
}
