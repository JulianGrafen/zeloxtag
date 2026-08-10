"use client";

import { useState, useTransition } from "react";
import { Copy, Globe, Shield } from "lucide-react";

import { updateVehicleShowcaseSettings } from "@/actions/update-vehicle-showcase-settings";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { Vehicle } from "@/types/database";

type VehicleShowcaseSettingsProps = {
  tagUuid: string;
  vehicle: Vehicle;
  canEdit: boolean;
};

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-4 py-3.5">
      <span className="min-w-0">
        <span className="block text-[0.88rem] font-medium text-[color:var(--vd-text)]">
          {label}
        </span>
        <span className="mt-0.5 block text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--vd-accent)]"
      />
    </label>
  );
}

export function VehicleShowcaseSettings({
  tagUuid,
  vehicle,
  canEdit,
}: VehicleShowcaseSettingsProps) {
  const [isPublic, setIsPublic] = useState(Boolean(vehicle.is_public));
  const [hideFinancials, setHideFinancials] = useState(
    vehicle.hide_financials !== false,
  );
  const [sharePath, setSharePath] = useState<string | null>(
    vehicle.is_public && vehicle.public_slug ? `/v/${vehicle.public_slug}` : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next: { isPublic?: boolean; hideFinancials?: boolean }) {
    if (!canEdit) return;

    const payload = {
      isPublic: next.isPublic ?? isPublic,
      hideFinancials: next.hideFinancials ?? hideFinancials,
    };

    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await updateVehicleShowcaseSettings({
        vehicleId: vehicle.id,
        tagUuid,
        isPublic: payload.isPublic,
        hideFinancials: payload.hideFinancials,
      });

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setSharePath(result.sharePath);
      setMessage(
        payload.isPublic
          ? "Showcase ist öffentlich — Link kann geteilt werden."
          : "Showcase ist privat.",
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
        <Globe className="h-4 w-4 text-[color:var(--vd-accent)]" aria-hidden />
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Öffentliche Showcase
        </h2>
      </div>
      <p className="mb-4 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
        Ideal fürs Tuningtreffen: Beim QR-Scan am Motorraum-Tag sehen Besucher
        sofort Specs, Fotos und Umbauten — ohne Login. Du erreichst dein
        privates Dashboard über „Zum Dashboard“.
      </p>

      <div className="space-y-3">
        <ToggleRow
          label="Öffentliches Profil"
          description="Gäste sehen beim QR-Scan (/v/Tag-UUID) das öffentliche Showcase."
          checked={isPublic}
          disabled={!canEdit || pending}
          onChange={(value) => {
            setIsPublic(value);
            save({ isPublic: value });
          }}
        />
        <ToggleRow
          label="Preise ausblenden"
          description="Rechnungsbeträge und Teilepreise bleiben auf der öffentlichen Seite verborgen."
          checked={hideFinancials}
          disabled={!canEdit || pending}
          onChange={(value) => {
            setHideFinancials(value);
            save({ hideFinancials: value });
          }}
        />
      </div>

      {isPublic && sharePath ? (
        <div className="mt-4 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] p-3">
          <p className="flex items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            Share-Link
          </p>
          <p className="mt-2 break-all font-mono text-[0.78rem] text-[color:var(--vd-text)]">
            {sharePath}
          </p>
          <PressableButton
            type="button"
            variant="button"
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.82rem] font-medium"
            onClick={copyShareLink}
          >
            <Copy className="h-4 w-4" aria-hidden />
            Link kopieren
          </PressableButton>
        </div>
      ) : null}

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
