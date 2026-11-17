import { createClient } from "@supabase/supabase-js";

// Supabase가 가끔 정상 키를 401로 튕김(로그로 확인) → 한 번 재시도. 401은 실행 전에 거부된 거라 쓰기 요청도 재시도해도 안전.
// ponytail: 1회만 재시도, 연속으로 튕기면 그대로 실패
const retryFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  return res.status === 401 ? fetch(input, init) : res;
};

// 서버 전용. secret key는 RLS를 우회하므로 권한 체크는 호출하는 쪽에서 해야 함
export const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
  global: { fetch: retryFetch },
});
