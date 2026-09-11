"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";

import { updateVehicleShowcaseSettings } from "@/actions/update-vehicle-showcase-settings";
import { PRODUCTION_SITE_URL } from "@/lib/constants/public-site-url";
import { SETTINGS_SUBMENU_TILE_CLASS } from "@/components/vehicles/vehicle-settings-submenu-link";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type VehiclePublicProfileSettingsProps = {
  tagUuid: string;
  vehicleId: string;
  isPublic: boolean;
  hideFinancials: boolean;
  publicSlug: string | null;
  canEdit: boolean;
};

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  busy,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  busy?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`${SETTINGS_SUBMENU_TILE_CLASS} w-full touch-manipulation text-left disabled:cursor-not-allowed disabled:opacity-60 ${
        busy ? "opacity-80" : ""
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[0.88rem] font-medium text-[color:var(--vd-text)]">
          {label}
        </span>
        <span className="mt-0.5 block text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
          {description}
        </span>
      </span>
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          checked
            ? "border-[color:var(--vd-accent)] bg-[color:var(--vd-accent)] text-white"
            : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]"
        }`}
      >
        {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

export function VehiclePublicProfileSettings({
  tagUuid,
  vehicleId,
  isPublic: initialIsPublic,
  hideFinancials: initialHideFinancials,
  publicSlug: initialPublicSlug,
  canEdit,
}: VehiclePublicProfileSettingsProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [hideFinancials, setHideFinancials] = useState(initialHideFinancials);
  const [sharePath, setSharePath] = useState<string | null>(
    initialIsPublic && initialPublicSlug ? `/v/${initialPublicSlug}` : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startSettingsTransition] = useTransition();

  const shareUrl = sharePath ? `${PRODUCTION_SITE_URL}${sharePath}` : null;

  function saveSettings(
    next: { isPublic?: boolean; hideFinancials?: boolean },
    onError?: () => void,
  ) {
    if (!canEdit) return;

    const payload = {
      isPublic: next.isPublic ?? isPublic,
      hideFinancials: next.hideFinancials ?? hideFinancials,
    };

    startSettingsTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await updateVehicleShowcaseSettings({
        vehicleId,
        tagUuid,
        isPublic: payload.isPublic,
        hideFinancials: payload.hideFinancials,
      });

      if (result.status === "error") {
        onError?.();
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
    if (!shareUrl || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("Link kopiert.");
    } catch {
      setError("Link konnte nicht kopiert werden.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {!canEdit ? (
        <p className="text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
          In der Demo-Vorschau sind diese Schalter nur zur Ansicht — am eigenen
          Fahrzeug kannst du sie unter Showcase bearbeiten.
        </p>
      ) : null}
      <ToggleRow
        label="Profil veröffentlichen"
        description="Showcase-Seite mit Share-Link aktivieren"
        checked={isPublic}
        disabled={!canEdit}
        busy={pending}
        onChange={(value) => {
          const previous = isPublic;
          setIsPublic(value);
          saveSettings({ isPublic: value }, () => setIsPublic(previous));
        }}
      />
      <ToggleRow
        label="Preise ausblenden"
        description="Beträge auf der öffentlichen Seite verbergen"
        checked={hideFinancials}
        disabled={!canEdit}
        busy={pending}
        onChange={(value) => {
          const previous = hideFinancials;
          setHideFinancials(value);
          saveSettings({ hideFinancials: value }, () =>
            setHideFinancials(previous),
          );
        }}
      />
      {isPublic && shareUrl ? (
        <div className={`${SETTINGS_SUBMENU_TILE_CLASS} gap-2`}>
          <span className="min-w-0">
            <span className="block text-[0.88rem] font-medium">Share-Link</span>
            <p
              className="mt-0.5 truncate font-mono text-[0.76rem] leading-snug text-[color:var(--vd-muted)]"
              title={shareUrl}
            >
              {shareUrl.replace(/^https?:\/\//, "")}
            </p>
          </span>
          <PressableButton
            type="button"
            variant="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2 text-[0.8rem] font-medium"
            onClick={copyShareLink}
          >
            <Copy className="h-4 w-4" aria-hidden />
            Kopieren
          </PressableButton>
        </div>
      ) : (
        <div className={SETTINGS_SUBMENU_TILE_CLASS}>
          <span className="min-w-0">
            <span className="block text-[0.88rem] font-medium">Share-Link</span>
            <span className="mt-0.5 block text-[0.78rem] text-[color:var(--vd-muted)]">
              Wird verfügbar, wenn das Profil öffentlich ist
            </span>
          </span>
        </div>
      )}

      {message ? (
        <p className="pt-1 text-[0.82rem] text-[color:var(--vd-accent)]">{message}</p>
      ) : null}
      {error ? (
        <p className="pt-1 text-[0.82rem] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
