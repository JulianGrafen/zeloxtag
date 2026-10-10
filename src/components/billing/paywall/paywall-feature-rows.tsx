import {
  FileText,
  FolderLock,
  QrCode,
  ScanLine,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { parsePaywallBenefit } from "@/components/billing/paywall/paywall-benefit-parse";
import { PRO_PAYWALL_MODAL_BENEFITS } from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

const ICON_BY_TITLE: Record<string, LucideIcon> = {
  Werterhalt: TrendingUp,
  "Gutachten-Tresor": FolderLock,
  "QR auf Treffen": QrCode,
  "Keine Tipparbeit": ScanLine,
  "Verkaufs-Exposé": FileText,
};

function benefitIcon(title: string): LucideIcon {
  return ICON_BY_TITLE[title] ?? FileText;
}

export function PaywallFeatureRows({
  items = PRO_PAYWALL_MODAL_BENEFITS,
  highlightFirst = false,
  className,
}: {
  items?: readonly string[];
  highlightFirst?: boolean;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "overflow-hidden rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]/40",
        className,
      )}
      aria-label="Vorteile von ZeloxTag Pro"
    >
      {items.map((benefit, index) => {
        const { title, description } = parsePaywallBenefit(benefit);
        const lead = highlightFirst && index === 0;
        const Icon = benefitIcon(title);

        return (
          <li
            key={benefit}
            className={cn(
              "flex gap-3.5 px-4 py-3.5",
              index > 0 && "border-t border-[color:var(--vd-border)]",
            )}
          >
            <span
              className={cn(
                "mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                lead
                  ? "bg-[color:var(--paywall-benefit-icon-bg)] text-[color:var(--paywall-benefit-icon-fg)] shadow-[0_8px_20px_rgba(5,150,105,0.35)]"
                  : "bg-[color:var(--vd-surface)] text-[color:var(--vd-text)] ring-1 ring-[color:var(--vd-border)]",
              )}
              aria-hidden
            >
              <Icon className="h-5 w-5" strokeWidth={lead ? 2.25 : 2} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  "text-[0.92rem] leading-snug tracking-[-0.02em] text-[color:var(--vd-text)]",
                  lead ? "font-semibold" : "font-medium",
                )}
              >
                {title}
              </p>
              {description ? (
                <p className="mt-1 text-[0.8rem] leading-relaxed text-[color:var(--vd-muted)]">
                  {description}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
