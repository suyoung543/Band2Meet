import { updateSong } from "@/app/song-actions";
import DialogButton from "@/components/DialogButton";
import { durationLabel } from "@/lib/schedule";

const field = "rounded border bg-transparent px-3 py-2 text-sm";

type Song = { id: string; title: string; artist: string | null; ref_url: string | null; duration_sec: number | null };

// 곡 정보 수정 팝업 (후보함/연습 중 공용)
export default function SongEdit({ song, className }: { song: Song; className: string }) {
  return (
    <DialogButton label="수정" title="곡 정보 수정" className={className}>
      <form action={updateSong.bind(null, song.id)} className="flex flex-col gap-2">
        <input name="title" defaultValue={song.title} placeholder="제목" required maxLength={100} className={field} />
        <input name="artist" defaultValue={song.artist ?? ""} placeholder="아티스트" maxLength={100} className={field} />
        <input name="ref_url" type="url" defaultValue={song.ref_url ?? ""} placeholder="참고 링크 (유튜브 등)" className={field} />
        <input
          name="duration"
          defaultValue={song.duration_sec ? durationLabel(song.duration_sec) : ""}
          placeholder="길이 3:45"
          pattern="\d{1,2}(:\d{2})?"
          className={field}
        />
        <button className="mt-1 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110">저장</button>
      </form>
    </DialogButton>
  );
}
