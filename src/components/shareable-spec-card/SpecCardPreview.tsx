"use client";

import { forwardRef, useState } from "react";

import {
  shareCardDimensions,
  type ShareCardFormat,
  type ShareCardStyle,
} from "@/lib/share/share-card-variant";

import { ShareCardRankHeroPreview } from "./ShareCardRankHeroPreview";
import { ShareCardBuildDnaBlock } from "./ShareCardBuildDnaBlock";
import { ShareCardInstagramHandle } from "./ShareCardInstagramHandle";
import { ShareCardSpecRowView } from "./ShareCardSpecRow";
import { ShareCardWeeklyRankBadge } from "./ShareCardWeeklyRankBadge";
import { ShareCardZeloxMark } from "./ShareCardZeloxMark";
import { ShareCardHeroMedia } from "./ShareCardHeroMedia";

import { computeShareCardLayout } from "./share-card-layout";
import type { ShareableBuildData } from "./types";

type SpecCardPreviewProps = {
  data: ShareableBuildData;
  format?: ShareCardFormat;
  style?: ShareCardStyle;
  className?: string;
};

const ShowcaseSpecCardPreview = forwardRef<
  HTMLDivElement,
  Omit<SpecCardPreviewProps, "style"> & { format: ShareCardFormat }
>(function ShowcaseSpecCardPreview({ data, format, className }, ref) {
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = Boolean(data.imageUrl) && !imageFailed;
    /** Post 3:4 — no Umbau-DNA (radar overlapped hero/specs). Story keeps DNA zone. */
    const showDna = data.buildDna != null && format !== "post";
    const { width, height } = shareCardDimensions(format);
    const layout = computeShareCardLayout(data, format);

    const specGapClass =
      layout.density === "dense"
        ? "space-y-2"
        : layout.density === "compact"
          ? "space-y-3"
          : "space-y-4";

    const scaleWrapperWidth =
      layout.contentScale < 1 ? `${100 / layout.contentScale}%` : "100%";

    return (
      <div
        ref={ref}
        data-share-card-export=""
        className={className}
        style={{ width, height }}
      >
        <div
          className="relative grid h-full w-full overflow-hidden bg-[#0a0a0a] text-white"
          style={{
            gridTemplateRows: showDna
              ? `${layout.heroHeightPercent}fr ${layout.specsZonePercent}fr ${layout.dnaZonePercent}fr ${layout.footerZonePercent}fr`
              : `${layout.heroHeightPercent}fr ${layout.specsZonePercent}fr ${layout.footerZonePercent}fr`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(40,40,40,0.55), transparent 55%)",
            }}
          />

          <div className="relative min-h-0 overflow-hidden">
            {showImage ? (
              <ShareCardHeroMedia
                imageUrl={data.imageUrl!}
                onError={() => setImageFailed(true)}
                variant="showcase"
              />
            ) : (
              <div className="absolute inset-0 bg-zinc-900" />
            )}

            {data.weeklyShowcaseRank != null ? (
              <div className="absolute left-10 top-10 z-20">
                <ShareCardWeeklyRankBadge rank={data.weeklyShowcaseRank} />
              </div>
            ) : null}

            <div className="absolute inset-x-0 bottom-0 z-10 px-12 pb-6">
              <p className="text-[68px] font-bold leading-[1.05] tracking-tight break-words">
                {data.modelName}
              </p>
              {data.instagramHandle ? (
                <ShareCardInstagramHandle
                  handle={data.instagramHandle}
                  variant="hero"
                  compact={layout.density !== "comfortable"}
                />
              ) : null}
            </div>
          </div>

          <div className="relative z-10 flex min-h-0 flex-col gap-2 overflow-hidden px-12 py-2">
            <div className="min-h-0 flex-1 overflow-hidden">
              <div
                className="origin-top-left"
                style={{
                  transform: `scale(${layout.contentScale})`,
                  width: scaleWrapperWidth,
                }}
              >
                <div className={specGapClass}>
                  {data.specRows.map((row) => (
                    <ShareCardSpecRowView
                      key={row.key}
                      row={row}
                      compact={layout.density !== "comfortable"}
                      density={layout.density}
                    />
                  ))}
                  {data.modificationsCount > 0 ? (
                    <p
                      className={`font-mono uppercase tracking-[0.16em] text-zinc-500 ${
                        layout.density === "dense"
                          ? "text-[22px]"
                          : "text-[24px]"
                      }`}
                    >
                      {data.modificationsCount}{" "}
                      {data.modificationsCount === 1 ? "Umbau" : "Umbauten"}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {showDna ? (
            <div className="relative z-10 min-h-0 overflow-hidden">
              <ShareCardBuildDnaBlock
                dna={data.buildDna!}
                compact
                fillHeight
              />
            </div>
          ) : null}

          <footer className="relative z-10 flex min-h-0 items-end border-t border-white/10 px-12 py-4">
            <ShareCardZeloxMark heightPx={layout.footerLogoHeightPx} />
          </footer>
        </div>
      </div>
    );
});

export const SpecCardPreview = forwardRef<HTMLDivElement, SpecCardPreviewProps>(
  function SpecCardPreview(
    { data, format = "story", style = "showcase", className },
    ref,
  ) {
    if (style === "rankHero") {
      return (
        <ShareCardRankHeroPreview
          ref={ref}
          data={data}
          format={format}
          className={className}
        />
      );
    }

    return (
      <ShowcaseSpecCardPreview
        ref={ref}
        data={data}
        format={format}
        className={className}
      />
    );
  },
);
