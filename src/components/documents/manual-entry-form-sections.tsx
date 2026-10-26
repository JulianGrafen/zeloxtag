"use client";

import type { ReactNode } from "react";
import { Camera, Check, ImagePlus, X, type LucideIcon } from "lucide-react";

import {
  IconBadge,
  InsetGroupedCard,
  InsetListRow,
  IOS_LINK,
  IOS_ROW_PRESSED,
  IOS_ROW_SEPARATOR,
  IOS_ROW_SEPARATOR_INSET_ICON,
  IOS_ROW_SEPARATOR_INSET_TEXT,
  IOSSwitch,
  type IconBadgeTone,
} from "@/components/ui/ios";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import {
  MANUAL_ENTRY_CATEGORIES,
  MANUAL_ENTRY_CATEGORY_LABELS,
  type ManualEntryCategory,
} from "@/lib/documents/manual-entries";
import { cn } from "@/lib/utils";

/** Strips the legacy `.garage-field__control` padding so controls align with row text. */
export const MANUAL_ENTRY_CONTROL_CLASS = "!px-0 !pb-0 !pt-0.5";

const PILL_BUTTON_BASE =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[17px] font-semibold disabled:opacity-50";

export const PRIMARY_PILL_BUTTON_CLASS = cn(PILL_BUTTON_BASE, "bg-white text-black");

export const SECONDARY_PILL_BUTTON_CLASS = cn(PILL_BUTTON_BASE, "bg-white/[0.08] text-white");

const SEPARATED_BLOCK_CLASS = cn("relative", IOS_ROW_SEPARATOR, IOS_ROW_SEPARATOR_INSET_TEXT);

export function ManualEntryFieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(SEPARATED_BLOCK_CLASS, "px-4 py-2.5")}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium text-[#8E8E93]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function ManualEntrySwitchRow({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <InsetListRow
      emphasis="navigation"
      label={label}
      trailing={
        <IOSSwitch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          ariaLabel={label}
        />
      }
    />
  );
}

export function ManualEntryCategoryCard({
  value,
  onChange,
}: {
  value: ManualEntryCategory;
  onChange: (category: ManualEntryCategory) => void;
}) {
  return (
    <InsetGroupedCard header="Art">
      {MANUAL_ENTRY_CATEGORIES.map((id) => (
        <InsetListRow
          key={id}
          emphasis="navigation"
          label={MANUAL_ENTRY_CATEGORY_LABELS[id]}
          onPress={() => onChange(id)}
          chevron={false}
          value={
            value === id ? (
              <>
                <Check className={cn("h-[18px] w-[18px]", IOS_LINK)} strokeWidth={2.5} aria-hidden />
                <span className="sr-only">ausgewählt</span>
              </>
            ) : undefined
          }
        />
      ))}
    </InsetGroupedCard>
  );
}

function PhotoPickerRow({
  icon,
  tone,
  label,
  capture,
  multiple,
  disabled,
  onFiles,
}: {
  icon: LucideIcon;
  tone: IconBadgeTone;
  label: string;
  capture?: "environment";
  multiple?: boolean;
  disabled: boolean;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-[44px] w-full cursor-pointer items-center gap-2 overflow-hidden py-2.5 pl-3 pr-4",
        IOS_ROW_SEPARATOR,
        IOS_ROW_SEPARATOR_INSET_ICON,
        IOS_ROW_PRESSED,
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input
        type="file"
        accept="image/*,.heic,.heif"
        capture={capture}
        multiple={multiple}
        disabled={disabled}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <IconBadge icon={icon} tone={tone} />
      <span className="text-[15px] text-white">{label}</span>
    </label>
  );
}

export type PhotoPreview = { id: string; previewUrl: string };

export type ExistingPhoto = { url: string; isImage: boolean };

