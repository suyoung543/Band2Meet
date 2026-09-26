import { resetCollection, saveTeamSettings } from "@/app/actions";
import ConfirmButton from "@/components/ConfirmButton";
import { loadTeam } from "@/lib/team";

const ERRORS: Record<string, string> = {
  range: "기간을 확인해 주세요. 끝 날짜가 시작 날짜보다 빠르거나 기간이 3개월을 넘어요.",
  min: "최소 연속 시간을 골라 주세요.",
};

// DB timestamptz → datetime-local 입력값 (한국 시간)
const toLocalInput = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 16) : "";

const field = "rounded border bg-transparent px-3 py-2 text-sm";

export default async function SettingsPage({ params, searchParams }: PageProps<"/teams/[id]/settings">) {
  const { id } = await params;
  const { error } = await searchParams;
  const { team } = await loadTeam(id);

  return (
    <div className="flex max-w-md flex-col gap-6">
    <form action={saveTeamSettings.bind(null, team.id)} className="flex flex-col gap-4">
      {typeof error === "string" && <p className="text-sm text-rose-600">{ERRORS[error]}</p>}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">수합 기간</span>
        <span className="text-xs text-zinc-500">이 기간 안에서 합주 가능한 시간을 찾아요 (최대 3개월)</span>
        <div className="flex items-center gap-2">
          <input type="date" name="collect_start" required defaultValue={team.collect_start ?? ""} className={field} />
          ~
          <input type="date" name="collect_end" required defaultValue={team.collect_end ?? ""} className={field} />
        </div>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">입력 마감 (선택)</span>
        <input type="datetime-local" name="deadline" defaultValue={toLocalInput(team.deadline)} className={field} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">최소 연속 시간</span>
        <span className="text-xs text-zinc-500">이보다 짧게 겹치는 시간은 후보에서 빼요</span>
        <select name="min_block_slots" defaultValue={team.min_block_slots} className={field}>
          {[2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>{n / 2}시간</option>
          ))}
        </select>
      </label>

      <button className="self-start rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110">저장</button>
    </form>

      {team.collect_start && (
        <form action={resetCollection.bind(null, team.id)} className="flex flex-col gap-1 border-t pt-6">
          <ConfirmButton
            className="self-start text-sm text-rose-600 hover:underline"
            message={"현재 수합을 초기화할까요?\n수합 기간과 입력 마감이 지워지고 대시보드가 비워져요.\n멤버들의 시간표와 확정된 합주는 그대로 남아요."}
          >
            수합 초기화
          </ConfirmButton>
          <span className="text-xs text-zinc-500">합주를 다 잡았으면 초기화해서 대시보드를 비워두세요. 다음 수합 때 기간만 다시 정하면 돼요.</span>
        </form>
      )}
    </div>
  );
}
