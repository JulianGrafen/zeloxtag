"use client";

import { forwardRef, useState } from "react";

import {
  shareCardDimensions,
  type ShareCardFormat,
} from "@/lib/share/share-card-variant";

import { ShareCardBuildDerWocheHeader } from "./ShareCardBuildDerWocheHeader";
import { ShareCardHeroMedia } from "./ShareCardHeroMedia";
import { ShareCardInstagramHandle } from "./ShareCardInstagramHandle";
import { ShareCardStoryFooterMark } from "./ShareCardStoryFooterMark";
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
  const modelSizePx = isPost ? 56 : 72;
  const footerLogoPx = isPost ? 84 : 100;

  return (
    <div
      ref={ref}
      data-share-card-export=""
      className={className}
      style={{ width, height }}
    >
      <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a] text-white">
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
          <ShareCardBuildDerWocheHeader
            rank={data.weeklyShowcaseRank}
            format={format}
            className="absolute left-10 top-10 z-20 sm:left-12 sm:top-12"
          />
        ) : null}

        <div
          className="absolute inset-x-0 bottom-0 z-10 px-10 pb-[max(7.5rem,18%)]"
        >
          <p
            className="font-[family-name:var(--font-display)] font-bold leading-[1.05] tracking-[-0.03em] break-words drop-shadow-[0_4px_24px_rgba(0,0,0,0.75)]"
            style={{ fontSize: modelSizePx }}
          >
            {data.modelName}
          </p>
          {data.instagramHandle ? (
            <ShareCardInstagramHandle
              handle={data.instagramHandle}
              variant="hero"
              compact={isPost}
              tight
            />
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-8 z-20 flex justify-center px-6">
          <ShareCardStoryFooterMark heightPx={footerLogoPx} />
        </div>
      </div>
    </div>
  );
});
