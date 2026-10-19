"use client";

import { forwardRef, useState } from "react";

import {
  shareCardDimensions,
  type ShareCardFormat,
} from "@/lib/share/share-card-variant";
import {
  isShareCardCatalogCutout,
  shareCardImageCrossOrigin,
} from "@/lib/share/share-card-image-cross-origin";

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
  const isCatalogCutout = isShareCardCatalogCutout(data.imageUrl);
  const { width, height } = shareCardDimensions(format);
  const isPost = format === "post";
  const modelSizePx = isPost ? 52 : 68;
  const footerLogoPx = isPost ? 132 : 172;
  const badgeScale = isPost ? 0.82 : 1;

  return (
    <div
      ref={ref}
      data-share-card-export=""
      className={className}
      style={{ width, height }}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0a0a0a] text-white">
        <div className="relative min-h-0 flex-1">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- DOM export
            <img
              src={data.imageUrl}
              alt=""
              crossOrigin={shareCardImageCrossOrigin(data.imageUrl)}
              className={
                isCatalogCutout
                  ? "absolute inset-x-0 bottom-[8%] h-[88%] w-full object-contain object-bottom"
                  : "absolute inset-0 h-full w-full object-cover object-[50%_58%]"
              }
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-zinc-900" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/55 to-black/20" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[45%] bg-gradient-to-r from-black/75 to-transparent" />

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
