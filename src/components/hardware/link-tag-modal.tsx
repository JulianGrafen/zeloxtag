"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";

import { linkTagToVehicleAction } from "@/actions/link-tag-to-vehicle";
import { isPlaqueTagUuid } from "@/lib/tags/plaque-qr";

interface LinkTagModalProps {
  open: boolean;
  vehicleId: string;
  onClose: () => void;
}

export function LinkTagModal({ open, vehicleId, onClose }: LinkTagModalProps) {
  const router = useRouter();
  const [tagUuid, setTagUuid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setTagUuid("");
    setError(null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  function submit() {
    const trimmed = tagUuid.trim();
    if (!isPlaqueTagUuid(trimmed)) {
      setError("Bitte die UUID von deiner Plaque eingeben (Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await linkTagToVehicleAction({
        tagUuid: trimmed,
        vehicleId,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      onClose();
      router.replace(result.href);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-tag-title"
    >
      <div className="vd-surface-card w-full max-w-md border border-[color:var(--vd-border)] bg-[#141418] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="claim-kicker">Hardware</p>
            <h2 id="link-tag-title" className="claim-title mt-1">
              Tag verknüpfen
            </h2>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-[color:var(--vd-muted)] hover:bg-white/5"
            onClick={onClose}
            aria-label="Schließen"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-[0.88rem] text-[color:var(--vd-muted)]">
          Scanne den QR auf der Plaque oder gib die Tag-ID manuell ein.
        </p>
        <label className="mt-4 block text-[0.8rem] font-medium text-[color:var(--vd-text)]">
          Tag-ID
          <input
            className="mt-2 min-h-11 w-full rounded-lg border border-[color:var(--vd-border)] bg-black/30 px-3 text-[color:var(--vd-text)]"
            value={tagUuid}
            onChange={(event) => setTagUuid(event.target.value)}
            placeholder="z. B. a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {error ? (
          <p className="mt-3 text-[0.85rem] text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="claim-cta min-h-11 flex-1 disabled:opacity-60"
            disabled={pending}
            onClick={submit}
          >
            {pending ? "Verknüpfe…" : "Verknüpfen"}
          </button>
          <button
            type="button"
            className="min-h-11 flex-1 rounded-lg border border-[color:var(--vd-border)] text-[0.9rem] text-[color:var(--vd-text)]"
            onClick={onClose}
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
