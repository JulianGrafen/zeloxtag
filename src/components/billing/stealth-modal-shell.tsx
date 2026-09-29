"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

type StealthModalShellProps = {
  open: boolean;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
};

/** Dark, blurred paywall shell — reuse for feature-specific upgrade modals. */
export function StealthModalShell({
  open,
  titleId,
  onClose,
  children,
}: StealthModalShellProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Schließen"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0a0a0a] text-white shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-3 right-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        {children}
      </div>
    </div>
  );
}
