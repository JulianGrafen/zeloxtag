"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText } from "lucide-react";

import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { readMockUploadFileFromSession } from "@/lib/documents/mock-upload-session-cache";
import {
  documentMediaKind,
  isViewableDocumentUrl,
  resolveDocumentViewUrl,
} from "@/lib/documents/viewable-url";

type DocumentOriginalPreviewProps = {
  documentId: string;
  fileUrl: string;
  title: string;
  isManual?: boolean;
};

export function DocumentOriginalPreview({
  documentId,
  fileUrl,
  title,
  isManual = false,
}: DocumentOriginalPreviewProps) {
  const mockSessionSrc = useMemo(() => {
    if (!fileUrl.startsWith("mock://")) return null;
    return readMockUploadFileFromSession(documentId);
  }, [documentId, fileUrl]);

  const proxyViewable = isViewableDocumentUrl(fileUrl);
  const canOpenOriginal = proxyViewable || Boolean(mockSessionSrc);
  const previewSrc = mockSessionSrc
    ? mockSessionSrc
    : proxyViewable
      ? resolveDocumentViewUrl(fileUrl)
      : null;
  const previewKind = mockSessionSrc
    ? documentMediaKind(fileUrl.split("/").pop() ?? fileUrl)
    : proxyViewable
      ? documentMediaKind(fileUrl)
      : null;

  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [previewSrc]);

  if (!canOpenOriginal || !previewSrc) {
    return (
      <p className="rounded-xl bg-neutral-50 px-3 py-2.5 text-[0.8rem] text-[color:var(--vd-muted)]">
        {isManual
          ? "Für diesen Eintrag liegt kein Foto vor."
          : fileUrl.startsWith("mock://")
            ? "In der Demo werden Scan-Dateien nur in dieser Browser-Sitzung vorgehalten. Bitte erneut scannen oder mit Supabase speichern."
            : "Originaldatei konnte nicht geladen werden. Bitte erneut hochladen oder Support kontaktieren."}
      </p>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-3 text-[0.82rem] text-amber-950">
        <p className="flex items-start gap-2 font-medium">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Vorschau konnte nicht geladen werden.
        </p>
        <PressableLink
          href={previewSrc}
          target="_blank"
          rel="noopener noreferrer"
          variant="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-[0.85rem] font-semibold text-white"
        >
          <FileText className="h-4 w-4" aria-hidden />
          Original in neuem Tab öffnen
        </PressableLink>
      </div>
    );
  }

  return (
    <>
      {previewKind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt={title}
          className="max-h-[50vh] w-full rounded-xl bg-neutral-100 object-contain"
          onError={() => setLoadError(true)}
        />
      ) : (
        <object
          data={previewSrc}
          type="application/pdf"
          aria-label={title}
          className="h-[min(50vh,28rem)] w-full rounded-xl border border-[color:var(--vd-border)] bg-white"
        >
          <iframe
            title={title}
            src={previewSrc}
            className="h-[min(50vh,28rem)] w-full rounded-xl border border-[color:var(--vd-border)] bg-white"
          />
        </object>
      )}
      <PressableLink
        href={previewSrc}
        target="_blank"
        rel="noopener noreferrer"
        variant="button"
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white shadow-[var(--vd-shadow-sm)]"
      >
        <FileText className="h-4 w-4" aria-hidden />
        Original öffnen
      </PressableLink>
    </>
  );
}
