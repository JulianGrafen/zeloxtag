"use client";

const listeners = new Set<() => void>();

let paywallOpen = false;

function notify() {
  listeners.forEach((listener) => listener());
}

export function isPaywallOpen(): boolean {
  return paywallOpen;
}

export function setPaywallOpen(open: boolean): void {
  if (paywallOpen === open) return;
  paywallOpen = open;
  notify();
}

export function subscribePaywallOpen(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
