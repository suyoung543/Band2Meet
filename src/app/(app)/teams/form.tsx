import Link from "next/link";

// 팀 만들기 / 초대코드 참여 공용 한 줄 폼 페이지
export default function SingleFieldForm(props: {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  name: string;
  placeholder: string;
  submit: string;
  error?: string;
  maxLength?: number;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <Link href="/" className="text-sm text-zinc-500 hover:text-foreground">← 내 밴드</Link>
      <h1 className="text-xl font-semibold">{props.title}</h1>
      <p className="text-sm text-zinc-500">{props.description}</p>
      {props.error && <p className="text-sm text-rose-600">{props.error}</p>}
      <form action={props.action} className="flex gap-2">
        <input
          name={props.name}
          placeholder={props.placeholder}
          required
          autoFocus
          maxLength={props.maxLength}
          className="flex-1 rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
        <button className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110">{props.submit}</button>
      </form>
    </main>
  );
}
