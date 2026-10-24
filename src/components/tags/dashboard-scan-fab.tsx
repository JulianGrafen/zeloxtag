"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Fuel, PenLine, Plus, Receipt } from "lucide-react";

import { DashboardQuickActionSheet } from "@/components/tags/dashboard-quick-action-sheet";
import { FIXED_BOTTOM_ACTION_Z } from "@/components/vehicle-dashboard/fixed-bottom-action-bar";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import {
  isPaywallOpen,
  subscribePaywallOpen,
} from "@/lib/billing/paywall-open-state";
import {
  getDashboardPromptSnapshot,
  subscribeDashboardPrompts,
} from "@/lib/ui/dashboard-prompt-orchestrator";
import { cn } from "@/lib/utils";

/** On section pages, Plus runs one action; on the dashboard it opens the sheet. */
export type DashboardScanFabDirectAction = "menu" | "scan" | "fuel";

export interface DashboardScanCtaProps {
  tagUuid: string;
  directAction?: DashboardScanFabDirectAction;
  /** Tanken: scan capture (paywall handled by caller). */
  onFuelScan?: () => void;
  /** Prefer in-page scanner when provided. */
  onOpenScanner?: () => void;
  /** Direct link to scan flow (sub-pages without in-page picker). */
  scanHref?: string;
  manualEntryHref?: string;
  /** Opens in-page flow (e.g. Scheckheft-Formular) instead of navigating. */
  onManualEntry?: () => void;
  fuelLogHref?: string;
  scanLabel?: string;
  /** Label in the quick-action sheet for scan (defaults to Rechnung scannen). */
  scanActionLabel?: string;
  /** Free KI scan used — muted CTA that routes to paywall on tap. */
  scanLocked?: boolean;
  onScanLocked?: () => void;
  fuelScanLocked?: boolean;
  onFuelScanLocked?: () => void;
  /** Hide while a photo sheet / modal needs the bottom of the screen. */
  hidden?: boolean;
  /** Bottom sheet title when `directAction` is `menu`. */
  menuTitle?: string;
  /** Omit Tankbeleg from the quick-action sheet (e.g. Belege list). */
  hideFuelAction?: boolean;
  manualActionLabel?: string;
  manualActionDescription?: string;
}

const scanFabClassName = (
  scanLocked: boolean,
  menuOpen: boolean,
  directAction: DashboardScanFabDirectAction,
) =>
  cn(
    "vd-pressable vd-pressable--button claim-cta vd-scan-fab-cta",
    "inline-flex items-center justify-center shadow-[0_10px_32px_rgba(0,0,0,0.5)]",
    scanLocked && directAction === "scan"
      ? "vd-scan-fab-cta--locked"
      : "zt-cta-primary",
    menuOpen && directAction === "menu" && "ring-2 ring-white/25",
  );

