import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { ThemeHydrator } from "@/components/ThemeHydrator";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "StickerMate | FIFA World Cup 2026 Album Tracker",
    template: "%s | StickerMate"
  },
  description: "Track your FIFA World Cup 2026 sticker album, duplicates, trades and pack spending.",
  applicationName: "StickerMate",
  keywords: ["StickerMate", "FIFA World Cup 2026", "sticker album", "Panini", "album tracker"],
  authors: [{ name: "StickerMate" }],
  creator: "StickerMate",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }]
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "StickerMate",
    title: "StickerMate | FIFA World Cup 2026 Album Tracker",
    description: "A fast, mobile-first tracker for collection progress, duplicates, trades and pack spending.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "StickerMate album tracker preview"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "StickerMate | FIFA World Cup 2026 Album Tracker",
    description: "Track collection progress, duplicates, trades and pack spending.",
    images: ["/opengraph-image"]
  },
  appleWebApp: {
    capable: true,
    title: "StickerMate",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sr" suppressHydrationWarning>
      <body>
        <ThemeHydrator />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
