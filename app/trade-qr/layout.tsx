import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Trade QR",
  description: "Generate a local StickerMate QR profile for missing stickers and duplicate stickers.",
  path: "/trade-qr",
  index: false
});

export default function TradeQrLayout({ children }: { children: React.ReactNode }) {
  return children;
}
