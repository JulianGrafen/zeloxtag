"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

type ShowroomDiscoverBackButtonProps = {
  backHref?: string | null;
  backLabel?: string;
};

const controlClassName =
  "pointer-events-auto absolute left-3 top-[max(3.25rem,calc(env(safe-area-inset-top)+2.5rem))] z-20 inline-flex h-9 items-center justify-center gap-0.5 rounded-full border border-white/25 bg-black/45 pl-1.5 pr-3 text-[0.82rem] font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-black/55 active:bg-black/65";

export function ShowroomDiscoverBackButton({
  backHref,
  backLabel = "Zurück",
}: ShowroomDiscoverBackButtonProps) {
  const router = useRouter();

  if (backHref) {
    return (
      <Link href={backHref} className={controlClassName} aria-label={backLabel}>
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        {backLabel}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={controlClassName}
      aria-label={backLabel}
      onClick={() => router.back()}
    >
      <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
      {backLabel}
    </button>
  );
}
