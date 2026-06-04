import type { Metadata } from "next";

const appTitle = "StickerMate | FIFA World Cup 2026 Sticker Album Tracker";
const appDescription =
  "Track your FIFA World Cup 2026 Panini sticker album, missing stickers, duplicates, trades and collection progress.";

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

/** Client-side origin for share links and QR codes. */
export function getClientPublicOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, "");

  if (typeof window === "undefined") {
    return configured || getSiteUrl();
  }

  if (configured) {
    const host = window.location.hostname;
    if (host === "stickermate.app" || host === "www.stickermate.app") {
      return configured;
    }
  }

  return window.location.origin;
}

export function pageMetadata({
  title,
  description,
  path,
  index = true
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path
    },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: `${title} | StickerMate`,
      description,
      url: path,
      siteName: "StickerMate",
      type: "website",
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
      title: `${title} | StickerMate`,
      description,
      images: ["/opengraph-image"]
    }
  };
}

export const defaultSeo = {
  title: appTitle,
  description: appDescription
};
