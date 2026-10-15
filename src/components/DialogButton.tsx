"use client";

import { useRef } from "react";

type Props = {
  label: React.ReactNode;
  title: string;
  className?: string;
  ariaLabel?: string;
  // large: 넓은 카드 + 오른쪽 위 X로 닫기 (아래 취소 버튼 없음), 폼을 제출해도 닫히지 않음 (댓글처럼 계속 쓰는 팝업)
  large?: boolean;
  children: React.ReactNode;
};

// 버튼을 누르면 팝업(<dialog>)이 열림. 기본은 안의 폼을 제출하거나 취소하면 닫힘
export default function DialogButton({ label, title, className, ariaLabel, large, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  const open = () => {
    ref.current?.showModal();
    // 열 때 data-autoscroll 목록은 맨 아래(최신)로
    ref.current?.querySelectorAll<HTMLElement>("[data-autoscroll]").forEach((el) => (el.scrollTop = el.scrollHeight));
  };
  return (
    <>
      <button type="button" className={className} aria-label={ariaLabel} onClick={open}>
        {label}
      </button>
      <dialog
        ref={ref}
        onSubmit={() => !large && close()}
        onClick={(e) => e.target === ref.current && close()} // 바깥(배경) 누르면 닫힘
        className={`m-auto whitespace-normal border bg-background text-left text-foreground backdrop:bg-black/50 ${
          large ? "w-[min(34rem,calc(100%-1.5rem))] rounded-xl p-0 text-sm font-normal shadow-xl" : "w-[min(22rem,calc(100%-2rem))] rounded-lg p-5"
        }`}
      >
        {large ? (
          <div className="flex max-h-[85dvh] flex-col">
            <div className="flex items-start gap-3 border-b px-5 py-4">
              <h3 className="flex-1 font-semibold">{title}</h3>
              <button type="button" onClick={close} aria-label="닫기" className="-m-1 rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {children}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold">{title}</h3>
            {children}
            <button type="button" onClick={close} className="self-end text-sm text-zinc-500 hover:text-foreground">
              취소
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
