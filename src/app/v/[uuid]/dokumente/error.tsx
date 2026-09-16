"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ScanContent } from "@/components/layout/scan-content";
import { Button } from "@/components/ui/button";

type DocumentsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function VehicleDocumentsError({
  error,
  reset,
}: DocumentsErrorProps) {
  const params = useParams();
  const tagUuid =
    typeof params?.uuid === "string" ? params.uuid : "";

  useEffect(() => {
    console.error("[dokumente] route error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  const dashboardHref = tagUuid ? `/v/${tagUuid}` : "/";

  return (
    <AppShell showNavbar={false}>
      <ScanContent className="pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="vd-surface-card space-y-4 p-6">
          <h1 className="claim-title text-[1.35rem]">
            Dokumente konnten nicht geladen werden
          </h1>
          <p className="claim-copy text-[0.92rem]">
            Bitte zurück zum Dashboard und erneut öffnen. Wenn das Problem
            bleibt, Seite neu laden oder später noch einmal versuchen.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" size="lg" onClick={() => reset()}>
              Erneut versuchen
            </Button>
            <Link
              href={dashboardHref}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
            >
              Zum Dashboard
            </Link>
          </div>
        </div>
      </ScanContent>
    </AppShell>
  );
}
