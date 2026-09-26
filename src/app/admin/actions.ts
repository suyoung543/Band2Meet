"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "./auth";

// 관리자: 모든 밴드의 리더 변경 / 삭제

export async function adminSetLeader(teamId: string, formData: FormData) {
  await requireAdmin();
  const to = String(formData.get("user_id") ?? "");
  const { data } = await db.from("team_members").select("status").eq("team_id", teamId).eq("user_id", to).maybeSingle();
  if (data?.status !== "active") throw new Error("팀 멤버가 아니에요");
  await db.from("teams").update({ leader_id: to }).eq("id", teamId);
  revalidatePath("/admin");
}

export async function adminDeleteTeam(teamId: string) {
  await requireAdmin();
  await db.from("teams").delete().eq("id", teamId);
  revalidatePath("/admin");
}
