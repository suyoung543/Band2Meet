import Tabs from "@/components/Tabs";

export default async function SongsLayout({ children, params }: LayoutProps<"/teams/[id]/songs">) {
  const { id } = await params;
  const base = `/teams/${id}/songs`;
  return (
    <div className="flex flex-col gap-4">
      <Tabs
        small
        tabs={[
          { href: base, label: "후보함" },
          { href: `${base}/practice`, label: "연습 중" },
          { href: `${base}/setlists`, label: "셋리스트" },
        ]}
      />
      {children}
    </div>
  );
}
