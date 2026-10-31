import type { Metadata, Viewport } from "next";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ファンキーズ打撃成績",
    template: "%s | ファンキーズ打撃成績",
  },
  description: "ファンキーズの試合ごとの打席結果とシーズン打撃成績",
  appleWebApp: { title: "ファンキーズ成績", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b63c4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <PullToRefresh />
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
