import Link from "next/link";
import { redirect } from "next/navigation";
import HeaderNav from "@/components/HeaderNav";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

// 로그인 후 화면 공통 헤더. 권한 체크는 각 페이지/액션에서도 따로 함 (레이아웃은 보안 경계가 아님)
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const userId = await requireUser();
  const { data: user } = await db.from("users").select("nickname").eq("id", userId).single();
  if (!user) redirect("/login"); // DB에서 지워진 유저

  return (
    <>
      <header className="flex items-center gap-3 whitespace-nowrap border-b px-4 py-3 sm:gap-5">
        <Link href="/" className="text-lg font-bold">Band2Meet</Link>
        <HeaderNav />
        {/* PC: 닉네임 + 로그아웃 */}
        <span className="ml-auto hidden text-sm sm:inline">{user.nickname}</span>
        <form action="/api/auth/logout" method="post" className="hidden sm:block">
          <button className="text-sm text-zinc-500 hover:text-foreground">로그아웃</button>
        </form>
        {/* 모바일: 닉네임을 누르면 로그아웃 메뉴 */}
        <details className="relative ml-auto sm:hidden">
          <summary className="cursor-pointer list-none text-sm">{user.nickname} ▾</summary>
          <form action="/api/auth/logout" method="post" className="absolute right-0 z-20 mt-2 rounded border bg-background shadow-lg">
            <button className="px-4 py-2 text-sm">로그아웃</button>
          </form>
        </details>
      </header>
      {children}
    </>
  );
}
