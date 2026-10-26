import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  IOS_CARD,
  IOS_ROW_SEPARATOR,
  IOS_ROW_SEPARATOR_INSET_ICON,
  IOS_ROW_SEPARATOR_INSET_TEXT,
  IOS_SECTION_HEADER,
  IOSEmptyState,
  InsetListRow,
  type IconBadgeTone,
} from "@/components/ui/ios";
import { cn } from "@/lib/utils";

export function AutomotiveSectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h2 className={cn(IOS_SECTION_HEADER, className)}>{children}</h2>;
}

/** Inset-grouped card for list rows; rows draw their own inset separators. */
export function AutomotiveList({
  children,
  className,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <ul
      aria-label={ariaLabel}
      className={cn("vd-anim-list overflow-hidden", IOS_CARD, className)}
    >
      {children}
    </ul>
  );
}

export function AutomotiveListRow({
  href,
  icon,
  iconTone = "neutral",
  title,
  amount,
  meta,
  badge,
  accessory,
  className,
}: {
  href: string;
  icon?: LucideIcon;
  iconTone?: IconBadgeTone;
  title: ReactNode;
  amount?: ReactNode;
  meta: ReactNode;
  badge?: ReactNode;
  /** Secondary control beside the row link (e.g. delete); never nested inside the link. */
  accessory?: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "relative flex items-center",
        IOS_ROW_SEPARATOR,
        icon ? IOS_ROW_SEPARATOR_INSET_ICON : IOS_ROW_SEPARATOR_INSET_TEXT,
        className,
      )}
    >
      <InsetListRow
        className="min-w-0 flex-1"
        href={href}
        icon={icon}
        iconTone={iconTone}
        emphasis="item"
        label={title}
        value={amount}
        valueVariant="numeric"
        chevron
        isLast
        sublabel={
          <>
            <span className="block truncate">{meta}</span>
            {badge ? <span className="mt-1 block">{badge}</span> : null}
          </>
        }
      />
      {accessory ? <div className="shrink-0 pr-2">{accessory}</div> : null}
    </li>
  );
}

export function AutomotiveEmptyPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <IOSEmptyState className={className}>{children}</IOSEmptyState>;
}
