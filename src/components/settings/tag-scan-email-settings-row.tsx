"use client";

import { useState, useTransition } from "react";

import { updateTagScanEmailNotificationsAction } from "@/actions/update-tag-scan-email-prefs";
import { IOSSwitch } from "@/components/ui/ios";
import { showSavedToast } from "@/lib/ui/saved-toast";

export function TagScanEmailSettingsRow({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onToggle(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    setError(null);
    startTransition(async () => {
      const result = await updateTagScanEmailNotificationsAction(next);
      if (result.status === "ok") {
        setEnabled(result.enabled);
        showSavedToast();
        return;
      }
      setEnabled(previous);
      setError(result.message);
    });
  }

  return (
    <div className="relative flex items-center justify-between gap-3 px-4 py-2.5 before:absolute before:left-4 before:right-0 before:top-0 before:h-px before:bg-white/[0.08]">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-white">Live-Scan</p>
        <p className="mt-0.5 text-[13px] leading-snug text-zinc-400">
          E-Mail, wenn jemand den QR-Code an deinem Fahrzeug scannt. Höchstens
          eine Mail pro 30 Minuten.
        </p>
        {error ? (
          <p className="mt-2 text-[13px] text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <IOSSwitch
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={pending}
        ariaLabel="Live-Scan-Benachrichtigung per E-Mail"
      />
    </div>
  );
}
