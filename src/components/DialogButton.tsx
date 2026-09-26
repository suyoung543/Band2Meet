"use client";

import { useRef } from "react";

// 글씨 버튼을 누르면 팝업(<dialog>)이 열림. 안의 폼을 제출하거나 취소하면 닫힘
export default function DialogButton({ label, title, className, children }: { label: string; title: string; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={ref}
        onSubmit={() => ref.current?.close()}
        onClick={(e) => e.target === ref.current && ref.current?.close()} // 바깥(배경) 누르면 닫힘
        className="m-auto w-[min(22rem,calc(100%-2rem))] whitespace-normal rounded-lg border bg-background p-5 text-left text-foreground backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4">
          <h3 className="font-semibold">{title}</h3>
          {children}
          <button type="button" onClick={() => ref.current?.close()} className="self-end text-sm text-zinc-500 hover:text-foreground">
            취소
          </button>
        </div>
      </dialog>
    </>
  );
}
