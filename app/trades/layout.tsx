import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Trades",
  description: "Prepare missing sticker and duplicate sticker lists for FIFA World Cup 2026 album trades.",
  path: "/trades",
  index: false
});

export default function TradesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
