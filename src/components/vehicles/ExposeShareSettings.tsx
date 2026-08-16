"use client";

import { useState, useTransition } from "react";
import { Copy, ExternalLink, FileDown, Link2, RefreshCw, ShieldOff } from "lucide-react";

import { manageVehicleExpose } from "@/actions/expose";
import { GenerateExposeButton } from "@/components/vehicles/GenerateExposeButton";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { Vehicle } from "@/types/database";

type ExposeShareSettingsProps = {
  tagUuid: string;
  vehicle: Vehicle;
  canEdit: boolean;
  exposeToken: string | null;
  isExposeActive: boolean;
};

export function ExposeShareSettings({
  tagUuid,
  vehicle,
  canEdit,
  exposeToken,
  isExposeActive,
}: ExposeShareSettingsProps) {
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`.trim();
  const [isActive, setIsActive] = useState(isExposeActive);
  const [sharePath, setSharePath] = useState<string | null>(
    isExposeActive && exposeToken ? `/expose/${exposeToken}` : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runAction(action: "generate" | "deactivate" | "renew") {
    if (!canEdit) return;

    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await manageVehicleExpose({
        vehicleId: vehicle.id,
        tagUuid,
        action,
      });

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setIsActive(result.isActive);
      setSharePath(result.sharePath);
      setMessage(
        action === "deactivate"
          ? "Exposé ist deaktiviert. Der alte Link führt nicht mehr zum Dossier."
          : action === "renew"
            ? "Neuer Link erzeugt. Der vorherige Token ist ungültig."
            : "Verkaufsexposé ist aktiv — Link kann geteilt werden.",
      );
    });
  }

  async function copyShareLink() {
    if (!sharePath || typeof window === "undefined") return;
    const url = `${window.location.origin}${sharePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link kopiert.");
    } catch {
      setError("Link konnte nicht kopiert werden.");
    }
  }

  return (
    <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <FileDown className="h-4 w-4 text-[color:var(--vd-accent)]" aria-hidden />
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          1-Klick Verkaufsexposé
        </h2>
      </div>
      <p className="mb-4 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
        Erzeugt ein fälschungssicheres Dossier mit Investitionen, Services und
        Historie — ohne Adressen, IBAN oder private Notizen. Ideal für Mobile.de
        und Kleinanzeigen.
      </p>

      {!isActive || !sharePath ? (
        <PressableButton
          type="button"
          variant="button"
          disabled={!canEdit || pending}
          onClick={() => runAction("generate")}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-[color:var(--vd-accent)] px-4 py-3.5 text-[0.92rem] font-semibold text-white shadow-[var(--vd-shadow-sm)] disabled:opacity-60"
        >
          <Link2 className="h-4 w-4 shrink-0" aria-hidden />
          {pending ? "Exposé wird erstellt…" : "Verkaufsexposé aktivieren"}
        </PressableButton>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] p-3">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
              Öffentlicher Link
            </p>
            <p className="mt-2 break-all font-mono text-[0.78rem] text-[color:var(--vd-text)]">
              {sharePath}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={() => void copyShareLink()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 text-[0.82rem] font-medium"
            >
              <Copy className="h-4 w-4" aria-hidden />
              Kopieren
            </PressableButton>
            <a
              href={sharePath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 text-[0.82rem] font-medium text-[color:var(--vd-text)]"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Öffnen
            </a>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PressableButton
              type="button"
              variant="button"
              disabled={!canEdit || pending}
              onClick={() => runAction("renew")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color:var(--vd-border)] px-3 text-[0.82rem] font-medium"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Neu erzeugen
            </PressableButton>
            <PressableButton
              type="button"
              variant="button"
              disabled={!canEdit || pending}
              onClick={() => runAction("deactivate")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color:var(--vd-border)] px-3 text-[0.82rem] font-medium"
            >
              <ShieldOff className="h-4 w-4" aria-hidden />
              Deaktivieren
            </PressableButton>
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-[color:var(--vd-border)] pt-4">
        <GenerateExposeButton
          vehicleId={vehicle.id}
          vehicleLabel={vehicleLabel}
          disabled={!canEdit}
        />
      </div>

      {message ? (
        <p className="mt-3 text-[0.82rem] text-[color:var(--vd-accent)]">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-[0.82rem] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
