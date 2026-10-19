import { Check, Mail, Shield } from "lucide-react";

import {
  PRO_PAYWALL_TRIAL_TIMELINE,
  type ProPaywallTimelineIcon,
} from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

function TimelineIcon({
  icon,
}: {
  icon: ProPaywallTimelineIcon;
  compact?: boolean;
}) {
  const size = "h-3.5 w-3.5";
  switch (icon) {
    case "check":
      return <Check className={size} strokeWidth={2.5} />;
    case "mail":
      return <Mail className={size} strokeWidth={2.5} />;
    case "shield":
      return <Shield className={size} strokeWidth={2.5} />;
  }
}

function TimelineText({ text }: { text: string }) {
  const colonIndex = text.indexOf(":");
  if (colonIndex === -1) {
    return <span>{text}</span>;
  }

  const label = text.slice(0, colonIndex + 1);
  const description = text.slice(colonIndex + 1);

  return (
    <span>
      <span className="font-semibold text-[color:var(--vd-text)]">{label}</span>
      <span className="text-[color:var(--vd-muted)]">{description}</span>
    </span>
  );
}

export function TrialTimeline({
  nodes = PRO_PAYWALL_TRIAL_TIMELINE,
  compact = false,
  embeddedInCard = false,
}: {
  nodes?: readonly { icon: ProPaywallTimelineIcon; text: string }[];
  compact?: boolean;
  embeddedInCard?: boolean;
}) {
  return (
    <div
      className={cn(
        compact ? "mt-0" : "mt-6",
        embeddedInCard &&
          "border-t border-[color:var(--paywall-grouped-separator)] px-1 pt-3 pb-1",
      )}
      aria-label="Free und Pro im Überblick"
    >
      <p
        className="mb-2 px-1 text-[13px] font-medium uppercase tracking-[0.02em] text-[color:var(--vd-muted)]"
      >
        Free & Pro im Überblick
      </p>
      <ol
        className={cn(
          "paywall-timeline-group overflow-hidden",
          embeddedInCard
            ? "rounded-none bg-transparent ring-0"
            : "rounded-2xl bg-[color:var(--paywall-grouped-bg)] ring-1 ring-[color:var(--paywall-grouped-separator)]",
        )}
      >
        {nodes.map((node, index) => (
          <li
            key={node.text}
            className={cn(
              "relative flex gap-3 px-3.5 py-3",
              index > 0 &&
                "border-t border-[color:var(--paywall-grouped-separator)]",
            )}
          >
            <span
              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--paywall-apple-blue)]/12 text-[color:var(--paywall-apple-blue)]"
              aria-hidden
            >
              <TimelineIcon icon={node.icon} />
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 leading-snug",
                compact ? "text-[13px]" : "text-[14px]",
              )}
            >
              <TimelineText text={node.text} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
