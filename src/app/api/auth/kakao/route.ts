import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

// 로그인 시작: 카카오 인가 페이지로 보냄. state는 CSRF 방지용으로 쿠키에 저장했다가 콜백에서 비교
export function GET() {
  const state = randomBytes(16).toString("hex");
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: process.env.KAKAO_REST_API_KEY!,
    redirect_uri: process.env.KAKAO_REDIRECT_URI!,
    state,
    scope: "profile_nickname,profile_image", // 명시하면 아직 동의 안 한 항목은 추가 동의 화면이 뜸
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set("kakao_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  return res;
}
