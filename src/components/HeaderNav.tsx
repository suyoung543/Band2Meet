"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 상단 메뉴. 지금 있는 페이지는 강조색 + 밑줄
export default function HeaderNav() {
  const path = usePathname();
  const items = [
    { href: "/", label: "내 밴드", active: path === "/" || path.startsWith("/teams") },
    { href: "/schedule", label: "내 스케줄", active: path.startsWith("/schedule") },
  ];
  return (
    <nav className="flex gap-3 sm:gap-4">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? "page" : undefined}
          className={`border-b-2 py-1 text-[15px] ${
            i.active ? "border-accent font-semibold text-accent" : "border-transparent text-zinc-500 hover:text-foreground"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
