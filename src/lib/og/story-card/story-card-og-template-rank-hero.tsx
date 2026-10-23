import type { CSSProperties } from "react";

import {
  WEEKLY_RANK_STORY_ACCENT,
  weeklyRankStoryCardKicker,
} from "@/components/shareable-spec-card/weekly-rank-story-card-copy";
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

export function StoryCardOgRankHeroTemplate({
  payload,
  format,
}: StoryCardOgRankHeroTemplateProps) {
  const { width, height } = shareCardDimensions(format);
  const scale = height / 1920;
  const isPost = format === "post";

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

  const rankSize = (isPost ? 88 : 112) * scale;
  const kickerSize = (isPost ? 26 : 32) * scale;
  const modelSize = (isPost ? 56 : 72) * scale;
  const logoHeight = (isPost ? 84 : 100) * scale;

  return (
    <div style={root}>
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
            objectPosition: "50% 48%",
            transform: "scale(1.06)",
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
          left: 0,
          right: 0,
          bottom: 0,
          height: "58%",
          maxHeight: 520 * scale,
          background:
            "linear-gradient(to top, #000000 0%, rgba(0,0,0,0.88) 42%, transparent 100%)",
        }}
      />

      {payload.weeklyRank != null ? (
        <div
          style={{
            position: "absolute",
            top: 48 * scale,
            left: 48 * scale,
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span
            style={{
              fontSize: rankSize,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: WEEKLY_RANK_STORY_ACCENT,
            }}
          >
            #{payload.weeklyRank}
          </span>
          <span
            style={{
              marginTop: 4 * scale,
              fontSize: kickerSize,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              lineHeight: 1.05,
              color: WEEKLY_RANK_STORY_ACCENT,
            }}
          >
            {weeklyRankStoryCardKicker(payload.weeklyRank as TopThreeWeeklyRank)}
          </span>
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: 40 * scale,
          right: 40 * scale,
          bottom: 200 * scale,
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontSize: modelSize,
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
              marginTop: 6 * scale,
              fontSize: 34 * scale,
              fontWeight: 500,
              color: "rgba(255,255,255,0.82)",
            }}
          >
            @{payload.instagramHandle.replace(/^@/, "")}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 32 * scale,
          zIndex: 3,
          display: "flex",
          justifyContent: "center",
          paddingLeft: 24 * scale,
          paddingRight: 24 * scale,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16 * scale,
            background: "#000000",
            padding: `${16 * scale}px ${32 * scale}px`,
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          }}
        >
          {payload.logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori OG render
            <img
              src={payload.logoDataUri}
              alt="ZeloxTag"
              style={{ height: logoHeight, width: "auto" }}
            />
          ) : (
            <span
              style={{
                fontSize: 18 * scale,
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
    </div>
  );
}
