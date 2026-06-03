import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { ThemeHydrator } from "@/components/ThemeHydrator";
import { Analytics } from "@vercel/analytics/next";
import { defaultSeo, getSiteUrl } from "@/lib/seo";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultSeo.title,
    template: "%s | StickerMate"
  },
  description: defaultSeo.description,
  applicationName: "StickerMate",
  keywords: [
    "StickerMate",
    "FIFA World Cup 2026",
    "Panini sticker album",
    "sticker album tracker",
    "missing stickers",
    "duplicate stickers",
    "album collection tracker",
    "Svetsko prvenstvo 2026 slicice"
  ],
  authors: [{ name: "StickerMate" }],
  creator: "StickerMate",
  publisher: "StickerMate",
  category: "sports",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
    languages: {
      sr: "/",
      en: "/"
    }
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }]
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "StickerMate",
    locale: "sr_RS",
    alternateLocale: ["en_US"],
    title: defaultSeo.title,
    description: defaultSeo.description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "StickerMate FIFA World Cup 2026 sticker album tracker"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: defaultSeo.title,
    description: defaultSeo.description,
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
        <Analytics />
      </body>
    </html>
  );
}
