"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Copy, ExternalLink, X } from "lucide-react";

import { ensureOnboardingShowcasePublished } from "@/actions/ensure-onboarding-showcase-published";
import { ShareableSpecCard } from "@/components/shareable-spec-card";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { buildOwnerShareableBuildData } from "@/lib/showcase/build-owner-shareable-build-data";
import type { Document, Vehicle } from "@/types/database";

type DashboardShowcaseSharePromptProps = {
  open: boolean;
  vehicle: Vehicle;
  documents: Document[];
  tagUuid?: string;
  onDismiss: () => void;
};

export function DashboardShowcaseSharePrompt({
  open,
  vehicle,
  documents,
  tagUuid,
  onDismiss,
}: DashboardShowcaseSharePromptProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const shareCardData = useMemo(
    () => buildOwnerShareableBuildData(vehicle, documents),
    [vehicle, documents],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await ensureOnboardingShowcasePublished({
        vehicleId: vehicle.id,
        tagUuid: tagUuid?.trim() || undefined,
      });
      if (result.status === "error") {
        setError(result.message);
        setShareUrl(null);
        setSharePath(null);
        return;
      }
      setShareUrl(result.shareUrl);
      setSharePath(result.sharePath);
    });
  }, [open, vehicle.id, tagUuid]);

  async function copyLink() {
    if (!shareUrl || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Link konnte nicht kopiert werden.");
    }
  }

  if (!open) return null;

  return (
    <div
      className="onboarding-scrim fixed inset-0 z-[60] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="showcase-share-prompt-title"
    >
      <button
        type="button"
        aria-label="Schließen"
        className="absolute inset-0 cursor-default"
        onClick={onDismiss}
      />
      <div
        className="relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] shadow-[var(--vd-shadow-modal)]"
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-muted)]"
          aria-label="Schließen"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="overflow-y-auto px-5 pb-5 pt-6">
          <h2
            id="showcase-share-prompt-title"
            className="pr-10 text-[1.05rem] font-semibold leading-snug text-[color:var(--vd-text)]"
          >
            Packe diesen Link in deine Bio, um deinen Build zu zeigen!
          </h2>
          <p className="mt-2 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
            Dein öffentliches Showcase ist bereit — teile den Link in Instagram,
            TikTok oder überall, wo du dein Auto zeigst.
          </p>

          <div className="mt-4 space-y-2">
            {pending ? (
              <p className="text-[0.8rem] text-[color:var(--vd-muted)]">
                Showcase-Link wird vorbereitet…
              </p>
            ) : null}
            {error ? (
              <p className="text-[0.8rem] text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            {shareUrl ? (
              <p
                className="truncate rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2.5 font-mono text-[0.72rem] text-[color:var(--vd-muted)]"
                title={shareUrl}
              >
                {shareUrl.replace(/^https?:\/\//, "")}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <PressableButton
                type="button"
                variant="button"
                disabled={!shareUrl || pending}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[color:var(--vd-border)] bg-white px-4 py-2.5 text-[0.88rem] font-semibold text-black disabled:opacity-50"
                onClick={copyLink}
              >
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden />
                )}
                {copied ? "Kopiert" : "Link kopieren"}
              </PressableButton>
              {sharePath ? (
                <Link
                  href={sharePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-2.5 text-[0.88rem] font-medium text-[color:var(--vd-text)]"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Showcase öffnen
                </Link>
              ) : null}
            </div>
          </div>

          {shareCardData ? (
            <div className="mt-4 flex justify-center overflow-hidden rounded-xl border border-[color:var(--vd-border)] bg-black/40 p-2">
              <ShareableSpecCard
                data={shareCardData}
                vehicleId={vehicle.id}
                previewMaxWidth={200}
                showExportButton={false}
              />
            </div>
          ) : null}

          <p className="mt-4 text-[0.75rem] leading-relaxed text-[color:var(--vd-muted)]">
            Die ZeloxTag-App kannst du später unter Konto installieren — kein
            Muss für den Start.
          </p>

          <PressableButton
            type="button"
            variant="button"
            className="mt-4 w-full rounded-xl border border-[color:var(--vd-border)] py-2.5 text-[0.88rem] font-medium text-[color:var(--vd-text)]"
            onClick={onDismiss}
          >
            Weiter zum Dashboard
          </PressableButton>
        </div>
      </div>
    </div>
  );
}
