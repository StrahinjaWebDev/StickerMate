import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "StickerMate",
    short_name: "StickerMate",
    description: "Track your FIFA World Cup 2026 Panini sticker album, missing stickers, duplicates, trades and collection progress.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#f7f7f4",
    theme_color: "#156f5b",
    categories: ["sports", "utilities", "productivity"],
    lang: "sr",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ],
    screenshots: [
      {
        src: "/opengraph-image",
        sizes: "1200x630",
        type: "image/png",
        form_factor: "wide",
        label: "StickerMate dashboard preview"
      }
    ]
  };
}
