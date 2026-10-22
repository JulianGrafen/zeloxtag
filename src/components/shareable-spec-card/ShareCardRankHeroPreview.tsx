"use client";

import { forwardRef, useState } from "react";

import {
  shareCardDimensions,
  type ShareCardFormat,
} from "@/lib/share/share-card-variant";
import { ShareCardHeroMedia } from "./ShareCardHeroMedia";

import { ShareCardInstagramHandle } from "./ShareCardInstagramHandle";
import { ShareCardWeeklyRankBadge } from "./ShareCardWeeklyRankBadge";
import { ShareCardZeloxMark } from "./ShareCardZeloxMark";
import type { ShareableBuildData } from "./types";

type ShareCardRankHeroPreviewProps = {
  data: ShareableBuildData;
  format: ShareCardFormat;
  className?: string;
};

export const ShareCardRankHeroPreview = forwardRef<
  HTMLDivElement,
  ShareCardRankHeroPreviewProps
>(function ShareCardRankHeroPreview({ data, format, className }, ref) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(data.imageUrl) && !imageFailed;
  const { width, height } = shareCardDimensions(format);
  const isPost = format === "post";
  const modelSizePx = isPost ? 52 : 68;
  const footerLogoPx = isPost ? 132 : 172;
  const badgeScale = isPost ? 0.92 : 1.08;

  return (
    <div
      ref={ref}
      data-share-card-export=""
      className={className}
      style={{ width, height }}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0a0a0a] text-white">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {showImage ? (
            <ShareCardHeroMedia
              imageUrl={data.imageUrl!}
              onError={() => setImageFailed(true)}
              variant="rank"
            />
          ) : (
            <div className="absolute inset-0 bg-zinc-900" />
          )}

          {data.weeklyShowcaseRank != null ? (
            <div
              className="absolute left-8 top-8 z-20 origin-top-left"
              style={{ transform: `scale(${badgeScale})` }}
            >
              <ShareCardWeeklyRankBadge rank={data.weeklyShowcaseRank} />
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 z-10 px-10 pb-4">
            <p
              className="font-bold leading-[1.05] tracking-tight break-words"
              style={{ fontSize: modelSizePx }}
            >
              {data.modelName}
            </p>
            {data.instagramHandle ? (
              <ShareCardInstagramHandle
                handle={data.instagramHandle}
                variant="hero"
                compact={isPost}
              />
            ) : null}
          </div>
        </div>

        <footer className="relative z-10 flex shrink-0 items-center justify-center border-t border-white/10 px-10 py-4">
          <ShareCardZeloxMark heightPx={footerLogoPx} />
        </footer>
      </div>
    </div>
  );
});
