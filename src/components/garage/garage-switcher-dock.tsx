"use client";

import { usePathname } from "next/navigation";

import { useGarageSwitcher, GarageSwitcherModalHost } from "./garage-switcher-control";
import { GarageVehicleThumbnail } from "./garage-vehicle-thumbnail";

/**
 * Persistent garage switch — available on all owner routes without re-login.
 */
export function GarageSwitcherDock() {
  const pathname = usePathname();
  const { canSwitch, open, setOpen, active, garage } = useGarageSwitcher();

  async function openSwitcher() {
    await garage?.refreshGarage();
    setOpen(true);
  }

  if (!canSwitch || !active || !garage) {
    return null;
  }

  const isDashboardRoot = /^\/v\/[^/]+$/.test(pathname);
  if (isDashboardRoot) {
    return null;
  }

  const year =
    active.year != null ? ` · ${active.year}` : "";

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => void openSwitcher()}
          className="pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]/95 px-4 py-2.5 text-left shadow-[var(--vd-shadow-hover)] backdrop-blur-md"
          aria-haspopup="dialog"
        >
          <GarageVehicleThumbnail
            imageSrc={active.imageSrc}
            imageAlt={active.imageAlt}
            className="h-10 w-14 rounded-lg"
          />
          <span className="min-w-0">
            <span className="block truncate text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Garage · {garage.userVehicles.length} Fahrzeuge
            </span>
            <span className="block truncate text-[0.88rem] font-semibold text-[color:var(--vd-text)]">
              {active.label}
              {year}
            </span>
          </span>
        </button>
      </div>
      <GarageSwitcherModalHost open={open} onClose={() => setOpen(false)} />
    </>
  );
}
