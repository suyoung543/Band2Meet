import { deleteSong, saveNote, setSongStatus } from "@/app/song-actions";
import ConfirmButton from "@/components/ConfirmButton";
import { db } from "@/lib/db";
import { loadTeam } from "@/lib/team";
import SongEdit from "../edit";

type Song = {
  id: string;
  title: string;
  artist: string | null;
  ref_url: string | null;
  duration_sec: number | null;
  status: "practicing" | "done";
  created_by: string | null;
  practice_assignments: { id: string; created_at: string; practice_notes: { user_id: string; comment: string }[] }[];
};

const small = "rounded border px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700";

export default async function PracticePage({ params }: PageProps<"/teams/[id]/songs/practice">) {
  const { id } = await params;
  const { active, userId, isLeader } = await loadTeam(id);

  const { data } = await db
    .from("songs")
    .select("id, title, artist, ref_url, duration_sec, status, created_by, practice_assignments(id, created_at, practice_notes(user_id, comment))")
    .eq("team_id", id)
    .in("status", ["practicing", "done"])
    .order("created_at");
  const songs = (data ?? []) as Song[];
  const practicing = songs.filter((s) => s.status === "practicing");
  const done = songs.filter((s) => s.status === "done");

  const title = (s: Song) => (
    <span className="font-semibold">
      {s.ref_url ? <a href={s.ref_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.title} ↗</a> : s.title}
      {s.artist && <span className="ml-2 text-sm font-normal text-zinc-500">{s.artist}</span>}
    </span>
  );
  const actions = (s: Song) => (
    <div className="ml-auto flex gap-1">
      {s.status === "practicing" ? (
        <>
          <form action={setSongStatus.bind(null, s.id, "done")}><button className={small}>연습 완료</button></form>
          <form action={setSongStatus.bind(null, s.id, "candidate")}><button className={small}>후보로</button></form>
        </>
      ) : (
        <form action={setSongStatus.bind(null, s.id, "practicing")}><button className={small}>다시 연습</button></form>
      )}
      <SongEdit song={s} className={small} />
      {(isLeader || s.created_by === userId) && (
        <form action={deleteSong.bind(null, s.id)}>
          <ConfirmButton className={small} message={`"${s.title}"을(를) 삭제할까요? 멤버 코멘트와 셋리스트에 넣은 기록도 함께 지워져요.`}>삭제</ConfirmButton>
        </form>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">연습 중 {practicing.length}</h2>
        {practicing.length ? (
          <ul className="flex flex-col gap-4">
            {practicing.map((s) => {
              // 곡당 배정은 보통 하나. 여러 개면 최신 것
              const a = [...s.practice_assignments].sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
              const notes = new Map(a?.practice_notes.map((n) => [n.user_id, n.comment]));
              return (
                <li key={s.id} className="flex flex-col gap-3 rounded border p-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    {title(s)}
                    {actions(s)}
                  </div>
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
        ) : (
          <p className="text-sm text-zinc-500">연습 중인 곡이 없어요. 후보함에서 “연습곡으로”를 눌러 지정하세요.</p>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="font-semibold">연습 완료 {done.length}</h2>
        {done.length ? (
          <ul className="flex flex-col divide-y rounded border">
            {done.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline gap-2 px-4 py-2 text-sm">
                {title(s)}
                {actions(s)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">연습을 마친 곡은 “연습 완료”를 누르면 여기로 옮겨져요.</p>
        )}
      </section>
    </div>
  );
}
