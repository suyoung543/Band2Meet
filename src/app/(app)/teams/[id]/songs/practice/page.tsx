import { saveNote, setAssignmentSchedule, setSongStatus } from "@/app/song-actions";
import { db } from "@/lib/db";
import { dateLabel, kstToday, slotLabel } from "@/lib/schedule";
import { loadTeam } from "@/lib/team";

type Song = {
  id: string;
  title: string;
  artist: string | null;
  ref_url: string | null;
  practice_assignments: {
    id: string;
    schedule_id: string | null;
    created_at: string;
    practice_notes: { user_id: string; comment: string }[];
  }[];
};

const small = "rounded border px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700";

export default async function PracticePage({ params }: PageProps<"/teams/[id]/songs/practice">) {
  const { id } = await params;
  const { active, userId, isLeader } = await loadTeam(id);

  const [{ data }, { data: schedules }] = await Promise.all([
    db
      .from("songs")
      .select("id, title, artist, ref_url, practice_assignments(id, schedule_id, created_at, practice_notes(user_id, comment))")
      .eq("team_id", id)
      .eq("status", "practicing")
      .order("created_at"),
    db.from("confirmed_schedules").select("id, date, start_slot, end_slot").eq("team_id", id).gte("date", kstToday()).order("date").order("start_slot"),
  ]);
  const songs = (data ?? []) as Song[];
  const scheduleLabel = (s: { date: string; start_slot: number; end_slot: number }) => `${dateLabel(s.date)} ${slotLabel(s.start_slot)}–${slotLabel(s.end_slot)}`;
  const scheduleById = new Map((schedules ?? []).map((s) => [s.id, s]));

  if (!songs.length) {
    return <p className="text-sm text-zinc-500">연습 중인 곡이 없어요. {isLeader ? "후보함에서 “연습곡으로”를 눌러 지정하세요." : "리더가 후보함에서 연습곡을 지정하면 여기에 나와요."}</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {songs.map((s) => {
        // 곡당 배정은 보통 하나. 여러 개면 최신 것
        const a = [...s.practice_assignments].sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
        const notes = new Map(a?.practice_notes.map((n) => [n.user_id, n.comment]));
        const linked = a?.schedule_id ? scheduleById.get(a.schedule_id) : undefined;
        return (
          <li key={s.id} className="flex flex-col gap-3 rounded border p-4">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">
                {s.ref_url ? <a href={s.ref_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.title} ↗</a> : s.title}
              </span>
              {s.artist && <span className="text-sm text-zinc-500">{s.artist}</span>}
              {isLeader && (
                <div className="ml-auto flex gap-1">
                  <form action={setSongStatus.bind(null, s.id, "setlist")}><button className={small}>공연 준비 완료</button></form>
                  <form action={setSongStatus.bind(null, s.id, "candidate")}><button className={small}>후보로</button></form>
                </div>
              )}
            </div>

            {a && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-zinc-500">목표 합주</span>
                {isLeader ? (
                  <form action={setAssignmentSchedule.bind(null, a.id)} className="flex gap-1">
                    <select name="schedule_id" defaultValue={linked ? a.schedule_id! : ""} className="rounded border bg-transparent px-2 py-1 text-sm">
                      <option value="">정하지 않음</option>
                      {(schedules ?? []).map((sc) => <option key={sc.id} value={sc.id}>{scheduleLabel(sc)}</option>)}
                    </select>
                    <button className={small}>저장</button>
                  </form>
                ) : (
                  <span>{linked ? scheduleLabel(linked) : "정하지 않음"}</span>
                )}
              </div>
            )}

            {a && (
              <ul className="flex flex-col gap-1 text-sm">
                {active.map((m) =>
                  m.user_id === userId ? (
                    <li key={m.user_id}>
                      <form action={saveNote.bind(null, a.id)} className="flex items-center gap-2">
                        <span className="w-16 shrink-0 font-medium">{m.users.nickname}</span>
                        <input
                          name="comment"
                          defaultValue={notes.get(m.user_id) ?? ""}
                          placeholder="진행 상황 (예: 1절까지 완성)"
                          maxLength={500}
                          className="flex-1 rounded border bg-transparent px-2 py-1"
                        />
                        <button className={small}>저장</button>
                      </form>
                    </li>
                  ) : (
                    <li key={m.user_id} className="flex gap-2">
                      <span className="w-16 shrink-0 text-zinc-500">{m.users.nickname}</span>
                      <span className={notes.has(m.user_id) ? "" : "text-zinc-400"}>{notes.get(m.user_id) ?? "—"}</span>
                    </li>
                  ),
                )}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
