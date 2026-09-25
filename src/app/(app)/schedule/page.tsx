import MySchedulePage, { Rehearsal } from "@/components/MySchedulePage";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Status, decodeSlots, emptyWeek } from "@/lib/schedule";

export default async function SchedulePage() {
  const userId = await requireUser();

  const [{ data: baseRows }, { data: exRows }, { data: myTeams }] = await Promise.all([
    db.from("base_patterns").select("day, slots").eq("user_id", userId),
    db.from("exceptions").select("date, slots").eq("user_id", userId),
    db.from("team_members").select("team_id").eq("user_id", userId).eq("status", "active"),
  ]);
  const { data: conf } = await db
    .from("confirmed_schedules")
    .select("date, start_slot, end_slot, teams(name)")
    .in("team_id", (myTeams ?? []).map((t) => t.team_id));
  const rehearsals: Rehearsal[] = (conf ?? []).map((c) => ({
    date: c.date,
    start: c.start_slot,
    end: c.end_slot,
    team: (c.teams as unknown as { name: string }).name,
  }));
  const base = emptyWeek();
  for (const r of baseRows ?? []) base[r.day] = decodeSlots(r.slots);
  const exceptions: Record<string, Status[]> = {};
  for (const r of exRows ?? []) exceptions[r.date] = decodeSlots(r.slots);

  return <MySchedulePage initialBase={base} initialExceptions={exceptions} rehearsals={rehearsals} />;
}
