"use client";

import { useState } from "react";
import { Printer, Share2 } from "lucide-react";

type ExposeToolbarProps = {
  vehicleTitle: string;
};

export function ExposeToolbar({ vehicleTitle }: ExposeToolbarProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `ZeloxTag Exposé · ${vehicleTitle}`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled share sheet */
    }
  }

  return (
    <div className="expose-no-print flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-[0.88rem] font-semibold text-white sm:flex-none"
      >
        <Printer className="h-4 w-4" aria-hidden />
        PDF / Drucken
      </button>
      <button
        type="button"
        onClick={() => void handleShare()}
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-[0.88rem] font-semibold text-zinc-900 sm:flex-none"
      >
        <Share2 className="h-4 w-4" aria-hidden />
        {copied ? "Link kopiert" : "Teilen"}
      </button>
    </div>
  );
}
