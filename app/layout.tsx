import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { ThemeHydrator } from "@/components/ThemeHydrator";

export const metadata: Metadata = {
  title: "StickerMate",
  description: "Track your FIFA World Cup 2026 sticker collection.",
  manifest: "/manifest.webmanifest",
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
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeHydrator />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
