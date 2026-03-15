import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Martial Spirit Gym - Boxe Thaïlandaise & MMA à Gland";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background:
            "linear-gradient(135deg, #050505 0%, #0f0f11 45%, #1a1a1f 100%)",
          color: "#f5f5f5",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid rgba(239, 68, 68, 0.45)",
            borderRadius: "999px",
            padding: "8px 18px",
            fontSize: 24,
            fontWeight: 700,
            color: "#fecaca",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            width: "fit-content",
          }}
        >
          Martial Spirit Gym
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 76,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              maxWidth: 980,
            }}
          >
            Martial Spirit Gym
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 40,
              lineHeight: 1.2,
              color: "#d4d4d8",
              fontWeight: 600,
            }}
          >
            Boxe Thaïlandaise & MMA à Gland
          </p>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 30,
            color: "#a1a1aa",
            fontWeight: 500,
          }}
        >
          Route de Nyon 21 - Gland, Suisse
        </p>
      </div>
    ),
    {
      ...size,
    },
  );
}
