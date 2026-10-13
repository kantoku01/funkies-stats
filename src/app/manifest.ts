import type { MetadataRoute } from "next";

// ホーム画面に追加したときのアプリ名とアイコン
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ファンキーズ打撃成績",
    short_name: "ファンキーズ",
    description: "ファンキーズの試合ごとの打席結果とシーズン打撃成績",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1e3a8a",
    lang: "ja",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
