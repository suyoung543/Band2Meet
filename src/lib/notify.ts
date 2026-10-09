import { after } from "next/server";
import webpush from "web-push";
import { dateRange, hasEntered } from "@/lib/availability";
import { db } from "@/lib/db";
import { loadAvailability } from "@/lib/team";

// 알림 = 앱 안 알림함(notifications) 저장 + 푸시 구독한 기기로 발송.
// after()로 응답을 보낸 뒤 실행해서 버튼 반응이 느려지지 않게

export type Notice = { title: string; body?: string; url?: string; teamId?: string };

let vapidReady = false;
function setupVapid() {
  if (vapidReady) return true;
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = process.env;
  if (!pub || !priv || !subject) return false;
  webpush.setVapidDetails(subject, pub, priv);
  return (vapidReady = true);
}

export function notify(userIds: string[], n: Notice) {
  const ids = [...new Set(userIds)];
  if (ids.length) after(() => deliver(ids, n).catch((e) => console.error("[notify] fail", e)));
}

export async function deliver(userIds: string[], n: Notice) {
  await db.from("notifications").insert(
    userIds.map((user_id) => ({ user_id, team_id: n.teamId ?? null, title: n.title, body: n.body ?? null, url: n.url ?? null })),
  );
  if (!setupVapid()) return;
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").in("user_id", userIds);
  const payload = JSON.stringify({ title: n.title, body: n.body, url: n.url ?? "/" });
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      } catch (e) {
        // 404/410 = 기기에서 구독이 사라짐(앱 삭제, 권한 해제) → 정리
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        else console.error("push", code, s.endpoint.slice(0, 40));
      }
    }),
  );
}

// 팀의 활동 중인 멤버 id (알림은 행동한 본인도 받음 → 보낸 사람도 알림이 갔는지 확인 가능)
export async function teamMemberIds(teamId: string) {
  const { data } = await db.from("team_members").select("user_id").eq("team_id", teamId).eq("status", "active");
  return (data ?? []).map((m) => m.user_id);
}

// ── 수합 마무리 알림 (수합마다 한 번) ──────────────

// collect_done_notified를 false→true로 바꾼 쪽만 알림을 보냄 (동시에 두 번 보내지 않게)
async function markDone(teamId: string) {
  const { data } = await db.from("teams").update({ collect_done_notified: true }).eq("id", teamId).eq("collect_done_notified", false).select("id");
  return !!data?.length;
}

// 진행 중인 수합에서 모든 멤버가 입력을 마쳤는지 확인 (내 스케줄 저장 뒤 호출)
export async function checkCollectionFull(userId: string) {
  const { data: rows } = await db
    .from("team_members")
    .select("teams!inner(id, name, collect_start, collect_end, collect_done_notified)")
    .eq("user_id", userId)
    .eq("status", "active")
    .not("teams.collect_start", "is", null)
    .eq("teams.collect_done_notified", false);
  for (const r of rows ?? []) {
    const t = r.teams as unknown as { id: string; name: string; collect_start: string; collect_end: string };
    const members = await teamMemberIds(t.id);
    const dates = dateRange(t.collect_start, t.collect_end);
    const avail = await loadAvailability(t.id, members, t.collect_start, t.collect_end);
    if (avail.every((m) => hasEntered(m, dates)) && (await markDone(t.id))) {
      await deliver(members, {
        title: `[${t.name}] 모든 멤버가 시간을 입력했어요`,
        body: "후보 시간을 확인하고 합주를 확정하세요.",
        url: `/teams/${t.id}`,
        teamId: t.id,
      });
    }
  }
}

// 입력 마감이 지난 수합 (크론 + 앱 접속 때 확인). userId가 있으면 그 사람의 팀만
export async function checkDeadlines(userId?: string) {
  let teamIds: string[] | undefined;
  if (userId) {
    const { data } = await db.from("team_members").select("team_id").eq("user_id", userId).eq("status", "active");
    teamIds = (data ?? []).map((m) => m.team_id);
    if (!teamIds.length) return;
  }
  let q = db
    .from("teams")
    .select("id, name")
    .not("collect_start", "is", null)
    .eq("collect_done_notified", false)
    .lt("deadline", new Date().toISOString());
  if (teamIds) q = q.in("id", teamIds);
  const { data: teams } = await q;
  for (const t of teams ?? []) {
    if (!(await markDone(t.id))) continue;
    await deliver(await teamMemberIds(t.id), {
      title: `[${t.name}] 입력 마감이 지났어요`,
      body: "후보 시간을 확인하고 합주를 확정하세요.",
      url: `/teams/${t.id}`,
      teamId: t.id,
    });
  }
}