type ManualEntryPhotosCardProps = {
  hint: string;
  statusLabel?: string | null;
  isUmbau: boolean;
  existingPhoto: ExistingPhoto | null;
  photos: PhotoPreview[];
  canAddMore: boolean;
  busy: boolean;
  onAddFiles: (files: FileList | null) => void;
  onRemovePhoto: (id: string) => void;
};

function ExistingPhotoPreview({
  photo,
  isUmbau,
}: {
  photo: ExistingPhoto;
  isUmbau: boolean;
}) {
  return (
    <div className={cn(SEPARATED_BLOCK_CLASS, "aspect-video overflow-hidden bg-black")}>
      {photo.isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt="" className="h-full w-full object-contain" />
      ) : isUmbau ? (
        <p className="flex h-full min-h-[12rem] items-center justify-center px-4 text-center text-[13px] text-[#8E8E93]">
          Nur Bilder werden hier angezeigt.
        </p>
      ) : (
        <iframe title="Vorhandenes Dokument" src={photo.url} className="h-full min-h-[12rem] w-full" />
      )}
    </div>
  );
}

function PhotoDraftGrid({
  photos,
  busy,
  onRemovePhoto,
}: {
  photos: PhotoPreview[];
  busy: boolean;
  onRemovePhoto: (id: string) => void;
}) {
  return (
    <ul className={cn(SEPARATED_BLOCK_CLASS, "grid grid-cols-3 gap-2 p-3")}>
      {photos.map((photo) => (
        <li key={photo.id} className="relative aspect-square overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label="Foto entfernen"
            disabled={busy}
            onClick={() => onRemovePhoto(photo.id)}
            className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ManualEntryPhotosCard({
  hint,
  statusLabel,
  isUmbau,
  existingPhoto,
  photos,
  canAddMore,
  busy,
  onAddFiles,
  onRemovePhoto,
}: ManualEntryPhotosCardProps) {
  return (
    <InsetGroupedCard
      id="manual-entry-photos"
      className="scroll-mt-24"
      header="Fotos"
      footer={
        <>
          {hint}
          {statusLabel ? <span className="mt-1 block">{statusLabel}</span> : null}
        </>
      }
    >
      {existingPhoto ? <ExistingPhotoPreview photo={existingPhoto} isUmbau={isUmbau} /> : null}
      {photos.length > 0 ? (
        <PhotoDraftGrid photos={photos} busy={busy} onRemovePhoto={onRemovePhoto} />
      ) : null}
      {canAddMore ? (
        <>
          <PhotoPickerRow
            icon={Camera}
            tone="blue"
            label="Kamera"
            capture="environment"
            disabled={busy}
            onFiles={onAddFiles}
          />
          <PhotoPickerRow
            icon={ImagePlus}
            tone="purple"
            label="Galerie"
            multiple
            disabled={busy}
            onFiles={onAddFiles}
          />
        </>
      ) : null}
    </InsetGroupedCard>
  );
}

export function ManualEntryBuildStoryCard({
  checked,
  disabled,
  onCheckedChange,
}: {
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <InsetGroupedCard footer="Sichtbar für Besucher nur wenn die Build-Story im Profil öffentlich ist. Deine Auswahl wird mit dem Eintrag gespeichert.">
      <ManualEntrySwitchRow
        label="In der Build-Story zeigen"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </InsetGroupedCard>
  );
}

export function ManualEntryFormActions({
  submitLabel,
  submitDisabled,
  cancelDisabled,
  onCancel,
}: {
  submitLabel: string;
  submitDisabled: boolean;
  cancelDisabled: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <PressableButton
        type="submit"
        variant="button"
        disabled={submitDisabled}
        className={PRIMARY_PILL_BUTTON_CLASS}
      >
        {submitLabel}
      </PressableButton>
      <PressableButton
        type="button"
        variant="button"
        disabled={cancelDisabled}
        onClick={onCancel}
        className={SECONDARY_PILL_BUTTON_CLASS}
      >
        Abbrechen
      </PressableButton>
    </div>
  );
}
