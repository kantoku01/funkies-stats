"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

// スマホの幅に5つ並ぶよう、ラベルは短くする
const TABS = [
  { href: "/", label: "ホーム", match: (p: string) => p === "/" },
  { href: "/stats", label: "成績", match: (p: string) => p.startsWith("/stats") },
  { href: "/games", label: "試合", match: (p: string) => p.startsWith("/games") },
  { href: "/players", label: "選手", match: (p: string) => p.startsWith("/players") },
  { href: "/expenses", label: "経費", match: (p: string) => p.startsWith("/expenses") },
];

// URL を読む部分は Suspense の中に置く(動的なページでも静的な外枠を先に出せるように)
export function NavTabs() {
  return (
    <Suspense fallback={<Tabs pathname={null} />}>
      <CurrentTabs />
    </Suspense>
  );
}

function CurrentTabs() {
  return <Tabs pathname={usePathname()} />;
}

function Tabs({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="メニュー" className="mx-auto flex max-w-3xl px-1">
      {TABS.map((t) => {
        const active = pathname !== null && t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center border-b-[3px] text-sm ${
              active ? "border-accent-500 font-bold text-white" : "border-transparent text-brand-100"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
