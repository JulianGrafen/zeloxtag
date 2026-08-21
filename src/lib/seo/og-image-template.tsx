import type { CSSProperties } from "react";

type OgImageTemplateProps = {
  kicker?: string;
  title: string;
  subtitle?: string;
};

const wrapper: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: "64px 72px",
  background: "linear-gradient(145deg, #0f0f10 0%, #1c1c1f 48%, #0a0a0b 100%)",
  color: "#f4f4f5",
  fontFamily: "system-ui, sans-serif",
};

const badge: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const qrBox: CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "14px",
  background: "#fafafa",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#111",
  fontSize: "22px",
  fontWeight: 700,
};

export function OgImageTemplate({
  kicker = "ZeloxTag",
  title,
  subtitle,
}: OgImageTemplateProps) {
  return (
    <div style={wrapper}>
      <div style={badge}>
        <div style={qrBox}>ZT</div>
        <div style={{ fontSize: 28, letterSpacing: "0.18em", opacity: 0.82 }}>
          {kicker.toUpperCase()}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            maxWidth: 980,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div style={{ fontSize: 30, lineHeight: 1.35, opacity: 0.78, maxWidth: 920 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
