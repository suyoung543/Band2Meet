import Link from "next/link";
import { dateRange, findBlocks } from "@/lib/availability";
import { dateLabel, slotLabel } from "@/lib/schedule";
import Section from "./section";
import { loadAvailability, loadTeam } from "@/lib/team";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

// 마감까지 남은 날 (한국 날짜 기준)
function dDay(deadline: string) {
  const kst = (t: number) => Math.floor((t + 9 * 3600_000) / 86400_000);
  const d = kst(Date.parse(deadline)) - kst(Date.now());
  return d > 0 ? `D-${d}` : d === 0 ? "오늘 마감" : "마감됨";
}

export default async function DashboardPage({ params, searchParams }: PageProps<"/teams/[id]">) {
  const { id } = await params;
  const { team, active } = await loadTeam(id);
  const total = active.length;
  const nick = new Map(active.map((m) => [m.user_id, m.users.nickname]));

  if (!team.collect_start || !team.collect_end) {
    return (
      <p className="text-sm text-zinc-500">
        아직 수합 기간이 정해지지 않았어요.{" "}
        <Link href={`/teams/${id}/settings`} className="text-accent underline">수합 설정하기</Link>
      </p>
    );
  }

  const q = await searchParams;
  const minPeople = Math.min(Math.max(Number(q.min) || total, 1), total);
  const dates = dateRange(team.collect_start, team.collect_end);
  const members = await loadAvailability(id, active.map((m) => m.user_id), team.collect_start, team.collect_end);

  const blocks = findBlocks(members, dates, { minSlots: team.min_block_slots, minPeople });
  // 히트맵: 날짜별로 최소 연속 시간 이상 함께 가능한 최대 인원
  const best = new Map<string, number>();
  for (const b of findBlocks(members, dates, { minSlots: team.min_block_slots, minPeople: 1 })) {
    best.set(b.date, Math.max(best.get(b.date) ?? 0, b.members.length));
  }
  const filled = members.filter((m) => m.filled).length;

  return (
    <div className="flex flex-col divide-y">
      <Section title="수합 정보">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-zinc-500">수합 기간</dt>
          <dd>{dateLabel(team.collect_start)} ~ {dateLabel(team.collect_end)}</dd>
          <dt className="text-zinc-500">입력 마감</dt>
          <dd>
            {team.deadline ? (
              <>
                {deadlineLabel(team.deadline)} <span className="ml-1 text-orange-600">{dDay(team.deadline)}</span>
              </>
            ) : (
              <span className="text-zinc-400">없음</span>
            )}
          </dd>
          <dt className="text-zinc-500">최소 합주 시간</dt>
          <dd>{team.min_block_slots / 2}시간 이상</dd>
        </dl>
      </Section>

      <Section title={`입력 현황 ${filled}/${total}`}>
        <div className="flex flex-wrap gap-2 text-xs">
          {members.map((m) => (
            <span key={m.id} className={`rounded-full border px-2 py-1 ${m.filled ? "" : "border-dashed text-zinc-400"}`}>
              {m.filled ? "✓ " : ""}{nick.get(m.id)}
            </span>
          ))}
        </div>
      </Section>

      <Section title="함께 가능한 날">
        <div className="flex flex-wrap justify-center gap-8">
          {months(dates).map((month) => (
            <Heatmap key={month} month={month} dates={new Set(dates)} best={best} total={total} teamId={id} />
          ))}
        </div>
      </Section>

      <Section
        title="후보 시간"
        right={
          <div className="flex gap-1 text-xs">
            {Array.from({ length: total }, (_, i) => total - i).map((n) => (
              <Link
                key={n}
                href={`/teams/${id}?min=${n}`}
                scroll={false}
                className={`rounded-full border px-2 py-0.5 ${n === minPeople ? "border-accent bg-accent text-accent-fg" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                {n === total ? `전원 ${n}명` : `${n}명 이상`}
              </Link>
            ))}
          </div>
        }
      >
        {blocks.length ? (
          <ul className="flex flex-col divide-y rounded border">
            {blocks.slice(0, 30).map((b) => {
              const missing = active.filter((m) => !b.members.includes(m.user_id)).map((m) => m.users.nickname);
              return (
                <li key={`${b.date}-${b.start}-${b.members.join()}`}>
                  <Link href={`/teams/${id}/dates/${b.date}?min=${minPeople}`} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <span className="font-medium">{dateLabel(b.date)}</span>
                    <span>{slotLabel(b.start)}–{slotLabel(b.end)}</span>
                    <span className="text-zinc-500">{(b.end - b.start) / 2}시간</span>
                    <span className="ml-auto text-xs text-zinc-500">
                      {b.members.length}/{total}명{missing.length ? ` · 빠짐: ${missing.join(", ")}` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">
            조건에 맞는 시간이 없어요. {minPeople > 1 ? "인원 조건을 낮춰 보세요." : "멤버들이 가능한 시간을 입력해야 해요."}
          </p>
        )}
      </Section>
    </div>
  );
}

// 마감 시각을 한국 시간으로 "9/30 (수) 23:00"
function deadlineLabel(iso: string) {
  const kst = new Date(Date.parse(iso) + 9 * 3600_000).toISOString();
  return `${dateLabel(kst.slice(0, 10))} ${kst.slice(11, 16)}`;
}

// "2026-10" 목록
const months = (dates: string[]) => [...new Set(dates.map((d) => d.slice(0, 7)))];

function Heatmap(props: { month: string; dates: Set<string>; best: Map<string, number>; total: number; teamId: string }) {
  const [y, m] = props.month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [
    ...Array(first.getUTCDay()).fill(null),
    ...Array.from({ length: days }, (_, i) => `${props.month}-${String(i + 1).padStart(2, "0")}`),
  ];

  return (
    <div className="w-full max-w-sm">
      <div className="mb-1 text-sm font-medium">{y}년 {m}월</div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEK.map((d, i) => (
          <div key={d} className={i === 0 ? "text-rose-400" : i === 6 ? "text-sky-400" : "text-zinc-400"}>{d}</div>
        ))}
        {cells.map((date, i) => {
          if (!date || !props.dates.has(date)) {
            return <div key={i} className="aspect-square p-1 text-zinc-300 dark:text-zinc-700">{date ? Number(date.slice(8)) : ""}</div>;
          }
          const n = props.best.get(date) ?? 0;
          const all = n === props.total;
          return (
            <Link
              key={date}
              href={`/teams/${props.teamId}/dates/${date}`}
              title={`${n}/${props.total}명 가능`}
              className={`flex aspect-square flex-col items-center justify-center rounded hover:ring-2 hover:ring-accent ${all ? "font-bold" : ""}`}
              // 인원 비율만큼 초록 진하게
              style={{ background: n ? `color-mix(in srgb, var(--yes) ${Math.round((n / props.total) * 100)}%, transparent)` : undefined }}
            >
              {Number(date.slice(8))}
              <span className="text-[10px] leading-none opacity-70">{n ? `${n}명` : ""}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
