import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

import { IOS_LINK } from "./ios-styles";

export type IOSBackLinkProps = {
  href: string;
  label?: string;
  className?: string;
};

/** iOS navigation-bar back button: tinted chevron + parent title, 44pt tap target. */
export function IOSBackLink({
  href,
  label = "Zurück",
  className,
}: IOSBackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "-ml-1.5 inline-flex min-h-11 items-center gap-0.5 text-[17px] active:opacity-50",
        IOS_LINK,
        className,
      )}
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2.25} aria-hidden />
      {label}
    </Link>
  );
}
