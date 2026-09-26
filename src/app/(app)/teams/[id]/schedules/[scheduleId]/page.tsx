import ConfirmButton from "@/components/ConfirmButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelScheduleAndBack, updateSchedule } from "@/app/actions";
import CopyText from "@/components/CopyText";
import { db } from "@/lib/db";
import { TIMES, dateLabel, slotLabel } from "@/lib/schedule";
import { loadTeam } from "@/lib/team";
import Section from "../../section";

const field = "rounded border bg-transparent px-3 py-2 text-sm";

export default async function ScheduleDetailPage({ params, searchParams }: PageProps<"/teams/[id]/schedules/[scheduleId]">) {
  const { id, scheduleId } = await params;
  const { error, saved } = await searchParams;
  const { team } = await loadTeam(id);
  const { data: s } = await db
    .from("confirmed_schedules")
    .select("id, date, start_slot, end_slot, place, memo, todo")
    .eq("id", scheduleId)
    .eq("team_id", id)
    .maybeSingle();
  if (!s) notFound();

  // 카톡 공지. 빈 항목은 줄째로 생략
  const todos = (s.todo ?? "").split("\n").map((t: string) => t.trim()).filter(Boolean);
  const notice =
    `[${team.name}] 합주 공지 🎸\n\n` +
    [
      `일정: ${dateLabel(s.date)} ${slotLabel(s.start_slot)}–${slotLabel(s.end_slot)} (${(s.end_slot - s.start_slot) / 2}시간)`,
      s.place && `합주실: ${s.place}`,
      todos.length > 0 && `\n할 일:\n${todos.map((t: string) => `- ${t.replace(/^[-•]\s*/, "")}`).join("\n")}`,
      s.memo && `\n메모: ${s.memo}`,
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <div className="flex flex-col divide-y">
      <div className="flex items-baseline gap-3 pb-3">
        <Link href={`/teams/${id}/schedules`} className="text-sm text-zinc-500 hover:text-foreground">← 확정 일정</Link>
        <h2 className="text-lg font-semibold">
          {dateLabel(s.date)} {slotLabel(s.start_slot)}–{slotLabel(s.end_slot)}
        </h2>
      </div>

      <Section title="카톡 공지">
        <CopyText text={notice} />
      </Section>

      <Section title="일정 정보 수정">
        {error && <p className="text-sm text-rose-600">시간을 확인해 주세요. 끝 시간이 시작보다 늦어야 해요.</p>}
        {saved && <p className="text-sm text-zinc-500">저장했어요.</p>}
        <form action={updateSchedule.bind(null, id, s.id)} className="flex max-w-lg flex-col gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="font-medium">날짜 · 시간</span>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" name="date" required defaultValue={s.date} className={field} />
              <select name="start" defaultValue={s.start_slot} className={field}>
                {TIMES.map((t, i) => <option key={i} value={i}>{t}</option>)}
              </select>
              ~
              <select name="end" defaultValue={s.end_slot} className={field}>
                {TIMES.map((_, i) => <option key={i} value={i + 1}>{slotLabel(i + 1)}</option>)}
              </select>
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">합주실</span>
            <input name="place" defaultValue={s.place ?? ""} placeholder="예: 홍대 ○○합주실 A룸" maxLength={100} className={field} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">할 일</span>
            <span className="text-xs text-zinc-500">한 줄에 하나씩</span>
            <textarea name="todo" defaultValue={s.todo ?? ""} rows={4} placeholder={"합주실 예약 (리더)\nMR 준비"} maxLength={1000} className={field} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">메모</span>
            <textarea name="memo" defaultValue={s.memo ?? ""} rows={3} placeholder="예: 늦으면 미리 연락 주세요" maxLength={1000} className={field} />
          </label>
          <div className="flex gap-2">
            <button className="rounded bg-accent px-4 py-2 font-medium text-accent-fg hover:brightness-110">저장</button>
            <Link href={`/teams/${id}/dates/${s.date}`} className="rounded border px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              그날 멤버 가능 시간 보기
            </Link>
          </div>
        </form>
        <form action={cancelScheduleAndBack.bind(null, id, s.id)}>
          <ConfirmButton className="text-sm text-rose-600 hover:underline" message="이 합주 확정을 취소할까요? 적어둔 합주실·할 일·메모도 함께 지워져요.">확정 취소</ConfirmButton>
        </form>
      </Section>
    </div>
  );
}
