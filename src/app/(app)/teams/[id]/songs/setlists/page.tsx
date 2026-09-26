import ConfirmButton from "@/components/ConfirmButton";
import { addToSetlist, createSetlist, deleteSetlist } from "@/app/song-actions";
import { db } from "@/lib/db";
import { loadTeam } from "@/lib/team";
import SetlistEditor, { Item } from "./editor";

type Setlist = {
  id: string;
  name: string;
  setlist_items: { song_id: string; position: number; memo: string | null; songs: { title: string; artist: string | null; duration_sec: number | null } }[];
};

const small = "rounded border px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700";

export default async function SetlistsPage({ params }: PageProps<"/teams/[id]/songs/setlists">) {
  const { id } = await params;
  const { isLeader } = await loadTeam(id);

  const [{ data }, { data: songs }] = await Promise.all([
    db
      .from("setlists")
      .select("id, name, setlist_items(song_id, position, memo, songs(title, artist, duration_sec))")
      .eq("team_id", id)
      .order("created_at", { ascending: false }),
    // 셋리스트에 넣을 수 있는 곡: 연습 중인 곡
    db.from("songs").select("id, title").eq("team_id", id).eq("status", "practicing").order("title"),
  ]);
  const setlists = (data ?? []) as unknown as Setlist[];

  return (
    <div className="flex flex-col gap-6">
      {isLeader && (
        <form action={createSetlist.bind(null, id)} className="flex gap-2">
          <input name="name" placeholder="새 셋리스트 이름 (예: 10월 정기공연)" required maxLength={60} className="flex-1 rounded border bg-transparent px-3 py-2 text-sm" />
          <button className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110">만들기</button>
        </form>
      )}

      {!setlists.length && <p className="text-sm text-zinc-500">아직 셋리스트가 없어요.</p>}

      {setlists.map((sl) => {
        const items: Item[] = [...sl.setlist_items]
          .sort((a, b) => a.position - b.position)
          .map((i) => ({ song_id: i.song_id, memo: i.memo, ...i.songs }));
        const addable = (songs ?? []).filter((s) => !items.some((i) => i.song_id === s.id));
        return (
          <section key={sl.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">{sl.name}</h2>
              {isLeader && (
                <form action={deleteSetlist.bind(null, sl.id)} className="ml-auto">
                  <ConfirmButton className={small} message={`"${sl.name}" 셋리스트를 삭제할까요? 곡은 그대로 남아요.`}>셋리스트 삭제</ConfirmButton>
                </form>
              )}
            </div>
            <SetlistEditor setlistId={sl.id} items={items} isLeader={isLeader} />
            {isLeader && (
              addable.length ? (
                <form action={addToSetlist.bind(null, sl.id)} className="flex gap-2 text-sm">
                  <select name="song_id" className="flex-1 rounded border bg-transparent px-2 py-1">
                    {addable.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                  <button className={small}>곡 추가</button>
                </form>
              ) : (
                <p className="text-xs text-zinc-500">추가할 수 있는 곡이 없어요. 연습 중인 곡만 넣을 수 있어요.</p>
              )
            )}
          </section>
        );
      })}
    </div>
  );
}
