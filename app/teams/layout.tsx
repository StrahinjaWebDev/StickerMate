import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Teams",
  description: "Browse FIFA World Cup 2026 sticker album progress by team, country and album section.",
  path: "/teams"
});

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
