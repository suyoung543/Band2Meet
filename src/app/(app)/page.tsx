import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

const button = "rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110";
const secondary = "rounded border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";

export default async function TeamsPage() {
  const userId = await requireUser();
  const { data: rows } = await db
    .from("team_members")
    .select("status, teams(id, name, leader_id)")
    .eq("user_id", userId)
    .order("joined_at");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">내 밴드</h1>

      {rows?.length ? (
        <ul className="flex flex-col divide-y rounded border dark:divide-zinc-800 dark:border-zinc-800">
          {rows.map(({ status, teams: t }) => {
            const team = t as unknown as { id: string; name: string; leader_id: string };
            return (
              <li key={team.id}>
                <Link href={`/teams/${team.id}`} className="flex items-center gap-2 px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <span className="font-medium">{team.name}</span>
                  {team.leader_id === userId && <span className="text-xs text-accent">리더</span>}
                  {status === "pending" && <span className="ml-auto text-xs text-orange-600">승인 대기 중</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">아직 소속된 밴드가 없어요. 새로 만들거나 초대코드로 참여하세요.</p>
      )}

      <div className="flex gap-2">
        <Link href="/teams/new" className={button}>팀 만들기</Link>
        <Link href="/teams/join" className={secondary}>초대코드로 참여</Link>
      </div>
    </main>
  );
}
