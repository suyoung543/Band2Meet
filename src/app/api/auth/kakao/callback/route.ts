import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, encodeSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));

  if (!code || !state || state !== req.cookies.get("kakao_state")?.value) return fail("state");

  // 1) 인가 코드 → 액세스 토큰
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.KAKAO_REST_API_KEY!,
    redirect_uri: process.env.KAKAO_REDIRECT_URI!,
    code,
  });
  if (process.env.KAKAO_CLIENT_SECRET) params.set("client_secret", process.env.KAKAO_CLIENT_SECRET);

  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: params,
  });
  if (!tokenRes.ok) {
    console.error("kakao token", await tokenRes.text());
    return fail("token");
  }
  const { access_token } = await tokenRes.json();

  // 2) 액세스 토큰 → 카카오 유저 정보
  const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!meRes.ok) {
    console.error("kakao me", await meRes.text());
    return fail("profile");
  }
  const me = await meRes.json();
  const profile = me.kakao_account?.profile;

  // 3) DB에 저장 (재로그인 시 닉네임/사진 갱신)
  const { data: user, error } = await db
    .from("users")
    .upsert(
      {
        kakao_id: me.id,
        nickname: profile?.nickname ?? "이름없음",
        profile_image: profile?.thumbnail_image_url ?? null,
        email: me.kakao_account?.email ?? null,
      },
      { onConflict: "kakao_id" },
    )
    .select("id")
    .single();
  if (error) {
    console.error("user upsert", error);
    return fail("db");
  }

  // 4) 세션 발급
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.delete("kakao_state");
  res.cookies.set(SESSION_COOKIE, encodeSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  return res;
}
