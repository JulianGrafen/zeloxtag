"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy } from "lucide-react";

import { updateVehicleShowcaseSettings } from "@/actions/update-vehicle-showcase-settings";
import { PRODUCTION_SITE_URL } from "@/lib/constants/public-site-url";
import { ShowcaseMediaSettings } from "@/components/vehicles/showcase-media-settings";
import { VehicleShowcaseModificationsSubmenu } from "@/components/vehicles/vehicle-showcase-modifications-submenu";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { partitionShowcaseSelectableDocuments } from "@/lib/vehicles/public-showcase-documents";
import type { Document, Vehicle } from "@/types/database";

type VehicleShowcaseSettingsProps = {
  tagUuid: string;
  vehicle: Vehicle;
  documents: Document[];
  galleryPhotos: Document[];
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
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-4 py-3">
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
  documents,
  galleryPhotos,
  canEdit,
}: VehicleShowcaseSettingsProps) {
  const { invoices, modifications } = useMemo(
    () => partitionShowcaseSelectableDocuments(documents),
    [documents],
  );

  const [isPublic, setIsPublic] = useState(Boolean(vehicle.is_public));
  const [hideFinancials, setHideFinancials] = useState(
    vehicle.hide_financials !== false,
  );
  const [sharePath, setSharePath] = useState<string | null>(
    vehicle.is_public && vehicle.public_slug ? `/v/${vehicle.public_slug}` : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startSettingsTransition] = useTransition();

  const shareUrl = sharePath ? `${PRODUCTION_SITE_URL}${sharePath}` : null;
  const visibleShowcaseDocCount = useMemo(
    () =>
      [...modifications, ...invoices].filter(
        (doc) => doc.show_on_public_showcase,
      ).length,
    [invoices, modifications],
  );

  function saveSettings(next: { isPublic?: boolean; hideFinancials?: boolean }) {
    if (!canEdit) return;

    const payload = {
      isPublic: next.isPublic ?? isPublic,
      hideFinancials: next.hideFinancials ?? hideFinancials,
    };

    startSettingsTransition(async () => {
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
    if (!shareUrl || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("Link kopiert.");
    } catch {
      setError("Link konnte nicht kopiert werden.");
    }
  }

  return (
    <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
        Öffentliches Profil
      </h2>

      <div className="mt-4 space-y-2">
        <ToggleRow
          label="Profil veröffentlichen"
          description="Showcase-Seite mit Share-Link aktivieren"
          checked={isPublic}
          disabled={!canEdit || pending}
          onChange={(value) => {
            setIsPublic(value);
            saveSettings({ isPublic: value });
          }}
        />
        {isPublic ? (
          <ToggleRow
            label="Preise ausblenden"
            description="Beträge auf der öffentlichen Seite verbergen"
            checked={hideFinancials}
            disabled={!canEdit || pending}
            onChange={(value) => {
              setHideFinancials(value);
              saveSettings({ hideFinancials: value });
            }}
          />
        ) : null}
      </div>

      {isPublic && shareUrl ? (
        <div className="mt-4 flex items-stretch gap-2">
          <p
            className="min-w-0 flex-1 truncate rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 font-mono text-[0.76rem] leading-snug text-[color:var(--vd-text)]"
            title={shareUrl}
          >
            {shareUrl.replace(/^https?:\/\//, "")}
          </p>
          <PressableButton
            type="button"
            variant="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.8rem] font-medium"
            onClick={copyShareLink}
          >
            <Copy className="h-4 w-4" aria-hidden />
            Kopieren
          </PressableButton>
        </div>
      ) : null}

      <div className="mt-5 border-t border-[color:var(--vd-border)] pt-5">
        <ShowcaseMediaSettings
          tagUuid={tagUuid}
          vehicle={vehicle}
          galleryPhotos={galleryPhotos}
          canEdit={canEdit}
        />
      </div>

      {isPublic ? (
        <div className="mt-5 border-t border-[color:var(--vd-border)] pt-5">
          <VehicleShowcaseModificationsSubmenu
            tagUuid={tagUuid}
            modificationCount={modifications.length}
            invoiceCount={invoices.length}
            visibleCount={visibleShowcaseDocCount}
          />
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
