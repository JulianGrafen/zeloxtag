import type { CSSProperties } from "react";

import { weeklyRankAwardHeadline } from "@/lib/showcase/weekly-rank-award-keys";
import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import {
  shareCardDimensions,
  type ShareCardFormat,
} from "@/lib/share/share-card-variant";

import type { StoryCardOgPayload } from "./story-card-og-types";

type StoryCardOgRankHeroTemplateProps = {
  payload: StoryCardOgPayload;
  format: ShareCardFormat;
};

function rankHeadline(rank: TopThreeWeeklyRank): string {
  return weeklyRankAwardHeadline(rank);
}

export function StoryCardOgRankHeroTemplate({
  payload,
  format,
}: StoryCardOgRankHeroTemplateProps) {
  const { width, height } = shareCardDimensions(format);
  const scale = height / 1920;

  const root: CSSProperties = {
    width,
    height,
    display: "flex",
    flexDirection: "column",
    background: "#0a0a0a",
    color: "#ffffff",
    fontFamily: "Inter",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <div style={root}>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {payload.heroImageDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori OG render
          <img
            src={payload.heroImageDataUri}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "50% 46%",
              transform: "scale(1.08)",
              transformOrigin: "center center",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#18181b",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.5) 36%, rgba(0,0,0,0.18) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "0 52% 0 0",
            background:
              "linear-gradient(to right, rgba(0,0,0,0.72) 0%, transparent 100%)",
          }}
        />

        {payload.weeklyRank != null ? (
          <div
            style={{
              position: "absolute",
              top: 36 * scale,
              left: 36 * scale,
              display: "flex",
              overflow: "hidden",
              borderRadius: 32 * scale,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.55)",
              transform: `scale(${format === "post" ? 1.02 : 1.2})`,
              transformOrigin: "top left",
            }}
          >
            <div
              style={{
                display: "flex",
                minWidth: 156 * scale,
                alignItems: "center",
                justifyContent: "center",
                padding: `${24 * scale}px ${28 * scale}px`,
                background:
                  payload.weeklyRank === 1
                    ? "linear-gradient(135deg, rgba(245,158,11,0.35), rgba(69,26,3,0.5))"
                    : payload.weeklyRank === 2
                      ? "linear-gradient(135deg, rgba(212,212,216,0.25), rgba(24,24,27,0.55))"
                      : "linear-gradient(135deg, rgba(234,88,12,0.3), rgba(23,23,23,0.55))",
              }}
            >
              <span
                style={{
                  fontSize: 142 * scale,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: "-0.045em",
                }}
              >
                {payload.weeklyRank}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 8 * scale,
                borderLeft: "1px solid rgba(255,255,255,0.1)",
                padding: `${20 * scale}px ${28 * scale}px`,
                maxWidth: 520 * scale,
              }}
            >
              <span
                style={{
                  fontSize: 14 * scale,
                  fontWeight: 600,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                ZeloxTag
              </span>
              <span
                style={{
                  fontSize: 40 * scale,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  lineHeight: 1.02,
                }}
              >
                {rankHeadline(payload.weeklyRank)}
              </span>
            </div>
          </div>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: 40 * scale,
            right: 40 * scale,
            bottom: 24 * scale,
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: (format === "post" ? 52 : 64) * scale,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {payload.modelName}
          </div>
          {payload.instagramHandle ? (
            <div
              style={{
                marginTop: 8 * scale,
                fontSize: 28 * scale,
                fontWeight: 600,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              @{payload.instagramHandle.replace(/^@/, "")}
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: `${20 * scale}px ${40 * scale}px ${28 * scale}px`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {payload.logoDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori OG render
          <img
            src={payload.logoDataUri}
            alt="ZeloxTag"
            style={{ height: 132 * scale, width: "auto" }}
          />
        ) : (
          <span
            style={{
              fontSize: 20 * scale,
              fontWeight: 700,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            ZELOXTAG
          </span>
        )}
      </div>
    </div>
  );
}
