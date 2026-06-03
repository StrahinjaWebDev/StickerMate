import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/collection", "/fill", "/trades", "/teams", "/duplicates", "/spending", "/more", "/about", "/help"],
        disallow: ["/auth/", "/settings", "/scan", "/trade-qr", "/friend-qr", "/sticker/", "/team/"]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
