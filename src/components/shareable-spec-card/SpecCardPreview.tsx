"use client";

import { forwardRef, useState } from "react";

import { CompactMetricBar } from "./CompactMetricBar";
import {
  SHAREABLE_SPEC_CARD_HEIGHT_PX,
  SHAREABLE_SPEC_CARD_WIDTH_PX,
} from "./constants";
import type { ShareableBuildData } from "./types";
import { V4aMetalBadge } from "./V4aMetalBadge";

type SpecCardPreviewProps = {
  data: ShareableBuildData;
  className?: string;
};

export const SpecCardPreview = forwardRef<HTMLDivElement, SpecCardPreviewProps>(
  function SpecCardPreview({ data, className }, ref) {
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = Boolean(data.imageUrl) && !imageFailed;

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
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0a0a0a] text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(40,40,40,0.55), transparent 55%)",
            }}
          />

          <div className="relative h-[45%] shrink-0">
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

            <div className="absolute inset-x-0 top-0 z-10 px-12 pt-14">
              <p className="max-w-[90%] text-[52px] font-bold leading-[1.05] tracking-tight">
                {data.modelName}
              </p>
              <p className="mt-5 inline-flex border border-white/10 bg-white/5 px-5 py-2.5 text-[22px] font-semibold uppercase tracking-[0.32em] text-white/90">
                {data.stageInfo}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-1 flex-col justify-center gap-10 px-12 py-6">
            <CompactMetricBar metric={data.metrics.power} />
            <CompactMetricBar metric={data.metrics.torque} />
            <CompactMetricBar metric={data.metrics.powerToWeight} lowerIsBetter />
            <p className="font-mono text-[24px] uppercase tracking-[0.22em] text-zinc-500">
              {data.metrics.modsCount}{" "}
              {data.metrics.modsCount === 1 ? "Umbau" : "Umbauten"}
            </p>
          </div>

          <footer className="relative z-10 shrink-0 border-t border-white/10 px-12 py-10">
            <div className="flex items-end justify-between gap-8">
              <div>
                <p className="text-[56px] font-bold uppercase tracking-[0.28em] text-white">
                  <span aria-hidden>ZELOX</span>
                </p>
                <p className="mt-2 text-[20px] font-semibold uppercase tracking-[0.28em] text-white/45">
                  Digital Vehicle Passport
                </p>
              </div>
              <V4aMetalBadge tagId={data.v4aTagId} />
            </div>
          </footer>
        </div>
      </div>
    );
  },
);
