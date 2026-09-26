import ConfirmButton from "@/components/ConfirmButton";
import { addSong, deleteSong, setSongStatus, toggleVote } from "@/app/song-actions";
import { db } from "@/lib/db";
import { durationLabel } from "@/lib/schedule";
import { loadTeam } from "@/lib/team";

type Song = {
  id: string;
  title: string;
  artist: string | null;
  ref_url: string | null;
  duration_sec: number | null;
  status: string;
  created_by: string | null;
  votes: { user_id: string }[];
};

const ERRORS: Record<string, string> = { title: "제목을 입력해 주세요.", url: "링크는 http:// 또는 https://로 시작해야 해요." };
const small = "rounded border px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700";
const field = "rounded border bg-transparent px-3 py-2 text-sm";

export default async function CandidatesPage({ params, searchParams }: PageProps<"/teams/[id]/songs">) {
  const { id } = await params;
  const { error } = await searchParams;
  const { active, userId, isLeader } = await loadTeam(id);
  const nick = new Map(active.map((m) => [m.user_id, m.users.nickname]));

  const { data } = await db
    .from("songs")
    .select("id, title, artist, ref_url, duration_sec, status, created_by, votes(user_id)")
    .eq("team_id", id)
    .in("status", ["candidate", "hold"])
    .order("created_at");
  const songs = (data ?? []) as Song[];
  const candidates = songs.filter((s) => s.status === "candidate").sort((a, b) => b.votes.length - a.votes.length);
  const held = songs.filter((s) => s.status === "hold");

  // 편중 방지: 멤버별로 올린 후보 곡 수
  const uploads = active.map((m) => ({ name: m.users.nickname, n: candidates.filter((s) => s.created_by === m.user_id).length }));

  const row = (s: Song) => {
    const voted = s.votes.some((v) => v.user_id === userId);
    return (
      <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
        <form action={toggleVote.bind(null, s.id)}>
          <button
            title={voted ? "찬성 취소" : "찬성"}
            className={`w-12 rounded-full border px-2 py-0.5 text-xs tabular-nums ${voted ? "border-accent bg-accent text-accent-fg" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          >
            👍 {s.votes.length}
          </button>
        </form>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">
            {s.ref_url ? <a href={s.ref_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.title} ↗</a> : s.title}
          </span>
          <span className="text-xs text-zinc-500">
            {[s.artist, s.duration_sec && durationLabel(s.duration_sec), s.created_by && `${nick.get(s.created_by) ?? "탈퇴한 멤버"} 추천`].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div className="flex gap-1">
          {isLeader && s.status === "candidate" && (
            <>
              <form action={setSongStatus.bind(null, s.id, "practicing")}><button className={small}>연습곡으로</button></form>
              <form action={setSongStatus.bind(null, s.id, "hold")}><button className={small}>보류</button></form>
            </>
          )}
          {isLeader && s.status === "hold" && (
            <form action={setSongStatus.bind(null, s.id, "candidate")}><button className={small}>후보로</button></form>
          )}
          {(isLeader || s.created_by === userId) && (
            <form action={deleteSong.bind(null, s.id)}><ConfirmButton className={small} message={`"${s.title}"을(를) 삭제할까요? 투표 기록도 함께 지워져요.`}>삭제</ConfirmButton></form>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <details className="rounded border px-4 py-3" open={typeof error === "string"}>
        <summary className="cursor-pointer text-sm font-medium">+ 곡 추천하기</summary>
        <form action={addSong.bind(null, id)} className="mt-3 flex flex-col gap-2">
          {typeof error === "string" && <p className="text-sm text-rose-600">{ERRORS[error]}</p>}
          <div className="flex flex-wrap gap-2">
            <input name="title" placeholder="제목" required maxLength={100} className={`${field} flex-1`} />
            <input name="artist" placeholder="아티스트" maxLength={100} className={`${field} flex-1`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <input name="ref_url" type="url" placeholder="참고 링크 (유튜브 등)" className={`${field} flex-[3]`} />
            <input name="duration" placeholder="길이 3:45" pattern="\d{1,2}(:\d{2})?" className={`${field} w-28`} />
          </div>
          <button className="self-start rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110">추천</button>
        </form>
      </details>

      <p className="text-xs text-zinc-500">
        올린 곡: {uploads.map((u) => `${u.name} ${u.n}`).join(" · ")}
      </p>

      {candidates.length ? (
        <ul className="flex flex-col divide-y rounded border">{candidates.map(row)}</ul>
      ) : (
        <p className="text-sm text-zinc-500">아직 후보 곡이 없어요. 하고 싶은 곡을 추천해 보세요.</p>
      )}

      {held.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-zinc-500">보류 {held.length}</summary>
          <ul className="mt-2 flex flex-col divide-y rounded border opacity-70">{held.map(row)}</ul>
        </details>
      )}
    </div>
  );
}
