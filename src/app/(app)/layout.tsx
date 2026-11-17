import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import BellLink from "@/components/BellLink";
import HeaderNav from "@/components/HeaderNav";
import { db } from "@/lib/db";
import { checkDeadlines } from "@/lib/notify";
import { kstToday } from "@/lib/schedule";
import { requireUser } from "@/lib/session";
import type { Viewport } from "next";

// 상태바 색을 헤더 배경과 같게 → 상태바~헤더가 한 덩어리로 보여서 로고 위 여백이 빈 틈처럼 안 보임 (값은 globals.css --header)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

// 로그인 후 화면 공통 헤더. 권한 체크는 각 페이지/액션에서도 따로 함 (레이아웃은 보안 경계가 아님)
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const userId = await requireUser();
  const [{ data: user }, { count: unread }] = await Promise.all([
    db.from("users").select("nickname, is_admin").eq("id", userId).single(),
    db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);
  if (!user) redirect("/login"); // DB에서 지워진 유저
  // 관리자 대시보드용 일별 이용 기록. 응답을 보낸 뒤 실행돼서 화면을 느리게 하지 않음
  after(() => db.rpc("track_activity", { p_user: userId, p_day: kstToday() }));
  after(() => checkDeadlines(userId)); // 입력 마감이 지난 수합이 있으면 "수합 마감" 알림

  return (
    <>
      {/* 홈 화면 앱(iOS 26)은 상태바 아래쪽까지 시스템 블러가 덮음 → 앱 모드에서만 헤더를 블러 밖으로 내림.
          ponytail: 블러 높이는 iOS가 정함, 여전히 가려지면 pt 값만 조정 */}
      <header className="flex items-center gap-3 whitespace-nowrap border-b bg-header px-4 py-3 sm:gap-5 [@media(display-mode:standalone)]:pt-6">
        <Link href="/" className="text-xl font-bold">Band2Meet</Link>
        <HeaderNav />
        <BellLink unread={unread ?? 0} />
        {/* PC: 닉네임 + (관리자) + 로그아웃 */}
        <span className="hidden text-sm sm:inline">{user.nickname}</span>
        {user.is_admin && (
          <Link href="/admin" className="hidden text-sm text-zinc-500 hover:text-foreground sm:inline">관리자</Link>
        )}
        <form action="/api/auth/logout" method="post" className="hidden sm:block">
          <button className="text-sm text-zinc-500 hover:text-foreground">로그아웃</button>
        </form>
        {/* 모바일: 닉네임을 누르면 로그아웃 메뉴 */}
        <details className="relative sm:hidden">
          <summary className="cursor-pointer list-none text-sm">{user.nickname} ▾</summary>
          <div className="absolute right-0 z-20 mt-2 flex flex-col rounded border bg-header shadow-lg">
            {user.is_admin && (
              <Link href="/admin" className="border-b px-4 py-2 text-sm">관리자</Link>
            )}
            <form action="/api/auth/logout" method="post">
              <button className="w-full px-4 py-2 text-left text-sm">로그아웃</button>
            </form>
          </div>
        </details>
      </header>
      {children}
    </>
  );
}
