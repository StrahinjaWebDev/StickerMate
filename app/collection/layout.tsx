import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Collection",
  description: "Search and filter all 980 standard FIFA World Cup 2026 album stickers by status, section, team and code.",
  path: "/collection",
  index: false
});

export default function CollectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
