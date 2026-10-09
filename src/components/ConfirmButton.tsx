"use client";

import { useRef } from "react";

type Props = {
  message: string; // 줄바꿈(\n) 그대로 표시
  className?: string;
  form?: string; // 다른 폼 안에 놓여야 할 때 제출할 폼의 id (폼은 중첩할 수 없어서)
  confirmLabel?: string; // 확인 버튼 글자 (기본 "확인")
  safe?: boolean; // 되돌릴 수 있는 동작이면 true → 확인 버튼을 빨강 대신 강조색으로
  onConfirm?: () => void; // 폼 제출 대신 실행할 함수
  children: React.ReactNode;
};

// 누르면 앱 자체 확인 팝업을 띄우고, [확인]을 눌러야 폼을 제출함 (시스템 confirm 대신)
export default function ConfirmButton({ message, className, form, confirmLabel = "확인", safe, onConfirm, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={ref}
        onClick={(e) => e.target === ref.current && close()} // 바깥(배경) 누르면 닫힘
        className="m-auto w-[min(20rem,calc(100%-2rem))] whitespace-normal rounded-xl border bg-background p-5 text-left text-sm font-normal text-foreground shadow-xl backdrop:bg-black/50"
      >
        <p className="whitespace-pre-line leading-relaxed">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={close} className="rounded border px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            취소
          </button>
          {/* 폼 안에 있으면 그 폼을, form이 있으면 그 id의 폼을 제출. 닫아도 제출은 계속됨 */}
          <button
            type={onConfirm ? "button" : "submit"}
            form={form}
            onClick={() => {
              onConfirm?.();
              close();
            }}
            className={`rounded px-4 py-2 font-medium hover:brightness-110 ${safe ? "bg-accent text-accent-fg" : "bg-danger text-white"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
