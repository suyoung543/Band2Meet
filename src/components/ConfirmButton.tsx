"use client";

// 서버 액션 폼 안의 버튼. 누르면 확인 창을 띄우고 취소하면 제출 안 함
export default function ConfirmButton({ message, className, children }: { message: string; className?: string; children: React.ReactNode }) {
  return (
    <button className={className} onClick={(e) => !confirm(message) && e.preventDefault()}>
      {children}
    </button>
  );
}
