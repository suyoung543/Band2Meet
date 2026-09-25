import MySchedulePage from "@/components/MySchedulePage";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Status, decodeSlots, emptyWeek } from "@/lib/schedule";

export default async function SchedulePage() {
  const userId = await requireUser();

  const [{ data: baseRows }, { data: exRows }] = await Promise.all([
    db.from("base_patterns").select("day, slots").eq("user_id", userId),
    db.from("exceptions").select("date, slots").eq("user_id", userId),
  ]);
  const base = emptyWeek();
  for (const r of baseRows ?? []) base[r.day] = decodeSlots(r.slots);
  const exceptions: Record<string, Status[]> = {};
  for (const r of exRows ?? []) exceptions[r.date] = decodeSlots(r.slots);

  return <MySchedulePage initialBase={base} initialExceptions={exceptions} />;
}
