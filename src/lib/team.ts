import { cache } from "react";
import { notFound } from "next/navigation";
import { Member } from "@/lib/availability";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type TeamMemberRow = { user_id: string; status: "active" | "pending"; users: { nickname: string } };

// 레이아웃과 페이지가 같은 요청 안에서 같이 불러도 쿼리는 한 번 (React cache)
// 멤버가 아니면 404 → 팀 존재 여부도 숨김
export const loadTeam = cache(async (teamId: string) => {
  const userId = await requireUser();
  const [{ data: team }, { data: rows }] = await Promise.all([
    db
      .from("teams")
      .select("id, name, leader_id, invite_code, collect_start, collect_end, deadline, min_block_slots")
      .eq("id", teamId)
      .maybeSingle(),
    db.from("team_members").select("user_id, status, users(nickname)").eq("team_id", teamId).order("joined_at"),
  ]);
  const members = (rows ?? []) as unknown as TeamMemberRow[];
  const me = members.find((m) => m.user_id === userId);
  if (!team || !me) notFound();
  return {
    team,
    members,
    active: members.filter((m) => m.status === "active"),
    me,
    userId,
    isLeader: team.leader_id === userId,
  };
});

// 교집합 계산 입력 만들기. 다른 팀에서 확정된 합주는 busy로 넣어서 불가 처리
export async function loadAvailability(teamId: string, userIds: string[], from: string, to: string) {
  const [{ data: base }, { data: ex }, { data: other }] = await Promise.all([
    db.from("base_patterns").select("user_id, day, slots").in("user_id", userIds),
    db.from("exceptions").select("user_id, date, slots").in("user_id", userIds).gte("date", from).lte("date", to),
    db.from("team_members").select("user_id, team_id").in("user_id", userIds).eq("status", "active").neq("team_id", teamId),
  ]);
  const otherTeams = [...new Set((other ?? []).map((r) => r.team_id))];
  const { data: confirmed } = otherTeams.length
    ? await db
        .from("confirmed_schedules")
        .select("team_id, date, start_slot, end_slot")
        .in("team_id", otherTeams)
        .gte("date", from)
        .lte("date", to)
    : { data: [] };

  const byId = new Map<string, Member & { filled: boolean }>(
    userIds.map((id) => [id, { id, base: [], exceptions: {}, busy: {}, filled: false }]),
  );
  for (const r of base ?? []) {
    const m = byId.get(r.user_id)!;
    m.base[r.day] = r.slots;
    m.filled = true;
  }
  for (const r of ex ?? []) {
    const m = byId.get(r.user_id)!;
    m.exceptions[r.date] = r.slots;
    m.filled = true;
  }
  for (const o of other ?? []) {
    for (const c of confirmed ?? []) {
      if (c.team_id !== o.team_id) continue;
      ((byId.get(o.user_id)!.busy![c.date] ??= [])).push([c.start_slot, c.end_slot]);
    }
  }
  return userIds.map((id) => byId.get(id)!);
}

// 확정 합주 id → 그 합주까지 연습해올 곡 제목들 (연습 중인 곡만)
export async function loadPracticeSongs(scheduleIds: string[]) {
  const out = new Map<string, string[]>();
  if (!scheduleIds.length) return out;
  const { data } = await db
    .from("practice_assignments")
    .select("schedule_id, songs!inner(title, status)")
    .in("schedule_id", scheduleIds)
    .eq("songs.status", "practicing");
  for (const r of data ?? []) {
    const title = (r.songs as unknown as { title: string }).title;
    out.set(r.schedule_id!, [...(out.get(r.schedule_id!) ?? []), title]);
  }
  return out;
}
