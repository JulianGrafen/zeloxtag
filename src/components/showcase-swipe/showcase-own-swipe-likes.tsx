"use client";

import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";

type ShowcaseOwnSwipeLikesProps = {
  totalLikes: number;
  className?: string;
};

export function ShowcaseOwnSwipeLikes({
  totalLikes,
  className,
}: ShowcaseOwnSwipeLikesProps) {
  const likeWord = totalLikes === 1 ? "Like" : "Likes";
  const likeLabel = `${totalLikes} ${likeWord} auf deinem Build`;

  return (
    <div
      className={cn(
        "flex items-center gap-3.5 py-3.5 text-[1rem] leading-snug",
        className,
      )}
      aria-label={likeLabel}
    >
      <Heart
        className="h-7 w-7 shrink-0 text-rose-500"
        fill="currentColor"
        aria-hidden
      />
      <p className="min-w-0 text-[color:var(--vd-muted)]">
        <span className="text-[1.45rem] font-semibold tabular-nums tracking-tight text-[color:var(--vd-text)]">
          {totalLikes}
        </span>
        {" "}
        {likeWord} auf deinem Build
      </p>
    </div>
  );
}
