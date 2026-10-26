"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { IOSBackLink } from "./IOSBackLink";

export type IOSPageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  backLabel?: string;
  /** Content width; must match the page body so the large title aligns with the cards. */
  maxWidthClassName?: string;
  className?: string;
};

export function IOSPageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Zurück",
  maxWidthClassName = "max-w-2xl",
  className,
}: IOSPageHeaderProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setCollapsed(!entry.isIntersecting);
        }
      },
      { root: null, threshold: 0, rootMargin: "-1px 0px 0px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <header data-ios-ui className={cn("ios-ui relative z-30", className)}>
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-40 border-b transition-all duration-200",
          collapsed
            ? "border-white/10 bg-black/75 backdrop-blur-xl"
            : "pointer-events-none border-transparent bg-transparent opacity-0",
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
        aria-hidden={!collapsed}
        inert={!collapsed}
      >
        <div
          className={cn(
            "relative mx-auto flex h-11 items-center justify-center px-4",
            maxWidthClassName,
          )}
        >
          {backHref ? (
            <IOSBackLink
              href={backHref}
              label={backLabel}
              className="absolute left-4 max-w-[30%] truncate"
            />
          ) : null}
          <p className="max-w-[45%] truncate text-[17px] font-semibold text-white">
            {title}
          </p>
        </div>
      </div>

      <div
        ref={sentinelRef}
        className="pt-[max(0.5rem,env(safe-area-inset-top))]"
      />

      <div className={cn("mx-auto w-full px-4 pb-2", maxWidthClassName)}>
        {backHref ? <IOSBackLink href={backHref} label={backLabel} /> : null}
        <h1 className="mt-1 text-[34px] font-bold leading-tight tracking-tight text-white">
          {title}
        </h1>
        {subtitle ? (
          <div className="mt-1 text-[15px] leading-snug tabular-nums text-[#8E8E93]">
            {subtitle}
          </div>
        ) : null}
      </div>
    </header>
  );
}
