"use client";

import { useEffect, useRef, useState } from "react";
import { addSongComment, deleteSongComment, updateSongComment } from "@/app/song-actions";
import ConfirmButton from "@/components/ConfirmButton";
import { whenLabel } from "@/lib/schedule";

export type Comment = { id: string; body: string; created_at: string; user_id: string; users: { nickname: string } | null };

const field = "w-full resize-none rounded border bg-transparent px-3 py-2 text-sm leading-relaxed";
const link = "text-zinc-400 hover:text-foreground";

// 댓글 목록(오래된 순, 최신이 아래) + 쓰기. 열거나 새 댓글이 생기면 맨 아래로 스크롤
export default function CommentThread({ songId, comments, userId, isLeader }: { songId: string; comments: Comment[]; userId: string; isLeader: boolean }) {
  const list = useRef<HTMLUListElement>(null);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [comments.length]);

  return (
    <>
      {comments.length ? (
        <ul ref={list} data-autoscroll className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {comments.map((c) => (
            <li key={c.id} className="flex flex-col gap-1">
              <span className="flex items-baseline gap-2 text-xs">
                <span className="font-semibold">{c.users?.nickname ?? "알 수 없음"}</span>
                <span className="text-zinc-500 tabular-nums">{whenLabel(c.created_at)}</span>
                <span className="ml-auto flex gap-3">
                  {c.user_id === userId && editing !== c.id && (
                    <button type="button" className={link} onClick={() => setEditing(c.id)}>수정</button>
                  )}
                  {(c.user_id === userId || isLeader) && (
                    <form action={deleteSongComment.bind(null, c.id)}>
                      <ConfirmButton className={`${link} hover:text-rose-600`} message="이 댓글을 지울까요?" confirmLabel="지우기">
                        삭제
                      </ConfirmButton>
                    </form>
                  )}
                </span>
              </span>
              {editing === c.id ? (
                <form
                  action={async (fd) => {
                    await updateSongComment(c.id, fd);
                    setEditing(null);
                  }}
                  className="flex flex-col gap-2"
                >
                  <textarea name="body" defaultValue={c.body} required maxLength={500} rows={3} autoFocus className={field} />
                  <span className="flex justify-end gap-2 text-xs">
                    <button type="button" onClick={() => setEditing(null)} className="rounded border px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">취소</button>
                    <button className="rounded bg-accent px-3 py-1.5 font-medium text-accent-fg hover:brightness-110">저장</button>
                  </span>
                </form>
              ) : (
                <p className="whitespace-pre-wrap break-words leading-relaxed">{c.body}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-8 text-center text-zinc-500">아직 댓글이 없어요. 이 곡에 대한 생각을 남겨보세요.</p>
      )}
      <form action={addSongComment.bind(null, songId)} className="flex items-end gap-2 border-t px-5 py-4">
        <textarea name="body" required maxLength={500} rows={3} placeholder="댓글 쓰기" className={field} />
        <button className="shrink-0 rounded bg-accent px-4 py-2 font-medium text-accent-fg hover:brightness-110">등록</button>
      </form>
    </>
  );
}
