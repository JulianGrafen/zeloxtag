"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export const SHOWCASE_WEEKLY_RANK_TOAST_DURATION_MS = 8000;

const TOAST_CLASS =
  "!border-amber-400/30 !bg-black/55 !text-white shadow-2xl backdrop-blur-xl backdrop-saturate-150";

type WeeklyRankToastPayload = {
  headline: string;
  rank: number;
  weeklyLikes: number;
  entdeckenHref: string;
};

export function showShowcaseWeeklyRankAwardToast(
  payload: WeeklyRankToastPayload,
): void {
  toast(payload.headline, {
    duration: SHOWCASE_WEEKLY_RANK_TOAST_DURATION_MS,
    icon: <Sparkles className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />,
    description: `Platz ${payload.rank} · ${payload.weeklyLikes} Likes diese Woche. Story-Karte teilen.`,
    action: {
      label: "Zur Platzierung",
      onClick: () => {
        window.location.assign(payload.entdeckenHref);
      },
    },
    classNames: {
      toast: TOAST_CLASS,
      title: "!text-white font-semibold",
      description: "!text-white/80",
    },
  });
}
