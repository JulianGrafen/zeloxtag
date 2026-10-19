"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type IOSPageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
};

export function IOSPageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Zurück",
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
      >
        <div className="mx-auto flex h-11 max-w-2xl items-center justify-center px-4">
          <p className="truncate text-[17px] font-semibold text-white">
            {title}
          </p>
        </div>
      </div>

      <div
        ref={sentinelRef}
        className="pt-[max(0.75rem,env(safe-area-inset-top))]"
      />

      <div className="mx-auto w-full max-w-2xl px-4 pb-2">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-2 inline-block text-[15px] text-[#0A84FF]"
          >
            {backLabel}
          </Link>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle ? (
          <div className="mt-1 text-[15px] leading-snug text-zinc-400">
            {subtitle}
          </div>
        ) : null}
      </div>
    </header>
  );
}
