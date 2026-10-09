"use server";

import { db } from "@/lib/db";
import { deliver } from "@/lib/notify";
import { requireUser } from "@/lib/session";

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

// 이 기기를 푸시 받을 곳으로 등록 (같은 기기면 덮어씀)
export async function savePushSubscription(sub: Sub) {
  const user_id = await requireUser();
  if (!/^https:\/\//.test(sub?.endpoint ?? "") || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error("잘못된 구독");
  await db.from("push_subscriptions").upsert({ endpoint: sub.endpoint, user_id, p256dh: sub.keys.p256dh, auth: sub.keys.auth });
}

export async function deletePushSubscription(endpoint: string) {
  const user_id = await requireUser();
  await db.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user_id);
}

export async function sendTestPush() {
  const user_id = await requireUser();
  await deliver([user_id], { title: "Band2Meet 테스트 알림", body: "푸시 알림이 잘 와요!", url: "/notifications" });
}
