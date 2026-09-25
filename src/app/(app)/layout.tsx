import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

// 로그인 후 화면 공통 헤더. 권한 체크는 각 페이지/액션에서도 따로 함 (레이아웃은 보안 경계가 아님)
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const userId = await requireUser();
  const { data: user } = await db.from("users").select("nickname").eq("id", userId).single();
  if (!user) redirect("/login"); // DB에서 지워진 유저

  return (
    <>
      <header className="flex items-center gap-4 border-b px-4 py-2 text-sm">
        <Link href="/" className="font-semibold">Band2Meet</Link>
        <Link href="/" className="text-zinc-500 hover:text-foreground">내 밴드</Link>
        <Link href="/schedule" className="text-zinc-500 hover:text-foreground">내 스케줄</Link>
        <span className="ml-auto">{user.nickname}</span>
        <form action="/api/auth/logout" method="post">
          <button className="text-zinc-500 hover:text-foreground">로그아웃</button>
        </form>
      </header>
      {children}
    </>
  );
}
