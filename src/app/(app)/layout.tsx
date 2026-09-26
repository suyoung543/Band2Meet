import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import HeaderNav from "@/components/HeaderNav";
import { db } from "@/lib/db";
import { kstToday } from "@/lib/schedule";
import { requireUser } from "@/lib/session";

// 로그인 후 화면 공통 헤더. 권한 체크는 각 페이지/액션에서도 따로 함 (레이아웃은 보안 경계가 아님)
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const userId = await requireUser();
  const { data: user } = await db.from("users").select("nickname, is_admin").eq("id", userId).single();
  if (!user) redirect("/login"); // DB에서 지워진 유저
  // 관리자 대시보드용 일별 이용 기록. 응답을 보낸 뒤 실행돼서 화면을 느리게 하지 않음
  after(() => db.rpc("track_activity", { p_user: userId, p_day: kstToday() }));

  return (
    <>
      <header className="flex items-center gap-3 whitespace-nowrap border-b px-4 py-3 sm:gap-5">
        <Link href="/" className="text-lg font-bold">Band2Meet</Link>
        <HeaderNav />
        {/* PC: 닉네임 + (관리자) + 로그아웃 */}
        <span className="ml-auto hidden text-sm sm:inline">{user.nickname}</span>
        {user.is_admin && (
          <Link href="/admin" className="hidden text-sm text-zinc-500 hover:text-foreground sm:inline">관리자</Link>
        )}
        <form action="/api/auth/logout" method="post" className="hidden sm:block">
          <button className="text-sm text-zinc-500 hover:text-foreground">로그아웃</button>
        </form>
        {/* 모바일: 닉네임을 누르면 로그아웃 메뉴 */}
        <details className="relative ml-auto sm:hidden">
          <summary className="cursor-pointer list-none text-sm">{user.nickname} ▾</summary>
          <div className="absolute right-0 z-20 mt-2 flex flex-col rounded border bg-background shadow-lg">
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
