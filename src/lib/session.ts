import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 쿠키 값 = "<userId>.<HMAC 서명>". 서명이 맞으면 서버가 발급한 값
export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30일

const sign = (v: string) => createHmac("sha256", process.env.SESSION_SECRET!).update(v).digest("base64url");

export const encodeSession = (userId: string) => `${userId}.${sign(userId)}`;

export function decodeSession(value: string | undefined): string | null {
  if (!value) return null;
  const i = value.lastIndexOf(".");
  const userId = value.slice(0, i), sig = Buffer.from(value.slice(i + 1));
  const expected = Buffer.from(sign(userId));
  return i > 0 && sig.length === expected.length && timingSafeEqual(sig, expected) ? userId : null;
}

export async function getUserId() {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}

// 페이지/서버 액션 공용: 로그인 안 돼 있으면 /login으로
export async function requireUser() {
  const id = await getUserId();
  if (!id) redirect("/login");
  return id;
}
