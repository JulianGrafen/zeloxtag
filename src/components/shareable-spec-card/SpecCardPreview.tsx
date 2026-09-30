"use client";

import { forwardRef, useState } from "react";

import {
  SHAREABLE_SPEC_CARD_HEIGHT_PX,
  SHAREABLE_SPEC_CARD_WIDTH_PX,
} from "./constants";
import { ShareCardBuildDnaBlock } from "./ShareCardBuildDnaBlock";
import { ShareCardInstagramHandle } from "./ShareCardInstagramHandle";
import { ShareCardSpecRowView } from "./ShareCardSpecRow";
import { ShareCardZeloxMark } from "./ShareCardZeloxMark";
import { computeShareCardLayout } from "./share-card-layout";
import type { ShareableBuildData } from "./types";

type SpecCardPreviewProps = {
  data: ShareableBuildData;
  className?: string;
};

export const SpecCardPreview = forwardRef<HTMLDivElement, SpecCardPreviewProps>(
  function SpecCardPreview({ data, className }, ref) {
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = Boolean(data.imageUrl) && !imageFailed;
    const showDna = data.buildDna != null;
    const layout = computeShareCardLayout(data);

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
        style={{
          width: SHAREABLE_SPEC_CARD_WIDTH_PX,
          height: SHAREABLE_SPEC_CARD_HEIGHT_PX,
        }}
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

          <div className="relative min-h-0">
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- DOM export requires native img + crossOrigin
              <img
                src={data.imageUrl}
                alt=""
                crossOrigin="anonymous"
                className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="absolute inset-0 bg-zinc-900" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 z-10 px-12 pb-6">
              <p className="text-[48px] font-bold leading-[1.05] tracking-tight break-words">
                {data.modelName}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex min-h-0 flex-col gap-2 overflow-hidden px-12 py-2">
            {data.instagramHandle ? (
              <ShareCardInstagramHandle
                handle={data.instagramHandle}
                compact={layout.density !== "comfortable"}
              />
            ) : null}

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
                      compact
                      density={layout.density}
                    />
                  ))}
                  {data.modificationsCount > 0 ? (
                    <p
                      className={`font-mono uppercase tracking-[0.16em] text-zinc-500 ${
                        layout.density === "dense"
                          ? "text-[16px]"
                          : "text-[18px]"
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
            <div className="relative z-10 min-h-0 overflow-hidden px-4">
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
  },
);
