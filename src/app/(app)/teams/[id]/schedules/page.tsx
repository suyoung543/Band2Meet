import ConfirmButton from "@/components/ConfirmButton";
import Link from "next/link";
import { cancelSchedule } from "@/app/actions";
import { db } from "@/lib/db";
import { dateLabel, kstToday, slotLabel } from "@/lib/schedule";
import { loadTeam } from "@/lib/team";
import Section from "../section";

const small = "rounded border px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700";

export default async function SchedulesPage({ params }: PageProps<"/teams/[id]/schedules">) {
  const { id } = await params;
  await loadTeam(id); // 멤버 확인
  const { data } = await db
    .from("confirmed_schedules")
    .select("id, date, start_slot, end_slot, place")
    .eq("team_id", id)
    .order("date")
    .order("start_slot");

  // 오늘(한국 날짜) 기준으로 다가오는 / 지난 합주
  const today = kstToday();
  const upcoming = (data ?? []).filter((c) => c.date >= today);
  const past = (data ?? []).filter((c) => c.date < today).reverse();

  const list = (rows: typeof upcoming, canCancel: boolean) => (
    <ul className="flex flex-col divide-y rounded border">
      {rows.map((c) => (
        <li key={c.id} className="flex items-center gap-3 px-4 py-2 text-sm">
          <Link href={`/teams/${id}/schedules/${c.id}`} className="flex flex-col hover:underline">
            <span className="flex gap-3">
              <span className="font-medium">{dateLabel(c.date)}</span>
              <span>{slotLabel(c.start_slot)}–{slotLabel(c.end_slot)}</span>
              <span className="text-zinc-500">{(c.end_slot - c.start_slot) / 2}시간</span>
            </span>
            {c.place && <span className="text-xs text-zinc-500">{c.place}</span>}
          </Link>
          {canCancel && (
            <form action={cancelSchedule.bind(null, id, c.id)} className="ml-auto">
              <ConfirmButton className={small} message="이 합주 확정을 취소할까요?">확정 취소</ConfirmButton>
            </form>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col divide-y">
      <Section title={`다가오는 합주 ${upcoming.length}`}>
        {upcoming.length ? list(upcoming, true) : (
          <p className="text-sm text-zinc-500">
            확정된 합주가 없어요. 대시보드에서 날짜를 골라 확정하세요.
          </p>
        )}
      </Section>
      {past.length > 0 && <Section title={`지난 합주 ${past.length}`}>{list(past, false)}</Section>}
    </div>
  );
}
