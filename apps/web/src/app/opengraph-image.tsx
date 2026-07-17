import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "De Voetbalgazet — Lokaal voetbal, echte verhalen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#171511",
          color: "#fffdf8",
          padding: "72px",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#e8dece",
          }}
        >
          De Voetbalgazet
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              lineHeight: 1.05,
              maxWidth: 980,
            }}
          >
            Lokaal voetbal, echte verhalen.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#e8dece",
              maxWidth: 820,
            }}
          >
            Verhalen, interviews en analyses uit het Vlaamse provinciale voetbal.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#aaa092",
          }}
        >
          devoetbalgazet.be
        </div>
      </div>
    ),
    { ...size },
  );
}
