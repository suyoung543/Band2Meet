"use client";

import { useState } from "react";

// 공지 미리보기 + 복사 버튼
export default function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <pre className="whitespace-pre-wrap rounded border bg-zinc-50 p-3 font-sans text-sm dark:bg-zinc-900">{text}</pre>
      <div className="flex items-center gap-2">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied("ok");
            } catch {
              setCopied("fail"); // http 등 클립보드 막힌 환경
            }
            setTimeout(() => setCopied(null), 2000);
          }}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110"
        >
          공지 복사
        </button>
        {copied === "ok" && <span className="text-sm text-zinc-500">복사됐어요. 카톡방에 붙여넣으세요.</span>}
        {copied === "fail" && <span className="text-sm text-rose-600">복사에 실패했어요. 위 글을 길게 눌러 직접 복사해 주세요.</span>}
      </div>
    </div>
  );
}
