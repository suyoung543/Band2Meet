import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

// 서버 액션 권한 체크. 일정·곡은 멤버 누구나, 팀·멤버 관리는 리더만

export async function requireMember(teamId: string) {
  const user_id = await requireUser();
  const [{ data: m }, { data: t }] = await Promise.all([
    db.from("team_members").select("status").eq("team_id", teamId).eq("user_id", user_id).maybeSingle(),
    db.from("teams").select("leader_id").eq("id", teamId).maybeSingle(),
  ]);
  if (m?.status !== "active" || !t) throw new Error("팀 멤버만 할 수 있어요");
  return { user_id, isLeader: t.leader_id === user_id };
}

export async function requireLeader(teamId: string) {
  const me = await requireMember(teamId);
  if (!me.isLeader) throw new Error("리더만 할 수 있어요");
  return me;
}
