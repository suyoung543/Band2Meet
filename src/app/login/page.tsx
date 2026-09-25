import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session";

const ERRORS: Record<string, string> = {
  state: "로그인 요청이 만료됐어요. 다시 시도해 주세요.",
  token: "카카오 인증에 실패했어요.",
  profile: "카카오 프로필을 가져오지 못했어요.",
  db: "서버 오류로 로그인하지 못했어요.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getUserId()) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-bold">Band2Meet</h1>
        <p className="text-zinc-500">밴드 합주 일정 수합</p>
      </div>
      <ul className="flex flex-col gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
        {["한 번 입력한 시간표로 모든 밴드 일정 조율", "전원 가능한 시간, 한 명 빠지는 시간까지 한눈에", "곡 투표 · 연습곡 · 셋리스트도 한곳에서"].map((t) => (
          <li key={t} className="flex gap-2">
            <span className="font-bold text-accent">✓</span>
            {t}
          </li>
        ))}
      </ul>
      {typeof error === "string" && <p className="text-sm text-rose-600">{ERRORS[error] ?? "로그인에 실패했어요."}</p>}
      {/* 라우트 핸들러로 가는 전체 페이지 이동이라 Link 대신 a */}
      <a
        href="/api/auth/kakao"
        className="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3.5 font-semibold text-black/85 hover:brightness-95"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1 3.7c-.1.3.3.6.6.4l4.4-2.9c.4 0 .9.1 1.3.1 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
        </svg>
        카카오로 시작하기
      </a>
    </main>
  );
}
