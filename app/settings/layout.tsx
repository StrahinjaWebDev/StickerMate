import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Settings",
  description: "Manage StickerMate theme, account, onboarding, local data and collection reset options.",
  path: "/settings",
  index: false
});

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