/** Fixed bottom-right FAB with half-card quick actions. */
export function DashboardScanFab({
  hidden = false,
  tagUuid,
  directAction = "menu",
  onFuelScan,
  onOpenScanner,
  scanHref,
  manualEntryHref,
  onManualEntry,
  fuelLogHref,
  scanLabel = "Dokument scannen",
  scanActionLabel = "Rechnung scannen",
  scanLocked = false,
  onScanLocked,
  fuelScanLocked = false,
  onFuelScanLocked,
  menuTitle = "Rechnung oder Tankbeleg",
  hideFuelAction = false,
  manualActionLabel = "Manueller Eintrag",
  manualActionDescription = "Ohne Scan — Umbau, Service, Notiz",
}: DashboardScanCtaProps) {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paywallOpen, setPaywallOpenState] = useState(false);
  const [promptPhase, setPromptPhase] = useState(
    () => getDashboardPromptSnapshot().phase,
  );

  const href = scanHref ?? `/v/${tagUuid}?scan=1`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPaywallOpenState(isPaywallOpen());
    return subscribePaywallOpen(() => {
      setPaywallOpenState(isPaywallOpen());
    });
  }, []);

  useEffect(() => {
    const syncPhase = () => {
      setPromptPhase(getDashboardPromptSnapshot().phase);
    };
    syncPhase();
    return subscribeDashboardPrompts(syncPhase);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const blockedByPrompt =
    promptPhase === "silhouette" || promptPhase === "tour";

  const runFuelAction = useCallback(() => {
    if (fuelScanLocked) {
      onFuelScanLocked?.();
      return;
    }
    if (onFuelScan) {
      onFuelScan();
      return;
    }
    if (fuelLogHref) {
      const base = fuelLogHref.replace(/\/$/, "");
      window.location.assign(`${base}/erfassen`);
    }
  }, [fuelLogHref, fuelScanLocked, onFuelScan, onFuelScanLocked]);

  const runScanAction = useCallback(() => {
    if (scanLocked) {
      if (onScanLocked) {
        onScanLocked();
        return;
      }
      if (onOpenScanner) {
        onOpenScanner();
        return;
      }
      window.location.assign(href);
      return;
    }
    if (onOpenScanner) {
      onOpenScanner();
      return;
    }
    window.location.assign(href);
  }, [href, onOpenScanner, onScanLocked, scanLocked]);

  const quickActions = useMemo(() => {
    const items = [];

    items.push({
      id: "scan-invoice",
      label: scanActionLabel,
      description: scanLocked
        ? "ZeloxTag Pro oder Gratis-Scan nötig"
        : "Werkstattbeleg mit KI auslesen",
      icon: Receipt,
      onClick: runScanAction,
    });

    if (!hideFuelAction && (fuelLogHref || onFuelScan)) {
      items.push({
        id: "scan-fuel",
        label: "Tankbeleg scannen",
        description: fuelScanLocked
          ? "ZeloxTag Pro oder Gratis-Tank-Scan nötig"
          : "Tankquittung mit KI auslesen",
        icon: Fuel,
        onClick: runFuelAction,
      });
    }

    if (manualEntryHref || onManualEntry) {
      items.push({
        id: "manual",
        label: manualActionLabel,
        description: manualActionDescription,
        icon: PenLine,
        href: manualEntryHref,
        onClick: onManualEntry,
      });
    }

    return items;
  }, [
    fuelLogHref,
    fuelScanLocked,
    hideFuelAction,
    manualActionDescription,
    manualActionLabel,
    manualEntryHref,
    onManualEntry,
    onFuelScan,
    runFuelAction,
    runScanAction,
    scanActionLabel,
    scanLocked,
  ]);

  const handleFabPress = useCallback(() => {
    if (directAction === "scan") {
      runScanAction();
      return;
    }
    if (directAction === "fuel") {
      runFuelAction();
      return;
    }
    setMenuOpen((open) => !open);
  }, [directAction, runFuelAction, runScanAction]);

  const fabAriaLabel =
    directAction === "scan"
      ? scanActionLabel
      : directAction === "fuel"
        ? "Tankbeleg scannen"
        : menuOpen
          ? "Schnellaktionen schließen"
          : "Schnellaktionen";

  if (!mounted || paywallOpen || hidden || blockedByPrompt) {
    return null;
  }

  return createPortal(
    <>
      {directAction === "menu" ? (
        <DashboardQuickActionSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          title={menuTitle}
          actions={quickActions}
        />
      ) : null}

      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0",
          FIXED_BOTTOM_ACTION_Z,
        )}
        data-tour="scan-fab-shell"
      >
        <div
          className="pointer-events-auto absolute right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:right-5"
        >
          <PressableButton
            type="button"
            variant="button"
            onClick={handleFabPress}
            className={scanFabClassName(scanLocked, menuOpen, directAction)}
            aria-label={fabAriaLabel}
            aria-expanded={directAction === "menu" ? menuOpen : undefined}
            data-tour="scan-fab"
          >
            <Plus
              className={cn(
                "h-7 w-7 transition-transform duration-200",
                directAction === "menu" && menuOpen && "rotate-45",
              )}
              strokeWidth={2.25}
              aria-hidden
            />
          </PressableButton>
        </div>
      </div>
    </>,
    document.body,
  );
}
