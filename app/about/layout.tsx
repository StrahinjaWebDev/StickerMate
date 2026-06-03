import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "About",
  description: "Read the StickerMate disclaimer and learn about the unofficial fan-made FIFA World Cup 2026 album tracker.",
  path: "/about"
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
