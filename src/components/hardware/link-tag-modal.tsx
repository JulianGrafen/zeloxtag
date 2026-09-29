"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";

import { linkTagToVehicleAction } from "@/actions/link-tag-to-vehicle";
import { TagQrScanner } from "@/components/hardware/tag-qr-scanner";
import { isPlaqueTagUuid } from "@/lib/tags/plaque-qr";

interface LinkTagModalProps {
  open: boolean;
  vehicleId: string;
  onClose: () => void;
}

export function LinkTagModal({ open, vehicleId, onClose }: LinkTagModalProps) {
  const router = useRouter();
  const [manualOpen, setManualOpen] = useState(false);
  const [tagUuid, setTagUuid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setManualOpen(false);
    setTagUuid("");
    setError(null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const linkTag = useCallback(
    (uuid: string) => {
      const trimmed = uuid.trim();
      if (!isPlaqueTagUuid(trimmed)) {
        setError(
          "Ungültige Tag-ID. Bitte den QR auf der Plaque scannen.",
        );
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
    },
    [onClose, router, vehicleId],
  );

  function submitManual() {
    linkTag(tagUuid);
  }

  if (!open) return null;

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
            disabled={pending}
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-[0.88rem] text-[color:var(--vd-muted)]">
          Halte den QR-Code auf deiner Plaque in den Rahmen — die Verknüpfung
          startet automatisch.
        </p>

        <div className="mt-4">
          <TagQrScanner
            active={open && !pending}
            onTagScanned={linkTag}
            onScanError={(message) => setError(message)}
          />
        </div>

        {error ? (
          <p className="mt-3 text-[0.85rem] text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        {pending ? (
          <p className="mt-3 text-[0.85rem] text-[color:var(--vd-accent)]">
            Tag wird verknüpft…
          </p>
        ) : null}

        <details
          className="mt-4 rounded-lg border border-[color:var(--vd-border)] bg-black/20 px-3 py-2"
          open={manualOpen}
          onToggle={(event) =>
            setManualOpen((event.target as HTMLDetailsElement).open)
          }
        >
          <summary className="cursor-pointer text-[0.8rem] font-medium text-[color:var(--vd-muted)]">
            Tag-ID manuell eingeben
          </summary>
          <label className="mt-3 block text-[0.8rem] font-medium text-[color:var(--vd-text)]">
            Tag-ID
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-[color:var(--vd-border)] bg-black/30 px-3 text-[color:var(--vd-text)]"
              value={tagUuid}
              onChange={(event) => setTagUuid(event.target.value)}
              placeholder="Nur falls Scan nicht geht"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button
            type="button"
            className="mt-3 min-h-10 w-full rounded-lg border border-[color:var(--vd-border)] text-[0.88rem] text-[color:var(--vd-text)] disabled:opacity-60"
            disabled={pending}
            onClick={submitManual}
          >
            Manuell verknüpfen
          </button>
        </details>

        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded-lg border border-[color:var(--vd-border)] text-[0.9rem] text-[color:var(--vd-text)]"
          onClick={onClose}
          disabled={pending}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
