"use client";

import { useState, useTransition } from "react";

import { updateMaintenanceEmailRemindersAction } from "@/actions/update-maintenance-email-prefs";
import { IOSSwitch } from "@/components/ui/ios";
import { showSavedToast } from "@/lib/ui/saved-toast";

interface MaintenanceEmailSettingsPanelProps {
  initialEnabled: boolean;
}

/** Legacy wrapper — prefer `MaintenanceEmailSettingsRow` inside grouped lists. */
export function MaintenanceEmailSettingsPanel({
  initialEnabled,
}: MaintenanceEmailSettingsPanelProps) {
  return (
    <section aria-label="Wartungs-Erinnerungen">
      <MaintenanceEmailSettingsRow initialEnabled={initialEnabled} />
    </section>
  );
}

export function MaintenanceEmailSettingsRow({
  initialEnabled,
}: MaintenanceEmailSettingsPanelProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onToggle(next: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await updateMaintenanceEmailRemindersAction(next);
      if (result.status === "ok") {
        setEnabled(result.enabled);
        showSavedToast();
        return;
      }
      setError(result.message);
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-white">Wartungs-Erinnerungen</p>
        <p className="mt-0.5 text-[13px] leading-snug text-zinc-400">
          E-Mail 7 Tage vor Öl/Brems-Intervall und bei Überfälligkeit.
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
        ariaLabel="Wartungs-Erinnerungen per E-Mail"
      />
    </div>
  );
}
