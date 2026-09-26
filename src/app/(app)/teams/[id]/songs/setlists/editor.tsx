"use client";

import { useState } from "react";
import { removeFromSetlist, saveItemMemo, saveSetlistOrder } from "@/app/song-actions";
import { durationLabel } from "@/lib/schedule";

export type Item = { song_id: string; title: string; artist: string | null; duration_sec: number | null; memo: string | null };

const small = "rounded border px-1.5 py-0.5 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30";

// 리더: 드래그(데스크톱) 또는 ▲▼(모바일)로 순서 변경, 곡별 메모 수정
export default function SetlistEditor({ setlistId, items: initial, isLeader }: { setlistId: string; items: Item[]; isLeader: boolean }) {
  const [items, setItems] = useState(initial);
  const [dragging, setDragging] = useState<number | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  // 서버에서 새 목록이 오면(곡 추가/삭제) 반영
  const [prev, setPrev] = useState(initial);
  if (prev !== initial) {
    setPrev(initial);
    setItems(initial);
  }

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;
    const next = [...items];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setItems(next);
    saveSetlistOrder(setlistId, next.map((i) => i.song_id));
  };

  const total = items.reduce((sum, i) => sum + (i.duration_sec ?? 0), 0);
  const unknown = items.filter((i) => !i.duration_sec).length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500">
        {items.length}곡 · 총 {durationLabel(total)}
        {unknown > 0 && ` (길이 모르는 곡 ${unknown}개 제외)`}
      </p>
      <ol className="flex flex-col divide-y rounded border">
        {items.map((it, i) => (
          <li
            key={it.song_id}
            draggable={isLeader}
            onDragStart={() => setDragging(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragging !== null) move(dragging, i);
              setDragging(null);
            }}
            onDragEnd={() => setDragging(null)}
            className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm ${isLeader ? "cursor-grab" : ""} ${dragging === i ? "opacity-40" : ""}`}
          >
            <span className="w-5 text-right text-zinc-400 tabular-nums">{i + 1}</span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">
                {it.title}
                {it.artist && <span className="ml-2 text-xs font-normal text-zinc-500">{it.artist}</span>}
              </span>
              {editing === it.song_id ? (
                <form
                  action={async (fd) => {
                    await saveItemMemo(setlistId, it.song_id, fd);
                    setEditing(null);
                  }}
                  className="mt-1 flex gap-1"
                >
                  <input name="memo" autoFocus defaultValue={it.memo ?? ""} placeholder="키 변경, 전환 큐, MR 유무 등" maxLength={300} className="flex-1 rounded border bg-transparent px-2 py-1 text-xs" />
                  <button className={small}>저장</button>
                </form>
              ) : (
                it.memo && <span className="text-xs text-zinc-500">{it.memo}</span>
              )}
            </div>
            <span className="text-xs text-zinc-500 tabular-nums">{it.duration_sec ? durationLabel(it.duration_sec) : "–"}</span>
            {isLeader && (
              <div className="flex gap-1">
                <button className={small} onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="위로">▲</button>
                <button className={small} onClick={() => move(i, i + 1)} disabled={i === items.length - 1} aria-label="아래로">▼</button>
                <button className={small} onClick={() => setEditing(editing === it.song_id ? null : it.song_id)}>메모</button>
                <button className={small} onClick={() => confirm(`"${it.title}"을(를) 셋리스트에서 뺄까요?`) && removeFromSetlist(setlistId, it.song_id)} aria-label="빼기">✕</button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
