import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "More",
  description: "Access StickerMate account, costs, help, trade QR tools, settings and project information.",
  path: "/more",
  index: false
});

export default function MoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
