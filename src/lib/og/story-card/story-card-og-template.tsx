import type { CSSProperties } from "react";

import {
  shareCardDimensions,
  type ShareCardFormat,
} from "@/lib/share/share-card-variant";

import type { StoryCardOgPayload } from "./story-card-og-types";

type StoryCardOgTemplateProps = {
  payload: StoryCardOgPayload;
  format?: ShareCardFormat;
};

function showcaseRoot(format: ShareCardFormat): CSSProperties {
  const { width, height } = shareCardDimensions(format);
  return {
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
}

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

export function StoryCardOgTemplate({
  payload,
  format = "story",
}: StoryCardOgTemplateProps) {
  const showHero = Boolean(payload.heroImageDataUri);
  const scale = shareCardDimensions(format).height / 1920;
  const s = (px: number) => px * scale;

  return (
    <div style={showcaseRoot(format)}>
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
              top: s(40),
              left: s(48),
              padding: `${s(12)}px ${s(20)}px`,
              borderRadius: s(16),
              background: "rgba(245, 158, 11, 0.18)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              fontSize: s(26),
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#fcd34d",
            }}
          >
            {weeklyRankLabel(payload.weeklyRank)}
          </div>
        ) : null}

        <div
          style={{
            position: "relative",
            padding: `0 ${s(48)}px ${s(32)}px`,
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: s(64),
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
          gap: s(28),
          padding: `${s(24)}px ${s(48)}px`,
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: s(22),
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              fontWeight: 600,
            }}
          >
            Gesamtleistung
          </div>
          <div
            style={{
              fontSize: s(52),
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {payload.powerLabel}
          </div>
        </div>

        {payload.topMods.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                fontSize: s(22),
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
                  fontSize: s(30),
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                <span
                  style={{
                    width: s(36),
                    height: s(36),
                    borderRadius: s(10),
                    background: "rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: s(20),
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
                fontSize: s(22),
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.45)",
                fontWeight: 600,
              }}
            >
              Total Invested
            </div>
            <div
              style={{
                fontSize: s(44),
                fontWeight: 700,
                color: "#34d399",
              }}
            >
              {payload.totalInvestedLabel}
            </div>
          </div>
        ) : null}

        {payload.modificationsCount > 0 ? (
          <div
            style={{
              fontSize: s(22),
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
          padding: `${s(28)}px ${s(48)}px ${s(36)}px`,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontSize: s(24),
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {payload.trustBadge}
        </div>
        {payload.logoDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori OG render
          <img
            src={payload.logoDataUri}
            alt="ZeloxTag"
            style={{ height: s(132), width: "auto" }}
          />
        ) : (
          <div
            style={{
              fontSize: s(20),
              fontWeight: 700,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            ZELOXTAG
          </div>
        )}
      </div>
    </div>
  );
}
