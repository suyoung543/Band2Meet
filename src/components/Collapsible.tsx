"use client";

// <details>인데 안의 폼을 제출하면 자동으로 접힘 (펼침 메뉴가 저장 후에도 열려 있지 않게)
export default function Collapsible(props: React.ComponentProps<"details">) {
  return <details {...props} onSubmit={(e) => (e.currentTarget.open = false)} />;
}
