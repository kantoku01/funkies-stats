"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const TABS = [
  { href: "/", label: "成績一覧", match: (p: string) => p === "/" || p.startsWith("/players") },
  { href: "/games", label: "試合一覧", match: (p: string) => p.startsWith("/games") },
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
    <nav aria-label="メニュー" className="mx-auto flex max-w-3xl px-2">
      {TABS.map((t) => {
        const active = pathname !== null && t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center border-b-2 text-sm ${
              active ? "border-white font-bold text-white" : "border-transparent text-blue-200"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
