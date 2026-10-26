import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { IOS_CARD } from "./ios-styles";

export type IOSEmptyStateProps = {
  title?: string;
  icon?: LucideIcon;
  children?: ReactNode;
  className?: string;
};

export function IOSEmptyState({
  title,
  icon: Icon,
  children,
  className,
}: IOSEmptyStateProps) {
  return (
    <div
      className={cn(
        IOS_CARD,
        "px-5 py-6 text-center text-[15px] leading-relaxed text-[#8E8E93]",
        className,
      )}
    >
      {Icon ? (
        <Icon
          className="mx-auto mb-3 h-8 w-8 text-[#48484A]"
          strokeWidth={1.5}
          aria-hidden
        />
      ) : null}
      {title ? (
        <p className="mb-1 text-[17px] font-semibold text-white">{title}</p>
      ) : null}
      {children}
    </div>
  );
}
