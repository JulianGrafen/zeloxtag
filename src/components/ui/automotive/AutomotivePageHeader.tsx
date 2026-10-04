import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  automotiveBackPillClassName,
  automotiveBodyMutedClassName,
  automotiveDisplayTitleClassName,
  automotiveKickerClassName,
  automotiveMetaClassName,
  automotivePageHeaderBlockClassName,
} from "./primitives";

type AutomotivePageHeaderProps = {
  title: string;
  description?: ReactNode;
  kicker?: string;
  meta?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
  actions?: ReactNode;
};

export function AutomotivePageHeader({
  title,
  description,
  kicker,
  meta,
  backHref,
  backLabel = "Zurück",
  className,
  actions,
}: AutomotivePageHeaderProps) {
  return (
    <header className={cn("space-y-4", className)}>
      {backHref ? (
        <Link href={backHref} className={automotiveBackPillClassName}>
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {backLabel}
        </Link>
      ) : null}
      <div className={automotivePageHeaderBlockClassName}>
        {kicker ? <p className={automotiveKickerClassName}>{kicker}</p> : null}
        <div className="flex items-start justify-between gap-3">
          <h1 className={automotiveDisplayTitleClassName}>{title}</h1>
          {actions}
        </div>
        {meta ? <p className={automotiveMetaClassName}>{meta}</p> : null}
        {description ? (
          <div className={automotiveBodyMutedClassName}>{description}</div>
        ) : null}
      </div>
    </header>
  );
}
