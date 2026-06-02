import { ImageResponse } from "next/og";

export const alt = "StickerMate album tracker preview";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f7f4",
          color: "#171717",
          padding: 72,
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: 24,
              background: "#156f5b",
              color: "#f7f7f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 54,
              fontWeight: 900
            }}
          >
            SM
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 0 }}>StickerMate</div>
            <div style={{ marginTop: 10, fontSize: 28, color: "#505050" }}>FIFA World Cup 2026 album tracker</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.02 }}>
            Track collection progress, duplicates, trades and spending.
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 26, fontWeight: 800 }}>
            {["Serbian + English", "PWA ready", "Local-first"].map((item) => (
              <div
                key={item}
                style={{
                  padding: "14px 20px",
                  borderRadius: 16,
                  background: "#ffffff",
                  border: "2px solid #e2e2da",
                  color: "#156f5b"
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
