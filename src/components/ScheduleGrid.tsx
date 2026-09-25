"use client";

import { useEffect, useRef } from "react";
import { STATUS_COLOR as COLOR, NEXT, STATUS_LABEL, Status, TIMES } from "@/lib/schedule";

type Props = {
  columns: string[]; // 열 제목 (요일 또는 날짜)
  values: Status[][]; // values[col][slot]
  onChange: (values: Status[][]) => void;
  locked?: (string | null)[][]; // locked[col][slot] = 확정 합주 팀 이름 → 파란색, 수정 불가
};

// 탭하면 가능→불가능→미정 순환. 누른 채로 드래그하면 첫 칸의 새 상태로 칠함.
export default function ScheduleGrid({ columns, values, onChange, locked }: Props) {
  const paint = useRef<Status | null>(null);
  const latest = useRef(values);
  useEffect(() => {
    latest.current = values;
  });

  const set = (c: number, s: number, status: Status) => {
    if (locked?.[c]?.[s] || latest.current[c][s] === status) return;
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
  const paintAt = (x: number, y: number) => {
    if (!paint.current) return;
    const hit = cellAt(x, y);
    if (hit) set(hit[0], hit[1], paint.current);
  };

  // iOS 사파리는 touch-action: none을 무시하고 스크롤을 시작해버려서 pointer 이벤트가 취소됨.
  // 칠하는 중엔 touchmove를 직접 막고(passive: false) 거기서 칠함
  const box = useRef<HTMLDivElement>(null);
  const paintAtRef = useRef(paintAt);
  useEffect(() => {
    paintAtRef.current = paintAt;
  });
  useEffect(() => {
    const el = box.current!;
    const move = (e: TouchEvent) => {
      if (!paint.current) return;
      e.preventDefault();
      paintAtRef.current(e.touches[0].clientX, e.touches[0].clientY);
    };
    const end = () => (paint.current = null);
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  }, []);

  return (
    <div
      ref={box}
      className="select-none overflow-auto max-h-[70vh] rounded border border-zinc-200 dark:border-zinc-700"
      onPointerUp={() => (paint.current = null)}
      onPointerLeave={(e) => e.pointerType === "mouse" && (paint.current = null)}
      onPointerMove={(e) => paintAt(e.clientX, e.clientY)}
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
                  title={locked?.[c]?.[s] ? `${t} 합주: ${locked[c][s]}` : `${t} ${STATUS_LABEL[values[c][s]]}`}
                  className={`h-5 touch-none border border-background ${
                    locked?.[c]?.[s] ? "bg-accent" : `cursor-pointer hover:brightness-110 ${COLOR[values[c][s]]}`
                  }`}
                  onPointerDown={(e) => {
                    if (locked?.[c]?.[s]) return;
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

export function Legend({ rehearsal }: { rehearsal?: boolean }) {
  return (
    <div className="flex gap-3 text-xs text-zinc-600 dark:text-zinc-400">
      {(Object.keys(COLOR) as Status[]).map((s) => (
        <span key={s} className="flex items-center gap-1">
          <span className={`inline-block h-3 w-3 rounded-sm border border-zinc-200 dark:border-zinc-700 ${COLOR[s]}`} />
          {STATUS_LABEL[s]}
        </span>
      ))}
      {rehearsal && (
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent" />
          확정 합주
        </span>
      )}
    </div>
  );
}
