import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StickerMate",
    short_name: "StickerMate",
    description: "Track your FIFA World Cup 2026 sticker collection.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f4",
    theme_color: "#156f5b",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
