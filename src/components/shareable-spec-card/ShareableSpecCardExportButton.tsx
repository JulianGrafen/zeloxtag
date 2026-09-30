"use client";

import { Loader2, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShareableSpecCardExportButtonProps = {
  onExport: () => void;
  isExporting: boolean;
  error?: string | null;
  className?: string;
  label?: string;
  pendingLabel?: string;
  hint?: string | null;
};

export function ShareableSpecCardExportButton({
  onExport,
  isExporting,
  error,
  className,
  label = "In Instagram Story teilen",
  pendingLabel = "Story wird erstellt…",
  hint,
}: ShareableSpecCardExportButtonProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="min-h-12 w-full gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
        disabled={isExporting}
        aria-busy={isExporting}
        onClick={() => onExport()}
      >
        {isExporting ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <Share2 className="h-5 w-5" aria-hidden />
        )}
        {isExporting ? pendingLabel : label}
      </Button>
      {hint && !error ? (
        <p className="text-center text-[0.78rem] leading-snug text-white/50">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
