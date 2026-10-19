import type { CSSProperties } from "react";

import {
  SHAREABLE_SPEC_CARD_HEIGHT_PX,
  SHAREABLE_SPEC_CARD_WIDTH_PX,
} from "@/components/shareable-spec-card/constants";

import type { StoryCardOgPayload } from "./story-card-og-types";

type StoryCardOgTemplateProps = {
  payload: StoryCardOgPayload;
};

const root: CSSProperties = {
  width: SHAREABLE_SPEC_CARD_WIDTH_PX,
  height: SHAREABLE_SPEC_CARD_HEIGHT_PX,
  display: "flex",
  flexDirection: "column",
  background: "#0a0a0a",
  color: "#ffffff",
  fontFamily: "Inter",
  position: "relative",
  overflow: "hidden",
};

const heroGradient: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(40,40,40,0.55), transparent 55%)",
  opacity: 0.4,
};

const heroFade: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.4) 45%, transparent 100%)",
};

function weeklyRankLabel(rank: 1 | 2 | 3): string {
  return `Top ${rank} · Woche`;
}

export function StoryCardOgTemplate({ payload }: StoryCardOgTemplateProps) {
  const showHero = Boolean(payload.heroImageDataUri);

  return (
    <div style={root}>
      <div style={heroGradient} />
      <div
        style={{
          position: "relative",
          flex: "0 0 46%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        {showHero ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori OG render
          <img
            src={payload.heroImageDataUri!}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "50% 58%",
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
        <div style={heroFade} />

        {payload.weeklyRank != null ? (
          <div
            style={{
              position: "absolute",
              top: 40,
              left: 48,
              padding: "12px 20px",
              borderRadius: 16,
              background: "rgba(245, 158, 11, 0.18)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#fcd34d",
            }}
          >
            {weeklyRankLabel(payload.weeklyRank)}
          </div>
        ) : null}

        <div style={{ position: "relative", padding: "0 48px 32px", zIndex: 2 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {payload.modelName}
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
          padding: "24px 48px",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              fontWeight: 600,
            }}
          >
            Gesamtleistung
          </div>
          <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {payload.powerLabel}
          </div>
        </div>

        {payload.topMods.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                fontSize: 22,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.45)",
                fontWeight: 600,
              }}
            >
              Top Umbauten
            </div>
            {payload.topMods.map((mod, index) => (
              <div
                key={`${index}-${mod}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontSize: 30,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    color: "rgba(255,255,255,0.55)",
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </span>
                <span>{mod}</span>
              </div>
            ))}
          </div>
        ) : null}

        {payload.totalInvestedLabel ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontSize: 22,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.45)",
                fontWeight: 600,
              }}
            >
              Total Invested
            </div>
            <div style={{ fontSize: 44, fontWeight: 700, color: "#34d399" }}>
              {payload.totalInvestedLabel}
            </div>
          </div>
        ) : null}

        {payload.modificationsCount > 0 ? (
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(113,113,122,1)",
              fontFamily: "monospace",
            }}
          >
            {payload.modificationsCount}{" "}
            {payload.modificationsCount === 1 ? "Umbau" : "Umbauten"}
          </div>
        ) : null}
      </div>

      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: "28px 48px 36px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {payload.trustBadge}
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.35)",
          }}
        >
          ZELOXTAG
        </div>
      </div>
    </div>
  );
}
