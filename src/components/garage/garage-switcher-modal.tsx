"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

import type { GarageVehicle } from "@/lib/garage/types";

interface GarageSwitcherModalProps {
  open: boolean;
  vehicles: GarageVehicle[];
  activeVehicleId: string | null;
  onClose: () => void;
  onSelect: (vehicleId: string) => void;
}

export function GarageSwitcherModal({
  open,
  vehicles,
  activeVehicleId,
  onClose,
  onSelect,
}: GarageSwitcherModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Schließen"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="garage-switcher-title"
        className="relative z-10 w-full max-w-md rounded-t-3xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-hover)] sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="claim-kicker">Meine Garage</p>
            <h2
              id="garage-switcher-title"
              className="claim-title mt-1 text-[1.05rem]"
            >
              Fahrzeug wählen
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-muted)]"
            aria-label="Modal schließen"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <ul className="max-h-[min(60vh,420px)] space-y-2 overflow-y-auto">
          {vehicles.map((vehicle) => {
            const isActive = vehicle.vehicleId === activeVehicleId;
            const yearLabel =
              vehicle.year != null ? String(vehicle.year) : "Baujahr offen";
            return (
              <li key={vehicle.vehicleId}>
                <button
                  type="button"
                  onClick={() => onSelect(vehicle.vehicleId)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    isActive
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] hover:border-[color:var(--vd-accent)]/30"
                  }`}
                >
                  <span>
                    <span className="block text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
                      {vehicle.label}
                    </span>
                    <span className="mt-0.5 block text-[0.78rem] text-[color:var(--vd-muted)]">
                      {yearLabel}
                    </span>
                  </span>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-[0.72rem] font-medium uppercase tracking-[0.12em] text-emerald-400">
                      <span
                        className="h-2 w-2 rounded-full bg-emerald-400"
                        aria-hidden
                      />
                      Aktiv
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
