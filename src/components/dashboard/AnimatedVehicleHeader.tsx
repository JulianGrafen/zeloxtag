"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, ImagePlus } from "lucide-react";

import { bumpSilhouetteCacheUrl } from "@/lib/vehicles/prefetch-silhouette-image";
import { isOwnerSilhouetteSrc } from "@/lib/vehicles/silhouette-display-url";

type AnimatedVehicleHeaderProps = {
  /** Owner vehicle photo URL. Null → placeholder frame. */
  silhouetteImageUrl?: string | null;
  /** Session data URL / blob when proxy fails — owner uploads only. */
  previewFallbackUrl?: string | null;
  /** Catalog cutout when owner upload / proxy fails (demo). */
  fallbackImageUrl?: string | null;
  /** When true, never swap to generic SVG on load errors (owner upload). */
  lockOwnerSilhouette?: boolean;
  alt: string;
  className?: string;
  onEdit?: () => void;
  editLabel?: string;
  /** Called when the primary src loads successfully (proxy confirmed). */
  onPrimaryLoad?: () => void;
};

const ENTRANCE = {
  type: "spring" as const,
  stiffness: 120,
  damping: 18,
};

/**
 * Dashboard header vehicle photo in a modern 4:3 frame (top-right).
 */
export function AnimatedVehicleHeader({
  silhouetteImageUrl,
  previewFallbackUrl,
  fallbackImageUrl,
  lockOwnerSilhouette = false,
  alt,
  className = "",
  onEdit,
  editLabel = "Fahrzeugfoto ändern",
  onPrimaryLoad,
}: AnimatedVehicleHeaderProps) {
  const primary = silhouetteImageUrl?.trim() || null;
  const previewFallback = previewFallbackUrl?.trim() || null;
  const fallback = fallbackImageUrl?.trim() || null;
  const ownerLocked =
    lockOwnerSilhouette || isOwnerSilhouetteSrc(primary);
  const [activeSrc, setActiveSrc] = useState<string | null>(primary);
  const [showPlaceholder, setShowPlaceholder] = useState(!primary);
  const [proxyRetries, setProxyRetries] = useState(0);
  const [usedPreviewFallback, setUsedPreviewFallback] = useState(false);

  useEffect(() => {
    setActiveSrc(primary);
    setShowPlaceholder(!primary);
    setProxyRetries(0);
    setUsedPreviewFallback(false);
  }, [primary]);

  const editable = typeof onEdit === "function";

  function handleImageError() {
    if (activeSrc?.startsWith("blob:") || activeSrc?.startsWith("data:image/")) {
      return;
    }
    if (
      isOwnerSilhouetteSrc(activeSrc) &&
      proxyRetries < 6 &&
      typeof window !== "undefined"
    ) {
      setProxyRetries((count) => count + 1);
      setActiveSrc(bumpSilhouetteCacheUrl(activeSrc!));
      return;
    }
    if (
      (ownerLocked || isOwnerSilhouetteSrc(activeSrc)) &&
      previewFallback &&
      !usedPreviewFallback &&
      activeSrc !== previewFallback
    ) {
      setUsedPreviewFallback(true);
      setActiveSrc(previewFallback);
      setShowPlaceholder(false);
      return;
    }
    if (ownerLocked || isOwnerSilhouetteSrc(activeSrc)) {
      return;
    }
    if (fallback && activeSrc !== fallback) {
      setActiveSrc(fallback);
      setShowPlaceholder(false);
      return;
    }
    setShowPlaceholder(true);
    setActiveSrc(null);
  }

  function handleImageLoad() {
    if (
      isOwnerSilhouetteSrc(activeSrc) &&
      !activeSrc?.startsWith("blob:") &&
      !activeSrc?.startsWith("data:image/")
    ) {
      onPrimaryLoad?.();
    }
  }

  const frame = (
    <motion.div
      className="relative aspect-[4/3] w-[6.75rem] sm:w-[8.5rem]"
      initial={{ opacity: 0, scale: 0.94, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={ENTRANCE}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-[1.12rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] shadow-[var(--vd-shadow-sm)] ring-1 ring-inset ring-white/45"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-2.5 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-white/75 to-transparent"
        />

        {activeSrc && !showPlaceholder ? (
          // Same-origin proxy — omit crossOrigin so COEP pages don't CORS-fail.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={activeSrc}
            src={activeSrc}
            alt={alt}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full flex-col items-center justify-center gap-1 bg-[radial-gradient(ellipse_at_center,var(--vd-glow)_0%,transparent_72%)] px-2 text-center"
          >
            <ImagePlus
              className="h-5 w-5 text-[color:var(--vd-muted)]"
              aria-hidden
            />
            <span className="text-[0.62rem] font-medium leading-tight text-[color:var(--vd-muted)]">
              {editable ? "Foto hinzufügen" : "Kein Foto"}
            </span>
          </div>
        )}
      </div>

      {editable ? (
        <span
          aria-hidden
          className="absolute -bottom-1 -right-1 z-[2] inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)] ring-2 ring-[color:var(--vd-surface)]"
        >
          <Camera className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </motion.div>
  );

  return (
    <div
      className={`relative flex shrink-0 items-center justify-end ${className}`.trim()}
    >
      {editable ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          title={editLabel}
          className="rounded-xl outline-none transition active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-neutral-900/25"
        >
          {frame}
        </button>
      ) : (
        frame
      )}
    </div>
  );
}
