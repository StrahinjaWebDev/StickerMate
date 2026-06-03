import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Quick Fill",
  description: "Quickly add stickers, paste new codes, or review the FIFA World Cup 2026 album one sticker at a time.",
  path: "/fill"
});

export default function FillLayout({ children }: { children: React.ReactNode }) {
  return children;
}
