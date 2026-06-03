import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Quick Album Fill",
  description: "Review the 980 standard album stickers with fast Missing, Owned and Duplicate actions.",
  path: "/review",
  index: false
});

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
