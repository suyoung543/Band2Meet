import ConfirmButton from "@/components/ConfirmButton";
import DialogButton from "@/components/DialogButton";
import { approveMember, deleteTeam, removeMember, renameTeam, transferLeader } from "@/app/actions";
import { loadTeam } from "@/lib/team";

const small = "rounded border px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700";

export default async function MembersPage({ params }: PageProps<"/teams/[id]/members">) {
  const { id } = await params;
  const { team, active, members, userId, isLeader } = await loadTeam(id);
  const pending = members.filter((m) => m.status === "pending");

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-500">
        초대코드 <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-foreground select-all dark:bg-zinc-800">{team.invite_code}</code>
      </p>

      {isLeader && pending.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">참여 요청 {pending.length}</h2>
          <ul className="flex flex-col divide-y rounded border border-orange-300">
            {pending.map((m) => (
              <li key={m.user_id} className="flex items-center gap-2 px-4 py-2 text-sm">
                <span>{m.users.nickname}</span>
                <form action={approveMember.bind(null, team.id, m.user_id)} className="ml-auto">
                  <button className={small}>승인</button>
                </form>
                <form action={removeMember.bind(null, team.id, m.user_id)}>
                  <ConfirmButton className={small} message={`${m.users.nickname}님의 참여 요청을 거절할까요?`}>거절</ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">멤버 {active.length}</h2>
        <ul className="flex flex-col divide-y rounded border">
          {active.map((m) => (
            <li key={m.user_id} className="flex items-center gap-2 px-4 py-2 text-sm">
              <span>{m.users.nickname}</span>
              {m.user_id === team.leader_id && <span className="text-xs text-accent">리더</span>}
              {isLeader && m.user_id !== userId && (
                <form action={removeMember.bind(null, team.id, m.user_id)} className="ml-auto">
                  <ConfirmButton className={small} message={`${m.users.nickname}님을 팀에서 내보낼까요?\n다시 들어오려면 초대코드로 참여 요청을 해야 해요.`}>내보내기</ConfirmButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isLeader && (
        <section className="flex flex-col gap-2 border-t pt-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <DialogButton label="팀 이름 변경" title="팀 이름 변경" className="text-zinc-600 hover:underline dark:text-zinc-300">
              <form action={renameTeam.bind(null, team.id)} className="flex flex-col gap-3">
                <input name="name" defaultValue={team.name} required maxLength={40} autoFocus className="rounded border bg-transparent px-3 py-2 text-sm" />
                <button className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110">저장</button>
              </form>
            </DialogButton>

            {active.length > 1 && (
              <DialogButton label="리더 넘기기" title="리더 넘기기" className="text-zinc-600 hover:underline dark:text-zinc-300">
                <form action={transferLeader.bind(null, team.id)} className="flex flex-col gap-3">
                  <p className="text-xs text-zinc-500">넘기고 나면 팀 관리 권한이 새 리더에게 가요.</p>
                  <select name="user_id" className="rounded border bg-transparent px-3 py-2 text-sm">
                    {active.filter((m) => m.user_id !== userId).map((m) => (
                      <option key={m.user_id} value={m.user_id}>{m.users.nickname}</option>
                    ))}
                  </select>
                  <button className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110">넘기기</button>
                </form>
              </DialogButton>
            )}

            <form action={deleteTeam.bind(null, team.id)}>
              <ConfirmButton
                className="text-rose-600 hover:underline"
                message={`"${team.name}" 팀을 삭제할까요?\n확정 일정, 곡, 셋리스트가 모두 지워지고 되돌릴 수 없어요.\n(멤버들의 개인 스케줄은 남아요)`}
              >
                팀 삭제
              </ConfirmButton>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
