"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  SAVED_TOAST_DURATION_MS,
  SAVED_TOAST_EVENT,
} from "@/lib/ui/saved-toast";
import { cn } from "@/lib/utils";

/** Fixed top success banner — above bottom action bars (z-110). */
const SAVED_TOAST_Z = "z-[130]";

export function SavedToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onSavedToast(event: Event) {
      const detail = (event as CustomEvent<string>).detail?.trim();
      setMessage(detail || "Gespeichert");

      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => {
        setMessage(null);
        hideTimerRef.current = null;
      }, SAVED_TOAST_DURATION_MS);
    }

    window.addEventListener(SAVED_TOAST_EVENT, onSavedToast);
    return () => {
      window.removeEventListener(SAVED_TOAST_EVENT, onSavedToast);
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  if (!mounted || !message) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 flex justify-center px-4",
        SAVED_TOAST_Z,
        "pt-[max(0.75rem,env(safe-area-inset-top))]",
      )}
      aria-live="polite"
    >
      <div
        role="status"
        className={cn(
          "pointer-events-auto flex w-full max-w-lg items-center justify-center gap-2 rounded-xl border border-emerald-700",
          "bg-emerald-600 px-4 py-3 text-[0.9rem] font-semibold text-white shadow-lg",
        )}
      >
        <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
        <span>{message}</span>
      </div>
    </div>,
    document.body,
  );
}
