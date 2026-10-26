import type { ReactNode } from "react";

import { InsetGroupedCard } from "./InsetGroupedCard";

export type IOSGroupedListProps = {
  headerTitle?: string;
  footerText?: string;
  children: ReactNode;
  className?: string;
};

export function IOSGroupedList({
  headerTitle,
  footerText,
  children,
  className,
}: IOSGroupedListProps) {
  return (
    <InsetGroupedCard
      header={headerTitle}
      footer={footerText}
      className={className}
    >
      {children}
    </InsetGroupedCard>
  );
}
