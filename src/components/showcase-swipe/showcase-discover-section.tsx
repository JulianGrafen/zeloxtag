import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ShowcaseDiscoverSectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function ShowcaseDiscoverSection({
  title,
  subtitle,
  children,
  className,
  id,
}: ShowcaseDiscoverSectionProps) {
  return (
    <section id={id} className={cn("space-y-4", className)}>
      <header className="px-0.5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
