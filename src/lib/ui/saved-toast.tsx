"use client";

export const SAVED_TOAST_EVENT = "zlx-saved-toast";
export const SAVED_TOAST_DURATION_MS = 2000;

/** Green success banner at the top (~2s), e.g. after saving technical data. */
export function showSavedToast(message = "Gespeichert"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<string>(SAVED_TOAST_EVENT, { detail: message }),
  );
}

export function appendSavedQuery(href: string): string {
  if (href.includes("saved=1")) return href;
  return href.includes("?") ? `${href}&saved=1` : `${href}?saved=1`;
}

type RouterLike = { refresh: () => void };

/** Standard success feedback after persisting data (toast + optional refresh). */
export function notifySaved(router?: RouterLike): void {
  showSavedToast();
  router?.refresh();
}
