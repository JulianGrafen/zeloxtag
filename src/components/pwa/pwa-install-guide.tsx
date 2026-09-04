"use client";

import { Download, MoreVertical, Plus, Share } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Step({
  index,
  children,
  compact,
}: {
  index: number;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex gap-2.5 leading-snug text-[color:var(--vd-text)]",
        compact ? "text-[0.8rem]" : "text-[0.84rem]",
      )}
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-[color:var(--vd-surface-elevated)] font-semibold text-[color:var(--vd-muted)]",
          compact ? "mt-0.5 h-5 w-5 text-[0.65rem]" : "mt-0.5 h-6 w-6 text-[0.7rem]",
        )}
        aria-hidden
      >
        {index}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

function BrowserHeading({
  label,
  compact,
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <h3
      className={cn(
        "font-[family-name:var(--font-display)] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]",
        compact ? "text-[0.88rem]" : "text-[0.92rem]",
      )}
    >
      {label}
    </h3>
  );
}

export function SafariInstallGuide({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn(compact ? "space-y-2" : "space-y-2.5")}>
      <BrowserHeading label="Safari (iPhone & iPad)" compact={compact} />
      <ol className={cn(compact ? "space-y-2" : "space-y-2.5")}>
        <Step index={1} compact={compact}>
          Öffne ZeloxTag in Safari.
        </Step>
        <Step index={2} compact={compact}>
          Tippe unten auf das Teilen-Symbol{" "}
          <Share
            className="mx-0.5 inline h-4 w-4 align-[-0.2em] text-[color:var(--vd-text)]"
            aria-hidden
          />
          .
        </Step>
        <Step index={3} compact={compact}>
          Wähle{" "}
          <span className="inline-flex items-center gap-0.5 font-medium">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Zum Home-Bildschirm
          </span>
          .
        </Step>
        <Step index={4} compact={compact}>
          Bestätige mit „Hinzufügen“.
        </Step>
      </ol>
    </div>
  );
}

type ChromeInstallGuideProps = {
  compact?: boolean;
  showInstallButton?: boolean;
  onInstall?: () => void;
};

export function ChromeInstallGuide({
  compact = false,
  showInstallButton = false,
  onInstall,
}: ChromeInstallGuideProps) {
  return (
    <div className={cn(compact ? "space-y-2" : "space-y-2.5")}>
      <BrowserHeading label="Chrome (Android & iPhone)" compact={compact} />
      {showInstallButton && onInstall ? (
        <>
          <p
            className={cn(
              "leading-relaxed text-[color:var(--vd-muted)]",
              compact ? "text-[0.8rem]" : "text-[0.84rem]",
            )}
          >
            Auf Android kannst du ZeloxTag direkt installieren:
          </p>
          <Button
            type="button"
            className={cn(
              "w-full font-semibold",
              compact ? "h-10 text-[0.88rem]" : "h-11",
            )}
            onClick={() => void onInstall()}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden />
            App installieren
          </Button>
        </>
      ) : null}
      <ol className={cn(compact ? "space-y-2" : "space-y-2.5")}>
        {!showInstallButton ? (
          <Step index={1} compact={compact}>
            Öffne ZeloxTag in Chrome.
          </Step>
        ) : null}
        <Step index={showInstallButton ? 1 : 2} compact={compact}>
          <span className="font-medium">Android:</span> Tippe oben rechts auf
          das Menü{" "}
          <MoreVertical
            className="mx-0.5 inline h-4 w-4 align-[-0.2em] text-[color:var(--vd-text)]"
            aria-hidden
          />{" "}
          und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.
        </Step>
        <Step index={showInstallButton ? 2 : 3} compact={compact}>
          <span className="font-medium">iPhone:</span> Menü{" "}
          <MoreVertical
            className="mx-0.5 inline h-4 w-4 align-[-0.2em] text-[color:var(--vd-text)]"
            aria-hidden
          />{" "}
          → „Teilen…“ →{" "}
          <span className="inline-flex items-center gap-0.5 font-medium">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Zum Home-Bildschirm
          </span>
          .
        </Step>
      </ol>
    </div>
  );
}

export function PwaInstallGuide({
  compact = false,
  variant = "full",
  showChromeInstallButton = false,
  onChromeInstall,
}: {
  compact?: boolean;
  variant?: "full" | "safari" | "chrome";
  showChromeInstallButton?: boolean;
  onChromeInstall?: () => void;
}) {
  const showSafari = variant === "full" || variant === "safari";
  const showChrome = variant === "full" || variant === "chrome";

  return (
    <div className={cn(compact ? "space-y-4" : "space-y-5")}>
      {showSafari ? <SafariInstallGuide compact={compact} /> : null}
      {showSafari && showChrome ? (
        <div className="h-px bg-[color:var(--vd-border)]" aria-hidden />
      ) : null}
      {showChrome ? (
        <ChromeInstallGuide
          compact={compact}
          showInstallButton={showChromeInstallButton}
          onInstall={onChromeInstall}
        />
      ) : null}
    </div>
  );
}
