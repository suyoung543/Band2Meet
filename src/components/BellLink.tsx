"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 상단 🔔. 알림 화면에 있으면 다른 메뉴처럼 강조색
export default function BellLink({ unread }: { unread: number }) {
  const active = usePathname().startsWith("/notifications");
  return (
    <Link
      href="/notifications"
      aria-label={`알림${unread ? ` ${unread}개` : ""}`}
      aria-current={active ? "page" : undefined}
      className={`relative ml-auto ${active ? "text-accent" : "text-zinc-500 hover:text-foreground"}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {!!unread && (
        <span className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
