import Collapsible from "@/components/Collapsible";
import ConfirmButton from "@/components/ConfirmButton";
import { addToSetlist, createSetlist, deleteSetlist, updateSetlist } from "@/app/song-actions";
import { db } from "@/lib/db";
import { dateLabel } from "@/lib/schedule";
import { loadTeam } from "@/lib/team";
import SetlistEditor, { Item } from "./editor";

type Setlist = {
  id: string;
  name: string;
  performance_date: string | null;
  created_at: string;
  setlist_items: { song_id: string; position: number; memo: string | null; songs: { title: string; artist: string | null; duration_sec: number | null } }[];
};

const small = "rounded border px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700";

export default async function SetlistsPage({ params }: PageProps<"/teams/[id]/songs/setlists">) {
  const { id } = await params;
  await loadTeam(id); // 멤버 확인

  const [{ data }, { data: songs }] = await Promise.all([
    db
      .from("setlists")
      .select("id, name, performance_date, created_at, setlist_items(song_id, position, memo, songs(title, artist, duration_sec))")
      .eq("team_id", id)
      .order("created_at", { ascending: false }),
    // 셋리스트에 넣을 수 있는 곡: 연습 중 + 연습 완료
    db.from("songs").select("id, title").eq("team_id", id).in("status", ["practicing", "done"]).order("title"),
  ]);
  // 공연 날짜 기준 최신순. 공연 날짜가 없으면 만든 날짜로 대신 비교
  const sortKey = (sl: Setlist) => sl.performance_date ?? sl.created_at.slice(0, 10);
  const setlists = ((data ?? []) as unknown as Setlist[]).sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

  return (
    <div className="flex flex-col gap-6">
      <form action={createSetlist.bind(null, id)} className="flex flex-wrap gap-2">
        <input name="name" placeholder="새 셋리스트 이름 (예: 10월 정기공연)" required maxLength={60} className="min-w-0 flex-1 rounded border bg-transparent px-3 py-2 text-sm" />
        <input type="date" name="performance_date" aria-label="공연 날짜" className="rounded border bg-transparent px-3 py-2 text-sm" />
        <button className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110">만들기</button>
      </form>

      {!setlists.length && <p className="text-sm text-zinc-500">아직 셋리스트가 없어요.</p>}

      {setlists.map((sl) => {
        const items: Item[] = [...sl.setlist_items]
          .sort((a, b) => a.position - b.position)
          .map((i) => ({ song_id: i.song_id, memo: i.memo, ...i.songs }));
        const addable = (songs ?? []).filter((s) => !items.some((i) => i.song_id === s.id));
        return (
          <section key={sl.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h2 className="font-semibold">{sl.name}</h2>
              <span className="text-sm text-zinc-500">{sl.performance_date ? `공연 ${sl.performance_date.slice(2).replaceAll("-", "/")}(${dateLabel(sl.performance_date).slice(-2, -1)})` : "공연 날짜 미정"}</span>
              <Collapsible className="relative ml-auto">
                <summary className={`${small} cursor-pointer list-none`}>셋리스트 수정 · 삭제</summary>
                <div className="absolute right-0 z-20 mt-2 flex w-72 flex-col gap-3 rounded border bg-background p-3 text-sm shadow-lg">
                  <form action={updateSetlist.bind(null, sl.id)} className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-500">이름</span>
                      <input name="name" defaultValue={sl.name} required maxLength={60} className="rounded border bg-transparent px-2 py-1" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-500">공연 날짜</span>
                      <input type="date" name="performance_date" defaultValue={sl.performance_date ?? ""} className="rounded border bg-transparent px-2 py-1" />
                    </label>
                    <button className="rounded bg-accent px-3 py-1.5 font-medium text-accent-fg hover:brightness-110">저장</button>
                  </form>
                  <form action={deleteSetlist.bind(null, sl.id)} className="border-t pt-3">
                    <ConfirmButton className="text-rose-600 hover:underline" message={`"${sl.name}" 셋리스트를 삭제할까요? 곡은 그대로 남아요.`}>
                      셋리스트 삭제
                    </ConfirmButton>
                  </form>
                </div>
              </Collapsible>
            </div>
            <SetlistEditor setlistId={sl.id} items={items} />
            {addable.length ? (
                <form action={addToSetlist.bind(null, sl.id)} className="flex gap-2 text-sm">
                  <select name="song_id" className="flex-1 rounded border bg-transparent px-2 py-1">
                    {addable.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                  <button className={small}>곡 추가</button>
                </form>
              ) : (
                <p className="text-xs text-zinc-500">추가할 수 있는 곡이 없어요. 연습 중이거나 연습 완료한 곡을 넣을 수 있어요.</p>
              )}

          </section>
        );
      })}
    </div>
  );
}
