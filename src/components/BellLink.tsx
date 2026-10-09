"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// 상단 🔔. 알림 화면에 있으면 다른 메뉴처럼 강조색
export default function BellLink({ unread }: { unread: number }) {
  const active = usePathname().startsWith("/notifications");
  // 상단 메뉴는 화면을 옮겨도 다시 그려지지 않아서 서버 숫자가 남아 있음.
  // 알림 화면에 한 번 들어가면(=모두 읽음 처리됨) 숫자를 지우고, 서버에서 새 숫자가 오면 다시 표시
  const [seen, setSeen] = useState(false);
  const [prev, setPrev] = useState(unread);
  if (unread !== prev) {
    setPrev(unread);
    setSeen(false);
  }
  if (active && !seen) setSeen(true);
  const count = active || seen ? 0 : unread;
  return (
    <Link
      href="/notifications"
      aria-label={`알림${count ? ` ${count}개` : ""}`}
      aria-current={active ? "page" : undefined}
      className={`relative ml-auto ${active ? "text-accent" : "text-zinc-500 hover:text-foreground"}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {!!count && (
        <span className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
