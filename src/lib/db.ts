import { createClient } from "@supabase/supabase-js";

// 서버 전용. secret key는 RLS를 우회하므로 권한 체크는 호출하는 쪽에서 해야 함
export const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});
