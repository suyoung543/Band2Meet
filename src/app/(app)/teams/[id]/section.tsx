// 대시보드/일정 탭 공용 구획. 부모의 divide-y로 섹션 사이에 가로선
export default function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 py-5 first:pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
