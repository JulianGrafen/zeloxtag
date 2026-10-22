"use client";

import { useEffect, useState } from "react";
import { Expand, ExternalLink, Loader2 } from "lucide-react";

import { rasterizePdfFirstPageFromUrl } from "@/lib/utils/pdf-converter";

import { showroom } from "./showroom-styles";

type ShowroomDynoPdfPreviewProps = {
  url: string;
  alt: string;
  onExpand: (previewSrc: string) => void;
};

export function ShowroomDynoPdfPreview({
  url,
  alt,
  onExpand,
}: ShowroomDynoPdfPreviewProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setFailed(false);
    setPreviewSrc(null);

    void rasterizePdfFirstPageFromUrl(url, 1280)
      .then((canvas) => {
        if (cancelled) return;
        setPreviewSrc(canvas.toDataURL("image/jpeg", 0.92));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div
        className="flex aspect-[4/3] w-full items-center justify-center gap-2 bg-black text-sm text-white/60"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Diagramm wird geladen…
      </div>
    );
  }

  if (failed || !previewSrc) {
    return (
      <div className="px-4 py-4">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={showroom.cta}
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          PDF öffnen
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onExpand(previewSrc)}
        className="group relative block w-full"
        aria-label={`${alt} vergrößern`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt={alt}
          className="aspect-[4/3] w-full bg-black object-contain"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white/90 backdrop-blur-sm"
        >
          <Expand className="h-3.5 w-3.5" />
        </span>
      </button>
      <div className="border-t border-white/10 px-4 py-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-white/70 underline-offset-4 hover:text-white hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Original-PDF öffnen
        </a>
      </div>
    </>
  );
}
