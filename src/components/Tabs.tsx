"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 밑줄 탭. href가 현재 주소와 같거나 also 중 하나로 시작하면 선택됨
export type Tab = { href: string; label: string; also?: string[] };

export default function Tabs({ tabs, small }: { tabs: Tab[]; small?: boolean }) {
  const path = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto border-b">
      {tabs.map((t) => {
        const active = path === t.href || t.also?.some((p) => path.startsWith(p));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px shrink-0 border-b-2 px-3 ${small ? "py-1.5 text-xs" : "py-2 text-sm"} ${
              active ? "border-accent font-medium" : "border-transparent text-zinc-500 hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
