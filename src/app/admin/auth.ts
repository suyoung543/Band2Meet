import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

// 관리자가 아니면 404 (관리자 페이지가 있다는 것도 숨김)
export async function requireAdmin() {
  const userId = await requireUser();
  const { data } = await db.from("users").select("is_admin").eq("id", userId).single();
  if (!data?.is_admin) notFound();
  return userId;
}
