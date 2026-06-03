import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Friend comparison",
  description: "Compare sticker trades with a saved friend profile.",
  path: "/friends",
  index: false
});

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
