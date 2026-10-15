"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// 상단 🔔. 알림 화면에 있으면 다른 메뉴처럼 강조색, 한 번 더 누르면 들어오기 전 화면으로 (토글)
export default function BellLink({ unread }: { unread: number }) {
  const path = usePathname();
  const active = path.startsWith("/notifications");
  const router = useRouter();
  // 알림 화면이 아닌 마지막 화면을 기억 → 알림 화면에서 🔔 다시 누르면 그리로
  useEffect(() => {
    if (active) return;
    try {
      sessionStorage.setItem("beforeNotifications", path);
    } catch {}
  }, [path, active]);
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
      onClick={(e) => {
        if (!active) return;
        e.preventDefault();
        let back: string | null = null;
        try {
          back = sessionStorage.getItem("beforeNotifications");
        } catch {}
        router.push(back ?? "/"); // 알림 화면으로 바로 열었으면 첫 화면
      }}
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
