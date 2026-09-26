"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireLeader, requireMember } from "@/lib/auth";
import { requireUser } from "@/lib/session";

const SLOTS = /^[ynm]{48}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// week[day] = 48글자 문자열, day 0 = 월
export async function saveBase(week: string[]) {
  const user_id = await requireUser();
  if (week.length !== 7 || !week.every((r) => SLOTS.test(r))) throw new Error("잘못된 입력");
  const { error } = await db.from("base_patterns").upsert(week.map((slots, day) => ({ user_id, day, slots })));
  if (error) throw new Error(error.message);
}

export async function saveException(date: string, slots: string) {
  const user_id = await requireUser();
  if (!DATE.test(date) || !SLOTS.test(slots)) throw new Error("잘못된 입력");
  const { error } = await db.from("exceptions").upsert({ user_id, date, slots });
  if (error) throw new Error(error.message);
}

export async function deleteException(date: string) {
  const user_id = await requireUser();
  const { error } = await db.from("exceptions").delete().eq("user_id", user_id).eq("date", date);
  if (error) throw new Error(error.message);
}

// ── 팀 ──────────────────────────────────────────

export async function createTeam(formData: FormData) {
  const user_id = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/teams/new?error=name");
  const { data: team, error } = await db.from("teams").insert({ name, leader_id: user_id }).select("id").single();
  if (error) throw new Error(error.message);
  await db.from("team_members").insert({ team_id: team.id, user_id, status: "active" });
  redirect(`/teams/${team.id}`);
}

export async function joinTeam(formData: FormData) {
  const user_id = await requireUser();
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  const { data: team } = await db.from("teams").select("id").eq("invite_code", code).maybeSingle();
  if (!team) redirect("/teams/join?error=code");
  // 이미 멤버/대기 중이면 그대로 둠
  await db.from("team_members").upsert({ team_id: team.id, user_id }, { onConflict: "team_id,user_id", ignoreDuplicates: true });
  redirect(`/teams/${team.id}`);
}

export async function approveMember(teamId: string, userId: string) {
  await requireLeader(teamId);
  await db.from("team_members").update({ status: "active" }).eq("team_id", teamId).eq("user_id", userId);
  revalidatePath(`/teams/${teamId}`, "layout");
}

export async function removeMember(teamId: string, userId: string) {
  const { user_id: leader } = await requireLeader(teamId);
  if (userId === leader) throw new Error("리더는 내보낼 수 없어요");
  await db.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
  revalidatePath(`/teams/${teamId}`, "layout");
}

// ── 수합 설정 / 확정 ─────────────────────────────

const MAX_RANGE_DAYS = 92;

export async function saveTeamSettings(teamId: string, formData: FormData) {
  await requireMember(teamId);
  const start = String(formData.get("collect_start") ?? "");
  const end = String(formData.get("collect_end") ?? "");
  const deadline = String(formData.get("deadline") ?? ""); // datetime-local, 한국 시간 기준
  const minSlots = Number(formData.get("min_block_slots"));
  const days = (Date.parse(end) - Date.parse(start)) / 86400000;
  if (!DATE.test(start) || !DATE.test(end) || !(days >= 0 && days < MAX_RANGE_DAYS)) redirect(`/teams/${teamId}/settings?error=range`);
  if (!(Number.isInteger(minSlots) && minSlots >= 1 && minSlots <= 16)) redirect(`/teams/${teamId}/settings?error=min`);
  const { error } = await db
    .from("teams")
    .update({
      collect_start: start,
      collect_end: end,
      deadline: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(deadline) ? `${deadline}:00+09:00` : null,
      min_block_slots: minSlots,
    })
    .eq("id", teamId);
  if (error) throw new Error(error.message);
  redirect(`/teams/${teamId}`);
}

// 진행 중인 수합 끝내기: 기간·마감만 비움. 개인 시간표와 확정 합주는 그대로
export async function resetCollection(teamId: string) {
  await requireMember(teamId);
  await db.from("teams").update({ collect_start: null, collect_end: null, deadline: null }).eq("id", teamId);
  revalidatePath(`/teams/${teamId}`, "layout");
  redirect(`/teams/${teamId}`);
}

export async function confirmSchedule(teamId: string, date: string, formData: FormData) {
  const { user_id } = await requireMember(teamId);
  const start = Number(formData.get("start")), end = Number(formData.get("end"));
  if (!DATE.test(date) || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 48 || end <= start) {
    throw new Error("잘못된 시간");
  }
  const { error } = await db.from("confirmed_schedules").insert({ team_id: teamId, date, start_slot: start, end_slot: end, created_by: user_id });
  if (error) throw new Error(error.message);
  revalidatePath(`/teams/${teamId}`, "layout");
}

export async function cancelSchedule(teamId: string, scheduleId: string) {
  await requireMember(teamId);
  await db.from("confirmed_schedules").delete().eq("id", scheduleId).eq("team_id", teamId);
  revalidatePath(`/teams/${teamId}`, "layout");
}

export async function cancelScheduleAndBack(teamId: string, scheduleId: string) {
  await cancelSchedule(teamId, scheduleId);
  redirect(`/teams/${teamId}/schedules`);
}

export async function updateSchedule(teamId: string, scheduleId: string, formData: FormData) {
  await requireMember(teamId);
  const date = String(formData.get("date") ?? "");
  const start = Number(formData.get("start")), end = Number(formData.get("end"));
  const text = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max) || null;
  if (!DATE.test(date) || isNaN(Date.parse(date)) || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 48 || end <= start) {
    redirect(`/teams/${teamId}/schedules/${scheduleId}?error=time`);
  }
  const { error } = await db
    .from("confirmed_schedules")
    .update({ date, start_slot: start, end_slot: end, place: text("place", 100), memo: text("memo", 1000), todo: text("todo", 1000) })
    .eq("id", scheduleId)
    .eq("team_id", teamId);
  if (error) throw new Error(error.message);
  revalidatePath(`/teams/${teamId}`, "layout");
  redirect(`/teams/${teamId}/schedules/${scheduleId}?saved=1`);
}

// ── 팀 관리 (리더) ───────────────────────────────

export async function renameTeam(teamId: string, formData: FormData) {
  await requireLeader(teamId);
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  if (!name) return;
  await db.from("teams").update({ name }).eq("id", teamId);
  revalidatePath(`/teams/${teamId}`, "layout");
  revalidatePath("/");
}

export async function transferLeader(teamId: string, formData: FormData) {
  const { user_id } = await requireLeader(teamId);
  const to = String(formData.get("user_id") ?? "");
  // 활동 중인 멤버에게만 넘길 수 있음
  const { data } = await db.from("team_members").select("status").eq("team_id", teamId).eq("user_id", to).maybeSingle();
  if (to === user_id || data?.status !== "active") throw new Error("넘길 수 없는 멤버");
  await db.from("teams").update({ leader_id: to }).eq("id", teamId);
  revalidatePath(`/teams/${teamId}`, "layout");
  revalidatePath("/");
}

// 팀과 딸린 데이터(멤버, 확정 일정, 곡, 셋리스트) 전부 삭제. 멤버 개인 스케줄은 남음
export async function deleteTeam(teamId: string) {
  await requireLeader(teamId);
  await db.from("teams").delete().eq("id", teamId);
  revalidatePath("/");
  redirect("/");
}
