import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Duplicates",
  description: "See extra sticker copies available for trading in your FIFA World Cup 2026 album collection.",
  path: "/duplicates"
});

export default function DuplicatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
