import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Help",
  description: "Learn how to use StickerMate for quick fill, collection filters, duplicates, trades, spending and backups.",
  path: "/help"
});

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
