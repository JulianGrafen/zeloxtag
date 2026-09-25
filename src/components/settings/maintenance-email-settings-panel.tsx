"use client";

import { useState, useTransition } from "react";

import { updateMaintenanceEmailRemindersAction } from "@/actions/update-maintenance-email-prefs";

interface MaintenanceEmailSettingsPanelProps {
  initialEnabled: boolean;
}

export function MaintenanceEmailSettingsPanel({
  initialEnabled,
}: MaintenanceEmailSettingsPanelProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onToggle() {
    const next = !enabled;
    setError(null);
    startTransition(async () => {
      const result = await updateMaintenanceEmailRemindersAction(next);
      if (result.status === "ok") {
        setEnabled(result.enabled);
        return;
      }
      setError(result.message);
    });
  }

  return (
    <section
      aria-label="Wartungs-Erinnerungen"
      className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-4 shadow-[var(--vd-shadow-sm)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[0.88rem] font-medium text-[color:var(--vd-text)]">
            Wartungs-Erinnerungen per E-Mail
          </h2>
          <p className="mt-0.5 text-[0.78rem] text-[color:var(--vd-muted)]">
            Öl- und Brems-Intervalle: Erinnerung 7 Tage vor Fälligkeit und bei
            Überfälligkeit.
          </p>
          {error ? (
            <p className="mt-2 text-[0.78rem] text-red-600">{error}</p>
          ) : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={pending}
          onClick={onToggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
            enabled
              ? "border-emerald-600/40 bg-emerald-500"
              : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </section>
  );
}
