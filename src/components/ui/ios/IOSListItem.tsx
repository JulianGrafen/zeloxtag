"use client";

import type { ReactNode } from "react";

import { InsetListRow } from "./InsetListRow";

export type IOSListItemProps = {
  label: string;
  sublabel?: string;
  value?: string;
  href?: string;
  onPress?: () => void;
  icon?: ReactNode;
  trailing?: ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
  isLast?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Settings-style row (white label, grey value) on top of `InsetListRow`. */
export function IOSListItem({
  icon,
  showChevron,
  ...rest
}: IOSListItemProps) {
  return (
    <InsetListRow
      {...rest}
      emphasis="navigation"
      leading={icon}
      chevron={showChevron}
    />
  );
}
