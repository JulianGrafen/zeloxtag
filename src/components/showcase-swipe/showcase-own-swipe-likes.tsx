"use client";

import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";

type ShowcaseOwnSwipeLikesProps = {
  totalLikes: number;
  unreadLikes?: number;
  className?: string;
};

export function ShowcaseOwnSwipeLikes({
  totalLikes,
  unreadLikes = 0,
  className,
}: ShowcaseOwnSwipeLikesProps) {
  const likeWord = totalLikes === 1 ? "Like" : "Likes";
  const likeLabel =
    unreadLikes > 0
      ? `${totalLikes} ${likeWord} auf deinem Build, ${unreadLikes} neu`
      : `${totalLikes} ${likeWord} auf deinem Build`;

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3.5 text-[0.95rem] leading-snug",
        className,
      )}
      aria-label={likeLabel}
    >
      <Heart
        className="h-5 w-5 shrink-0 text-rose-500"
        fill="currentColor"
        aria-hidden
      />
      <p className="min-w-0 text-[color:var(--vd-muted)]">
        <span className="text-[1.08rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
          {totalLikes}
        </span>
        {" "}
        {likeWord} auf deinem Build
        {unreadLikes > 0 ? (
          <>
            <span aria-hidden> · </span>
            <span className="text-[1.02rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
              {unreadLikes}
            </span>
            {" "}
            neu
          </>
        ) : null}
      </p>
    </div>
  );
}
