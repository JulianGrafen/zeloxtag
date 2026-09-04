import { Check, Mail, Shield } from "lucide-react";

import {
  PRO_PAYWALL_TRIAL_TIMELINE,
  type ProPaywallTimelineIcon,
} from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

function TimelineIcon({ icon }: { icon: ProPaywallTimelineIcon }) {
  switch (icon) {
    case "check":
      return <Check className="h-3.5 w-3.5" strokeWidth={2.5} />;
    case "mail":
      return <Mail className="h-3.5 w-3.5" strokeWidth={2.5} />;
    case "shield":
      return <Shield className="h-3.5 w-3.5" strokeWidth={2.5} />;
  }
}

export function TrialTimeline({
  nodes = PRO_PAYWALL_TRIAL_TIMELINE,
  compact = false,
}: {
  nodes?: readonly { icon: ProPaywallTimelineIcon; text: string }[];
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? "mt-0" : "mt-6")} aria-label="Testphase-Ablauf">
      <ol className="relative space-y-0">
        {nodes.map((node, index) => (
          <li
            key={node.text}
            className={cn(
              "relative flex gap-2",
              compact ? "pb-3.5 last:pb-0" : "pb-5 last:pb-0",
            )}
          >
            {index < nodes.length - 1 ? (
              <span
                className="absolute top-6 left-[0.6875rem] h-[calc(100%-1rem)] w-px bg-[color:var(--vd-border)]"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 inline-flex shrink-0 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-text)]",
                compact ? "h-5 w-5" : "h-6 w-6",
              )}
              aria-hidden
            >
              <TimelineIcon icon={node.icon} />
            </span>
            <span
              className={cn(
                "leading-snug text-[color:var(--vd-text)]",
                compact ? "pt-0 text-[0.74rem]" : "pt-0.5 text-[0.82rem]",
              )}
            >
              {node.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
