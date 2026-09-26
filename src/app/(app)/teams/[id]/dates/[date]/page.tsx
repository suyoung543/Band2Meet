import ConfirmButton from "@/components/ConfirmButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelSchedule, confirmSchedule } from "@/app/actions";
import { findBlocks, memberDay } from "@/lib/availability";
import { db } from "@/lib/db";
import { STATUS_COLOR, STATUS_LABEL, Status, TIMES, dateLabel, slotLabel } from "@/lib/schedule";
import { loadAvailability, loadTeam } from "@/lib/team";

const STATUS: Record<string, Status> = { y: "yes", n: "no", m: "maybe" };
const small = "rounded border px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700";

export default async function DatePage({ params, searchParams }: PageProps<"/teams/[id]/dates/[date]">) {
  const { id, date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) notFound();
  const { team, active } = await loadTeam(id);
  const total = active.length;
  const minPeople = Math.min(Math.max(Number((await searchParams).min) || total, 1), total);

  const [members, { data: confirmed }] = await Promise.all([
    loadAvailability(id, active.map((m) => m.user_id), date, date),
    db.from("confirmed_schedules").select("id, start_slot, end_slot").eq("team_id", id).eq("date", date).order("start_slot"),
  ]);
  const rows = members.map((m) => memberDay(m, date));
  const blocks = findBlocks(members, [date], { minSlots: team.min_block_slots, minPeople });
  const nick = new Map(active.map((m) => [m.user_id, m.users.nickname]));
  const isConfirmed = (s: number) => confirmed?.some((c) => s >= c.start_slot && s < c.end_slot);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-3">
        <Link href={`/teams/${id}?min=${minPeople}`} className="text-sm text-zinc-500 hover:text-foreground">← 대시보드</Link>
        <h2 className="text-lg font-semibold">{dateLabel(date)}</h2>
      </div>

      {!!confirmed?.length && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">확정된 합주</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {confirmed.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <Link href={`/teams/${id}/schedules/${c.id}`} className="font-medium text-accent hover:underline">{slotLabel(c.start_slot)}–{slotLabel(c.end_slot)}</Link>
                <form action={cancelSchedule.bind(null, id, c.id)}>
                  <ConfirmButton className={small} message="이 합주 확정을 취소할까요?">확정 취소</ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{minPeople === total ? "전원" : `${minPeople}명 이상`} 가능한 시간</h3>
        {blocks.length ? (
          <ul className="flex flex-col divide-y rounded border">
            {blocks.map((b) => (
              <li key={`${b.start}-${b.members.join()}`} className="flex flex-wrap items-center gap-x-3 px-4 py-2 text-sm">
                <span className="font-medium">{slotLabel(b.start)}–{slotLabel(b.end)}</span>
                <span className="text-zinc-500">{(b.end - b.start) / 2}시간 · {b.members.map((u) => nick.get(u)).join(", ")}</span>
                <form action={confirmSchedule.bind(null, id, date)} className="ml-auto">
                  <input type="hidden" name="start" value={b.start} />
                  <input type="hidden" name="end" value={b.end} />
                  <button className={small}>이 시간으로 확정</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">최소 {team.min_block_slots / 2}시간 이상 겹치는 시간이 없어요.</p>
        )}
      </section>

      <form action={confirmSchedule.bind(null, id, date)} className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">직접 확정</span>
        <select name="start" defaultValue={blocks[0]?.start ?? 36} className="rounded border bg-transparent px-2 py-1">
          {TIMES.map((t, i) => <option key={i} value={i}>{t}</option>)}
        </select>
        ~
        <select name="end" defaultValue={blocks[0]?.end ?? 42} className="rounded border bg-transparent px-2 py-1">
          {TIMES.map((_, i) => <option key={i} value={i + 1}>{slotLabel(i + 1)}</option>)}
        </select>
        <button className="rounded bg-accent px-3 py-1 font-medium text-accent-fg hover:brightness-110">확정</button>
      </form>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">시간대별 상세</h3>
        <div className="max-h-[70vh] overflow-auto rounded border">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-background">
              <tr>
                <th className="w-12" />
                {members.map((m) => (
                  <th key={m.id} className="px-1 py-1 font-medium">{nick.get(m.id)}</th>
                ))}
                <th className="w-10 font-medium">가능</th>
              </tr>
            </thead>
            <tbody>
              {TIMES.map((t, s) => {
                const yes = rows.filter((r) => r[s] === "y").length;
                return (
                  <tr key={t}>
                    <td
                      title={isConfirmed(s) ? "확정된 합주" : undefined}
                      className={`pr-1 text-right align-top tabular-nums ${isConfirmed(s) ? "bg-accent font-medium text-accent-fg" : "text-zinc-400"}`}
                    >{s % 2 === 0 ? t : ""}</td>
                    {rows.map((r, i) => (
                      <td
                        key={i}
                        title={`${nick.get(members[i].id)} ${t} ${STATUS_LABEL[STATUS[r[s]]]}`}
                        className={`h-4 border border-background ${STATUS_COLOR[STATUS[r[s]]]}`}
                      />
                    ))}
                    <td className={`text-center tabular-nums ${yes === total ? "font-bold" : "text-zinc-500"}`}>{yes || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
