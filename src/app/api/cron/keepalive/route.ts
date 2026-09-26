import { db } from "@/lib/db";

// Supabase 무료 플랜은 7일간 요청이 없으면 일시정지됨 → Vercel Cron이 하루 한 번 호출 (vercel.json)
// Vercel이 Authorization: Bearer <CRON_SECRET> 헤더를 붙여 보냄. 다른 사람은 호출 못 하게 확인
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { error } = await db.from("teams").select("id").limit(1);
  return Response.json({ ok: !error }, { status: error ? 500 : 200 });
}
