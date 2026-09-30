"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";

export const SAVED_TOAST_DURATION_MS = 3000;

const SAVED_TOAST_CLASS =
  "!border-emerald-700 !bg-emerald-600 !text-white shadow-lg";

/** Green success toast at the top (3s), e.g. after saving an entry. */
export function showSavedToast(message = "Gespeichert"): void {
  toast(message, {
    duration: SAVED_TOAST_DURATION_MS,
    icon: <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />,
    classNames: {
      toast: SAVED_TOAST_CLASS,
      title: "!text-white font-semibold",
    },
  });
}

export function appendSavedQuery(href: string): string {
  if (href.includes("saved=1")) return href;
  return href.includes("?") ? `${href}&saved=1` : `${href}?saved=1`;
}
