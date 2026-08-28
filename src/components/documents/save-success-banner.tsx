"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function SaveSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    if (searchParams.get("saved") === "1") {
      setVisible(true);
      setIsDuplicate(searchParams.get("duplicate") === "1");
      const url = new URL(window.location.href);
      url.searchParams.delete("saved");
      url.searchParams.delete("duplicate");
      router.replace(`${url.pathname}${url.search}${url.hash}`, {
        scroll: false,
      });
    }
  }, [router, searchParams]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[0.85rem] text-emerald-950"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="flex-1 font-medium">
        {isDuplicate
          ? "Beleg existiert bereits — in der Liste geöffnet."
          : "Dokument gespeichert."}
      </p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-emerald-900/80 hover:bg-emerald-500/15"
        aria-label="Hinweis schließen"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
