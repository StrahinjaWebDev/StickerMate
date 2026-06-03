import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

const routes = ["/", "/about", "/help"];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7
  }));
}
