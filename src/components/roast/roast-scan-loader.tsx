"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Scanne verbaute Mods…",
  "Vergleiche mit Serienzustand…",
  "Schärfe die Punchline…",
] as const;

export function RoastScanLoader() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 1400);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 py-6">
      <div className="relative mx-auto h-40 w-40">
        <div
          className="absolute inset-0 animate-pulse rounded-full border border-[#00ffc8]/30"
          aria-hidden
        />
        <div
          className="absolute inset-3 animate-ping rounded-full border border-[#ff3366]/40"
          style={{ animationDuration: "2.4s" }}
          aria-hidden
        />
        <div
          className="absolute inset-6 rounded-full bg-gradient-to-br from-[#ff3366]/20 to-[#00ffc8]/10"
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#00ffc8]">
            Scan
          </span>
        </div>
      </div>

      <p className="text-center text-[0.95rem] font-medium text-[#e8e8ef]">
        {MESSAGES[index]}
      </p>

      <div className="space-y-2 px-2">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-3 animate-pulse rounded-full bg-white/10"
            style={{ width: `${88 - row * 12}%`, marginInline: "auto" }}
          />
        ))}
      </div>
    </div>
  );
}
