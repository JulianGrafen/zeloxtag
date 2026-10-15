import Link from "next/link";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type ShowcaseDiscoverOptInBannerProps = {
  profilSettingsHref: string;
  className?: string;
};

export function ShowcaseDiscoverOptInBanner({
  profilSettingsHref,
  className,
}: ShowcaseDiscoverOptInBannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]/60 px-3.5 py-3",
        className,
      )}
    >
      <Sparkles
        className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
        aria-hidden
      />
      <p className="min-w-0 text-[0.82rem] leading-snug text-[color:var(--vd-muted)]">
        Swipen geht immer — für die Wochenrangliste brauchst du ein öffentliches
        Profil.{" "}
        <Link
          href={`${profilSettingsHref}#build-swipe`}
          className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
        >
          Im Profil aktivieren
        </Link>
      </p>
    </div>
  );
}
