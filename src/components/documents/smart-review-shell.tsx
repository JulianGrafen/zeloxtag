"use client";

import type { ReactNode } from "react";
import { FileText, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SmartReviewPreview({
  previewUrl,
  previewKind = "image",
  pageCount = 1,
  alt = "Dokument-Vorschau",
}: {
  previewUrl: string;
  previewKind?: "pdf" | "image";
  pageCount?: number;
  alt?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-neutral-950 shadow-[var(--vd-shadow-sm)]">
      {previewKind === "pdf" ? (
        <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 bg-neutral-900 px-4 text-center">
          <FileText className="h-10 w-10 text-white/70" aria-hidden />
          <p className="text-[0.82rem] font-medium text-white/90">
            PDF · {pageCount} {pageCount === 1 ? "Seite" : "Seiten"}
          </p>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.75rem] font-medium text-sky-300 underline-offset-2 hover:underline"
          >
            Vorschau öffnen
          </a>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={previewUrl}
          alt={alt}
          className="aspect-[3/4] w-full object-contain bg-neutral-900"
        />
      )}
    </div>
  );
}

export function SmartReviewActions({
  onSave,
  onCancel,
  isSaving = false,
  saveLabel = "Speichern",
  saveDisabled = false,
  children,
}: {
  onSave: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
  saveDisabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      {children}
      <Button
        type="button"
        className="claim-cta w-full"
        disabled={isSaving || saveDisabled}
        onClick={onSave}
      >
        {isSaving ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        ) : null}
        {saveLabel}
      </Button>
      {onCancel ? (
        <Button
          type="button"
          variant="outline"
          className="claim-back w-full"
          disabled={isSaving}
          onClick={onCancel}
        >
          Abbrechen
        </Button>
      ) : null}
    </div>
  );
}

export function SmartReviewField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-[0.72rem] leading-snug text-[color:var(--vd-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
