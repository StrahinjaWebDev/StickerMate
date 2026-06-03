import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Spending",
  description: "Track pack and album spending for a FIFA World Cup 2026 sticker collection with fixed pack assumptions.",
  path: "/spending"
});

export default function SpendingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
