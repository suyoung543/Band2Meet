"use client";

import { useEffect, useRef } from "react";
import { STATUS_COLOR as COLOR, NEXT, STATUS_LABEL, Status, TIMES } from "@/lib/schedule";

type Props = {
  columns: string[]; // 열 제목 (요일 또는 날짜)
  values: Status[][]; // values[col][slot]
  onChange: (values: Status[][]) => void;
};

// 탭하면 가능→불가능→미정 순환. 누른 채로 드래그하면 첫 칸의 새 상태로 칠함.
export default function ScheduleGrid({ columns, values, onChange }: Props) {
  const paint = useRef<Status | null>(null);
  const latest = useRef(values);
  useEffect(() => {
    latest.current = values;
  });

  const set = (c: number, s: number, status: Status) => {
    if (latest.current[c][s] === status) return;
    const next = latest.current.map((col) => col.slice());
    next[c][s] = status;
    latest.current = next;
    onChange(next);
  };

  const cellAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const c = el?.dataset.c, s = el?.dataset.s;
    return c && s ? [Number(c), Number(s)] : null;
  };

  return (
    <div
      className="select-none overflow-auto max-h-[70vh] rounded border border-zinc-200 dark:border-zinc-700"
      onPointerUp={() => (paint.current = null)}
      onPointerLeave={() => (paint.current = null)}
      onPointerMove={(e) => {
        if (!paint.current) return;
        const hit = cellAt(e.clientX, e.clientY);
        if (hit) set(hit[0], hit[1], paint.current);
      }}
    >
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-10 bg-background">
          <tr>
            <th className="w-12" />
            {columns.map((c) => (
              <th key={c} className="py-1 font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIMES.map((t, s) => (
            <tr key={t}>
              <td className="pr-1 text-right align-top text-zinc-400 tabular-nums">
                {s % 2 === 0 ? t : ""}
              </td>
              {columns.map((_, c) => (
                <td
                  key={c}
                  data-c={c}
                  data-s={s}
                  title={`${t} ${STATUS_LABEL[values[c][s]]}`}
                  className={`h-5 touch-none border border-background cursor-pointer hover:brightness-110 ${COLOR[values[c][s]]}`}
                  onPointerDown={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId); // 터치에서도 move 이벤트가 다른 칸으로 가게
                    paint.current = NEXT[values[c][s]];
                    set(c, s, paint.current);
                  }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Legend() {
  return (
    <div className="flex gap-3 text-xs text-zinc-600 dark:text-zinc-400">
      {(Object.keys(COLOR) as Status[]).map((s) => (
        <span key={s} className="flex items-center gap-1">
          <span className={`inline-block h-3 w-3 rounded-sm border border-zinc-200 dark:border-zinc-700 ${COLOR[s]}`} />
          {STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}
