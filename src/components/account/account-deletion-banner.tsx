import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { formatGraceEndDateGerman } from "@/lib/account/account-deletion-shared";

type AccountDeletionBannerProps = {
  graceEndsAt: string;
  settingsHref?: string;
};

export function AccountDeletionBanner({
  graceEndsAt,
  settingsHref = "/settings",
}: AccountDeletionBannerProps) {
  const label = formatGraceEndDateGerman(graceEndsAt);

  return (
    <div
      className="mb-4 flex items-start gap-2.5 rounded-[1.1rem] border border-amber-200/90 bg-amber-50 px-3.5 py-3 text-[0.84rem] leading-relaxed text-amber-950"
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        Dein Konto wird am <strong>{label}</strong> gelöscht — nur Lesen und
        Export sind möglich.{" "}
        <Link
          href={settingsHref}
          className="font-medium underline underline-offset-2"
        >
          Daten exportieren
        </Link>
      </p>
    </div>
  );
}
