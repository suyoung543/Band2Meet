import type { Metadata } from "next";
import Link from "next/link";
import ConfirmButton from "@/components/ConfirmButton";
import DialogButton from "@/components/DialogButton";
import { db } from "@/lib/db";
import { kstToday } from "@/lib/schedule";
import { adminDeleteTeam, adminSetLeader } from "./actions";
import { requireAdmin } from "./auth";

export const metadata: Metadata = { title: "Band2Meet 관리자", robots: { index: false } };

const DB_LIMIT = 500 * 1024 * 1024; // Supabase 무료 플랜 DB 용량
const DAYS = 30;

type Team = {
  id: string;
  name: string;
  leader_id: string;
  created_at: string;
  team_members: { user_id: string; status: string; users: { nickname: string } }[];
  confirmed_schedules: { count: number }[];
  songs: { count: number }[];
};

const card = "flex flex-col gap-1 rounded-lg border p-4";
const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)}MB`;
const shortDate = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

export default async function AdminPage() {
  await requireAdmin();
  const today = kstToday();
  const days = Array.from({ length: DAYS }, (_, i) => new Date(Date.parse(today) - (DAYS - 1 - i) * 86400_000).toISOString().slice(0, 10));

  const [{ data: users }, { data: teamRows }, { data: activity }, { data: dbBytes }] = await Promise.all([
    db.from("users").select("id, nickname, created_at, is_admin").gt("kakao_id", 0).order("created_at"),
    db
      .from("teams")
      .select("id, name, leader_id, created_at, team_members(user_id, status, users(nickname)), confirmed_schedules(count), songs(count)")
      .order("created_at"),
    // ponytail: 기록 전체를 가져옴. 이용자가 수백 명 넘으면 최근 N일 + 유저별 마지막 접속만 따로 조회
    db.from("daily_activity").select("day, user_id, views"),
    db.rpc("db_size_bytes"),
  ]);
  const teams = (teamRows ?? []) as unknown as Team[];

  const lastSeen = new Map<string, string>();
  const byDay = new Map<string, { users: number; views: number }>();
  for (const a of activity ?? []) {
    if ((lastSeen.get(a.user_id) ?? "") < a.day) lastSeen.set(a.user_id, a.day);
    const d = byDay.get(a.day) ?? { users: 0, views: 0 };
    byDay.set(a.day, { users: d.users + 1, views: d.views + a.views });
  }
  const series = days.map((d) => ({ day: d, ...(byDay.get(d) ?? { users: 0, views: 0 }) }));
  const maxUsers = Math.max(1, ...series.map((s) => s.users));
  const todayStat = byDay.get(today) ?? { users: 0, views: 0 };
  const weekUsers = new Set((activity ?? []).filter((a) => a.day > days[DAYS - 8]).map((a) => a.user_id)).size;
  const bytes = Number(dbBytes ?? 0);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4">
      <header className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold">Band2Meet 관리자</h1>
        <Link href="/" className="ml-auto text-sm text-zinc-500 hover:text-foreground">앱으로 →</Link>
      </header>

      {/* 핵심 숫자 */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={card}>
          <span className="text-xs text-zinc-500">이용자</span>
          <span className="text-2xl font-bold tabular-nums">{users?.length ?? 0}명</span>
        </div>
        <div className={card}>
          <span className="text-xs text-zinc-500">밴드</span>
          <span className="text-2xl font-bold tabular-nums">{teams.length}개</span>
        </div>
        <div className={card}>
          <span className="text-xs text-zinc-500">오늘 이용자</span>
          <span className="text-2xl font-bold tabular-nums">{todayStat.users}명</span>
          <span className="text-xs text-zinc-500">접속 {todayStat.views}회 · 최근 7일 {weekUsers}명</span>
        </div>
        <div className={card}>
          <span className="text-xs text-zinc-500">DB 용량</span>
          <span className="text-2xl font-bold tabular-nums">{mb(bytes)}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" title={`${((bytes / DB_LIMIT) * 100).toFixed(1)}% 사용`}>
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(1, (bytes / DB_LIMIT) * 100)}%` }} />
          </div>
          <span className="text-xs text-zinc-500">무료 한도 500MB 중 {((bytes / DB_LIMIT) * 100).toFixed(1)}%</span>
        </div>
      </section>

      {/* 일별 이용자 (막대 하나 = 하루) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="font-semibold">최근 {DAYS}일 이용자</h2>
          <span className="text-xs text-zinc-500">하루에 앱을 연 사람 수 · 막대에 마우스를 올리면 접속 횟수</span>
        </div>
        <div className="flex h-32 items-end gap-0.5 border-b pb-px">
          {series.map((s) => (
            <div key={s.day} className="group relative flex h-full flex-1 items-end" title={`${shortDate(s.day)} · ${s.users}명 · 접속 ${s.views}회`}>
              <div
                className="w-full rounded-t bg-accent group-hover:brightness-110"
                style={{ height: s.users ? `${(s.users / maxUsers) * 100}%` : 0 }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-zinc-500 tabular-nums">
          <span>{shortDate(days[0])}</span>
          <span>{shortDate(days[Math.floor(DAYS / 2)])}</span>
          <span>오늘</span>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-zinc-500">표로 보기</summary>
          <table className="mt-2 w-full max-w-sm text-left text-xs tabular-nums">
            <thead className="text-zinc-500">
              <tr><th className="py-1 font-normal">날짜</th><th className="font-normal">이용자</th><th className="font-normal">접속</th></tr>
            </thead>
            <tbody>
              {[...series].reverse().filter((s) => s.users).map((s) => (
                <tr key={s.day} className="border-t"><td className="py-1">{s.day}</td><td>{s.users}명</td><td>{s.views}회</td></tr>
              ))}
            </tbody>
          </table>
        </details>
        <p className="text-xs text-zinc-500">
          데이터 전송량·트래픽은 여기서 볼 수 없어요:{" "}
          <a href="https://supabase.com/dashboard/org/ueosgpoorfamethbxsia/usage" target="_blank" rel="noopener noreferrer" className="text-accent underline">Supabase 사용량</a>
          {" · "}
          <a href="https://vercel.com/suyoung5/band2meet/usage" target="_blank" rel="noopener noreferrer" className="text-accent underline">Vercel 사용량</a>
        </p>
      </section>

      {/* 밴드 목록 + 관리 */}
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">밴드 {teams.length}</h2>
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 font-normal">이름</th>
                <th className="px-3 py-2 font-normal">멤버</th>
                <th className="px-3 py-2 font-normal">확정 합주</th>
                <th className="px-3 py-2 font-normal">곡</th>
                <th className="px-3 py-2 font-normal">만든 날</th>
                <th className="px-3 py-2 font-normal">리더</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => {
                const active = t.team_members.filter((m) => m.status === "active");
                const pending = t.team_members.length - active.length;
                const leader = t.team_members.find((m) => m.user_id === t.leader_id)?.users.nickname ?? "알 수 없음";
                return (
                  <tr key={t.id} className="border-t align-middle">
                    <td className="px-3 py-2 font-medium">{t.name}</td>
                    <td className="px-3 py-2 tabular-nums" title={active.map((m) => m.users.nickname).join(", ")}>
                      {active.length}명{pending ? <span className="text-xs text-orange-600"> +대기 {pending}</span> : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{t.confirmed_schedules[0]?.count ?? 0}</td>
                    <td className="px-3 py-2 tabular-nums">{t.songs[0]?.count ?? 0}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-500">{t.created_at.slice(0, 10)}</td>
                    <td className="px-3 py-2">{leader}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      <DialogButton label="리더 변경" title={`${t.name} · 리더 변경`} className="text-zinc-600 hover:underline dark:text-zinc-300">
                        <form action={adminSetLeader.bind(null, t.id)} className="flex flex-col gap-3 text-sm">
                          <p className="text-xs text-zinc-500">현재 리더: {leader}. 활동 중인 멤버 중에서 고를 수 있어요.</p>
                          <select name="user_id" defaultValue={t.leader_id} className="rounded border bg-transparent px-3 py-2">
                            {active.map((m) => <option key={m.user_id} value={m.user_id}>{m.users.nickname}</option>)}
                          </select>
                          <ConfirmButton
                            className="rounded bg-accent px-4 py-2 font-medium text-accent-fg hover:brightness-110"
                            message={`"${t.name}"의 리더를 선택한 멤버로 바꿀까요?\n지금 리더는 팀 관리 권한이 사라져요.`}
                          >
                            변경
                          </ConfirmButton>
                        </form>
                      </DialogButton>
                      <span className="mx-2 text-zinc-300 dark:text-zinc-700">|</span>
                      <DialogButton label="삭제" title={`${t.name} · 팀 삭제`} className="text-rose-600 hover:underline">
                        <form action={adminDeleteTeam.bind(null, t.id)} className="flex flex-col gap-3 text-sm">
                          <p className="text-zinc-600 dark:text-zinc-300">
                            팀을 삭제하면 멤버 {active.length}명의 소속, 확정 합주 {t.confirmed_schedules[0]?.count ?? 0}개, 곡 {t.songs[0]?.count ?? 0}개,
                            셋리스트가 모두 지워지고 되돌릴 수 없어요. 멤버들의 개인 스케줄은 남아요.
                          </p>
                          <ConfirmButton
                            className="rounded bg-rose-600 px-4 py-2 font-medium text-white hover:brightness-110"
                            message={`정말 "${t.name}" 팀을 삭제할까요? 되돌릴 수 없어요.`}
                          >
                            삭제
                          </ConfirmButton>
                        </form>
                      </DialogButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 이용자 목록 */}
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">이용자 {users?.length ?? 0}</h2>
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 font-normal">닉네임</th>
                <th className="px-3 py-2 font-normal">가입일</th>
                <th className="px-3 py-2 font-normal">마지막 접속</th>
                <th className="px-3 py-2 font-normal">소속 밴드</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => {
                const myTeams = teams.filter((t) => t.team_members.some((m) => m.user_id === u.id && m.status === "active"));
                return (
                  <tr key={u.id} className="border-t">
                    <td className="whitespace-nowrap px-3 py-2">
                      {u.nickname}
                      {u.is_admin && <span className="block text-xs text-accent">관리자</span>}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-zinc-500">{u.created_at.slice(0, 10)}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-500">{lastSeen.get(u.id) ?? "기록 없음"}</td>
                    <td className="px-3 py-2 text-xs">
                      {myTeams.length ? myTeams.map((t) => `${t.name}${t.leader_id === u.id ? " (리더)" : ""}`).join(", ") : <span className="text-zinc-400">없음</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500">
          이용 기록(접속, 마지막 접속)은 2026-09-26부터 쌓이기 시작했어요.
        </p>
      </section>
    </main>
  );
}
