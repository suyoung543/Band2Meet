"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

// 곡 / 연습곡 / 셋리스트. 추가·투표·연습 코멘트는 멤버 누구나, 상태 변경과 셋리스트 편집은 리더만

const refresh = (teamId: string) => revalidatePath(`/teams/${teamId}`, "layout");

async function requireMember(teamId: string) {
  const user_id = await requireUser();
  const [{ data: m }, { data: t }] = await Promise.all([
    db.from("team_members").select("status").eq("team_id", teamId).eq("user_id", user_id).maybeSingle(),
    db.from("teams").select("leader_id").eq("id", teamId).maybeSingle(),
  ]);
  if (m?.status !== "active" || !t) throw new Error("팀 멤버만 할 수 있어요");
  return { user_id, isLeader: t.leader_id === user_id };
}

async function requireLeader(teamId: string) {
  const me = await requireMember(teamId);
  if (!me.isLeader) throw new Error("리더만 할 수 있어요");
  return me;
}

// 곡/셋리스트/연습 배정 id → 팀 id (권한 체크용)
async function teamOf(table: "songs" | "setlists", id: string) {
  const { data } = await db.from(table).select("team_id").eq("id", id).maybeSingle();
  if (!data) throw new Error("없는 항목");
  return data.team_id as string;
}
async function teamOfAssignment(id: string) {
  const { data } = await db.from("practice_assignments").select("songs(team_id)").eq("id", id).maybeSingle();
  const teamId = (data?.songs as unknown as { team_id: string } | null)?.team_id;
  if (!teamId) throw new Error("없는 항목");
  return teamId;
}

// "3:45" → 225, "4" → 240 (분)
function parseDuration(v: string) {
  const m = v.trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  const sec = Number(m[1]) * 60 + Number(m[2] ?? 0);
  return sec > 0 ? sec : null;
}

// ── 후보함 ──────────────────────────────────────

export async function addSong(teamId: string, formData: FormData) {
  const { user_id } = await requireMember(teamId);
  const title = String(formData.get("title") ?? "").trim();
  const artist = String(formData.get("artist") ?? "").trim();
  const url = String(formData.get("ref_url") ?? "").trim();
  if (!title) redirect(`/teams/${teamId}/songs?error=title`);
  // javascript: 같은 링크 막기
  if (url && !/^https?:\/\//i.test(url)) redirect(`/teams/${teamId}/songs?error=url`);
  const { error } = await db.from("songs").insert({
    team_id: teamId,
    title,
    artist: artist || null,
    ref_url: url || null,
    duration_sec: parseDuration(String(formData.get("duration") ?? "")),
    created_by: user_id,
  });
  if (error) throw new Error(error.message);
  redirect(`/teams/${teamId}/songs`);
}

export async function deleteSong(songId: string) {
  const teamId = await teamOf("songs", songId);
  const { user_id, isLeader } = await requireMember(teamId);
  const q = db.from("songs").delete().eq("id", songId);
  await (isLeader ? q : q.eq("created_by", user_id)); // 올린 사람 또는 리더만
  refresh(teamId);
}

export async function toggleVote(songId: string) {
  const teamId = await teamOf("songs", songId);
  const { user_id } = await requireMember(teamId);
  const { data } = await db.from("votes").delete().eq("song_id", songId).eq("user_id", user_id).select();
  if (!data?.length) await db.from("votes").insert({ song_id: songId, user_id });
  refresh(teamId);
}

// candidate → practicing, hold는 보류. 연습곡이 되면 연습 배정(멤버 코멘트용)을 하나 만듦
export async function setSongStatus(songId: string, status: "candidate" | "practicing" | "hold") {
  const teamId = await teamOf("songs", songId);
  await requireLeader(teamId);
  await db.from("songs").update({ status }).eq("id", songId);
  if (status === "practicing") {
    const { data } = await db.from("practice_assignments").select("id").eq("song_id", songId).limit(1);
    if (!data?.length) await db.from("practice_assignments").insert({ song_id: songId });
  }
  refresh(teamId);
}

// ── 연습 중 ─────────────────────────────────────

export async function saveNote(assignmentId: string, formData: FormData) {
  const teamId = await teamOfAssignment(assignmentId);
  const { user_id } = await requireMember(teamId);
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 500);
  if (comment) {
    await db.from("practice_notes").upsert({ assignment_id: assignmentId, user_id, comment, updated_at: new Date().toISOString() });
  } else {
    await db.from("practice_notes").delete().eq("assignment_id", assignmentId).eq("user_id", user_id);
  }
  refresh(teamId);
}

// ── 셋리스트 ────────────────────────────────────

export async function createSetlist(teamId: string, formData: FormData) {
  await requireLeader(teamId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.from("setlists").insert({ team_id: teamId, name: name.slice(0, 60) });
  refresh(teamId);
}

export async function deleteSetlist(setlistId: string) {
  const teamId = await teamOf("setlists", setlistId);
  await requireLeader(teamId);
  await db.from("setlists").delete().eq("id", setlistId);
  refresh(teamId);
}

export async function addToSetlist(setlistId: string, formData: FormData) {
  const teamId = await teamOf("setlists", setlistId);
  await requireLeader(teamId);
  const songId = String(formData.get("song_id") ?? "");
  if ((await teamOf("songs", songId)) !== teamId) throw new Error("다른 팀 곡");
  const { data: last } = await db.from("setlist_items").select("position").eq("setlist_id", setlistId).order("position", { ascending: false }).limit(1);
  await db.from("setlist_items").upsert(
    { setlist_id: setlistId, song_id: songId, position: (last?.[0]?.position ?? -1) + 1 },
    { onConflict: "setlist_id,song_id", ignoreDuplicates: true },
  );
  refresh(teamId);
}

export async function removeFromSetlist(setlistId: string, songId: string) {
  const teamId = await teamOf("setlists", setlistId);
  await requireLeader(teamId);
  await db.from("setlist_items").delete().eq("setlist_id", setlistId).eq("song_id", songId);
  refresh(teamId);
}

export async function saveSetlistOrder(setlistId: string, songIds: string[]) {
  const teamId = await teamOf("setlists", setlistId);
  await requireLeader(teamId);
  // ponytail: 곡마다 update 한 번씩. 셋리스트는 많아야 20곡 남짓이라 충분
  await Promise.all(
    songIds.map((songId, position) =>
      db.from("setlist_items").update({ position }).eq("setlist_id", setlistId).eq("song_id", songId),
    ),
  );
  refresh(teamId);
}

export async function saveItemMemo(setlistId: string, songId: string, formData: FormData) {
  const teamId = await teamOf("setlists", setlistId);
  await requireLeader(teamId);
  const memo = String(formData.get("memo") ?? "").trim().slice(0, 300);
  await db.from("setlist_items").update({ memo: memo || null }).eq("setlist_id", setlistId).eq("song_id", songId);
  refresh(teamId);
}
