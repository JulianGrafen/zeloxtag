"use client";

import { CheckCircle2 } from "lucide-react";

import { PwaInstallGuide } from "@/components/pwa/pwa-install-guide";
import { usePwaInstall } from "@/lib/hooks/use-pwa-install";

export function PwaInstallSettingsPanel() {
  const { isStandalone, canNativeInstall, promptInstall } = usePwaInstall();

  if (isStandalone) {
    return (
      <section
        aria-label="App installiert"
        className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
            aria-hidden
          />
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
              App installiert
            </h2>
            <p className="mt-1 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
              ZeloxTag läuft als installierte App auf diesem Gerät.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="App installieren"
      className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]"
    >
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
        Mobile App
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
        ZeloxTag als App installieren
      </h2>
      <p className="mt-1 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
        Schneller Zugriff vom Home-Bildschirm — ohne Browser-Leiste. Wähle
        deinen Browser:
      </p>

      <div className="mt-4">
        <PwaInstallGuide
          showChromeInstallButton={canNativeInstall}
          onChromeInstall={promptInstall}
        />
      </div>
    </section>
  );
}
