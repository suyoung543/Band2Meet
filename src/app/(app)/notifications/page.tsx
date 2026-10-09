import Link from "next/link";
import { after } from "next/server";
import { clearNotifications } from "@/app/notification-actions";
import ConfirmButton from "@/components/ConfirmButton";
import PushToggle from "@/components/PushToggle";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

// 시간 표시: 오늘이면 시:분, 아니면 월/일 (한국 시간)
function when(iso: string) {
  const kst = (t: number) => new Date(t + 9 * 3600_000).toISOString();
  const d = kst(Date.parse(iso)), now = kst(Date.now());
  return d.slice(0, 10) === now.slice(0, 10) ? d.slice(11, 16) : `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
}

export default async function NotificationsPage() {
  const userId = await requireUser();
  const { data } = await db
    .from("notifications")
    .select("id, title, body, url, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  // 열어본 순간 모두 읽음 처리 (이번 화면에서는 새 알림 표시가 남아 있음)
  after(() => db.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null));

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">알림</h1>
        {!!data?.length && (
          <form action={clearNotifications}>
            <ConfirmButton className="text-sm text-zinc-500 hover:text-rose-600 hover:underline" message="알림을 모두 지울까요?" confirmLabel="지우기">
              모두 지우기
            </ConfirmButton>
          </form>
        )}
      </div>
      <PushToggle />
      {data?.length ? (
        <ul className="flex flex-col divide-y rounded border">
          {data.map((n) => {
            const inner = (
              <>
                <span className="flex items-baseline gap-2">
                  {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="새 알림" />}
                  <span className="flex-1 font-medium">{n.title}</span>
                  <span className="shrink-0 text-xs text-zinc-500 tabular-nums">{when(n.created_at)}</span>
                </span>
                {n.body && <span className="text-xs text-zinc-500">{n.body}</span>}
              </>
            );
            const cls = "flex flex-col gap-0.5 px-4 py-3 text-sm";
            return (
              <li key={n.id}>
                {n.url ? <Link href={n.url} className={`${cls} hover:bg-zinc-100 dark:hover:bg-zinc-800`}>{inner}</Link> : <div className={cls}>{inner}</div>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">아직 알림이 없어요.</p>
      )}
    </main>
  );
}
