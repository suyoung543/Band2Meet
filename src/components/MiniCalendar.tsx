"use client";

import { useState } from "react";
import { toKey } from "@/lib/schedule";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"]; // 캘린더는 일요일 시작

type Props = {
  selected: string | null; // YYYY-MM-DD
  marked: Set<string>; // 예외가 있는 날짜
  onSelect: (key: string) => void;
};

export default function MiniCalendar({ selected, marked, onSelect }: Props) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const today = toKey(new Date());

  const first = month;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(first.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1)),
  ];

  const shift = (n: number) => setMonth(new Date(first.getFullYear(), first.getMonth() + n, 1));

  return (
    <div className="mx-auto w-full max-w-xs sm:mx-0">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="rounded px-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700" aria-label="이전 달">‹</button>
        <span className="font-medium">{first.getFullYear()}년 {first.getMonth() + 1}월</span>
        <button onClick={() => shift(1)} className="rounded px-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700" aria-label="다음 달">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {WEEK.map((d, i) => (
          <div key={d} className={`text-xs ${i === 0 ? "text-rose-400" : i === 6 ? "text-sky-400" : "text-zinc-400"}`}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = toKey(d);
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`relative aspect-square rounded ${
                key === selected ? "bg-accent text-accent-fg" : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
              } ${key === today ? "font-bold" : ""}`}
            >
              {d.getDate()}
              {marked.has(key) && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-orange-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
