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
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-2xl font-semibold">Band2Meet</h1>
      <p className="text-sm text-zinc-500">밴드 합주 일정 수합</p>
      {typeof error === "string" && <p className="text-sm text-rose-600">{ERRORS[error] ?? "로그인에 실패했어요."}</p>}
      {/* 라우트 핸들러로 가는 전체 페이지 이동이라 Link 대신 a */}
      <a
        href="/api/auth/kakao"
        className="rounded-lg bg-[#FEE500] px-6 py-3 font-medium text-black/85"
      >
        카카오로 시작하기
      </a>
    </main>
  );
}
