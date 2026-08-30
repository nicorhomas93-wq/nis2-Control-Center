import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(255,255,255,0.12)",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 5v6c0 5.2 3.4 9.8 8 11 4.6-1.2 8-5.8 8-11V5l-8-3z" fill="white" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>TKND</span>
            <span style={{ fontSize: 18, opacity: 0.75 }}>NIS2 Control Center</span>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 56, fontSize: 56, fontWeight: 700, lineHeight: 1.15, maxWidth: 980 }}>
          NIS2-Compliance in Tagen statt Monaten
        </div>

        <div style={{ display: "flex", marginTop: 24, fontSize: 26, opacity: 0.85, maxWidth: 900 }}>
          Betroffenheitsprüfung, Risikoanalyse und prüfsichere Dokumentation für die NIS2-Richtlinie.
        </div>
      </div>
    ),
    { ...size }
  );
}
