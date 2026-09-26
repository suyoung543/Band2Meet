import { loadTeam } from "@/lib/team";
import Tabs from "@/components/Tabs";

export default async function TeamLayout({ children, params }: LayoutProps<"/teams/[id]">) {
  const { id } = await params;
  const { team, me } = await loadTeam(id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">{team.name}</h1>
      {me.status === "pending" ? (
        <p className="text-sm text-zinc-500">리더가 참여 요청을 승인하면 팀 화면을 볼 수 있어요.</p>
      ) : (
        <>
          <Tabs
            tabs={[
              { href: `/teams/${id}`, label: "대시보드", also: [`/teams/${id}/dates`] },
              { href: `/teams/${id}/schedules`, label: "확정 일정", also: [`/teams/${id}/schedules/`] },
              { href: `/teams/${id}/songs`, label: "곡", also: [`/teams/${id}/songs`] },
              { href: `/teams/${id}/members`, label: "멤버" },
              { href: `/teams/${id}/settings`, label: "수합 설정" },
            ]}
          />
          {children}
        </>
      )}
    </main>
  );
}
