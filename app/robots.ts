import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/help"],
        disallow: [
          "/auth/",
          "/settings",
          "/scan",
          "/trade-qr",
          "/friend-qr",
          "/review",
          "/sticker/",
          "/team/",
          "/friends/",
          "/collection",
          "/fill",
          "/trades",
          "/teams",
          "/duplicates",
          "/spending",
          "/more"
        ]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
