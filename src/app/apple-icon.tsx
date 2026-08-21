import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 96,
            height: 96,
            gap: 8,
          }}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "#FAFAFA",
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
