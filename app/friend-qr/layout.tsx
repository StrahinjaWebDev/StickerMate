import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Friend QR",
  description: "Import a friend's StickerMate trade QR and compare missing stickers and duplicates locally.",
  path: "/friend-qr",
  index: false
});

export default function FriendQrLayout({ children }: { children: React.ReactNode }) {
  return children;
}
