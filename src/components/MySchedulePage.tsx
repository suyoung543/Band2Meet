"use client";

import { useRef, useState } from "react";
import ScheduleGrid, { Legend } from "./ScheduleGrid";
import MiniCalendar from "./MiniCalendar";
import { DAYS, Status, Week, dayIndex, encodeSlots } from "@/lib/schedule";
import { deleteException, saveBase, saveException } from "@/app/actions";

type Props = { initialBase: Week; initialExceptions: Record<string, Status[]> };

export default function MySchedulePage({ initialBase, initialExceptions }: Props) {
  const [tab, setTab] = useState<"base" | "exception">("base");
  const [base, setBase] = useState(initialBase);
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [date, setDate] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");

  // 드래그 중엔 칸마다 onChange가 오므로 400ms 멈추면 저장. key별로 따로 (기본 시간표 / 날짜마다)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef(0);
  const run = (key: string, fn: () => Promise<void>, delay = 400) => {
    clearTimeout(timers.current[key]);
    setSaveState("saving");
    timers.current[key] = setTimeout(async () => {
      pending.current++;
      try {
        await fn();
        if (--pending.current === 0) setSaveState((s) => (s === "error" ? s : "saved"));
      } catch {
        pending.current--;
        setSaveState("error");
      }
    }, delay);
  };

  const dateBase = date ? base[dayIndex(new Date(date + "T00:00"))] : null;
  const dateValues = date ? exceptions[date] ?? dateBase! : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">내 스케줄</h1>
        <span className={`text-xs ${saveState === "error" ? "text-rose-600" : "text-zinc-500"}`}>
          {{ saved: "저장됨", saving: "저장 중…", error: "저장 실패 — 새로고침 전에 다시 시도해 주세요" }[saveState]}
        </span>
      </div>

      <div className="flex gap-2 border-b">
        {(["base", "exception"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === t ? "border-accent font-medium" : "border-transparent text-zinc-500"
            }`}
          >
            {t === "base" ? "기본 시간표" : "날짜별 수정"}
          </button>
        ))}
      </div>

      <Legend />

      {tab === "base" ? (
        <ScheduleGrid
          columns={DAYS}
          values={base}
          onChange={(v) => {
            setBase(v);
            run("base", () => saveBase(v.map(encodeSlots)));
          }}
        />
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <MiniCalendar selected={date} marked={new Set(Object.keys(exceptions))} onSelect={setDate} />
          {date && dateValues ? (
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {date} ({DAYS[dayIndex(new Date(date + "T00:00"))]})
                  {exceptions[date] ? <span className="ml-2 text-orange-600">수정됨</span> : null}
                </span>
                <button
                  disabled={!exceptions[date]}
                  onClick={() => {
                    setExceptions((e) => {
                      const next = { ...e };
                      delete next[date];
                      return next;
                    });
                    run(date, () => deleteException(date), 0);
                  }}
                  className="rounded border px-2 py-1 hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-zinc-700"
                >
                  기본 시간표로 되돌리기
                </button>
              </div>
              <ScheduleGrid
                columns={[date.slice(5)]}
                values={[dateValues]}
                onChange={([col]) => {
                  setExceptions((e) => ({ ...e, [date]: col }));
                  run(date, () => saveException(date, encodeSlots(col)));
                }}
              />
            </div>
          ) : (
            <p className="text-sm text-zinc-500">캘린더에서 날짜를 선택하세요.</p>
          )}
        </div>
      )}
    </div>
  );
}
