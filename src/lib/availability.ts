// 교집합 계산. 슬롯 문자열은 48글자 y/n/m (schedule.ts 참고)

export type Member = {
  id: string;
  base: string[]; // 요일별 7개, 0 = 월. 입력 안 한 요일은 "m" x 48
  exceptions: Record<string, string>; // 날짜별 덮어쓰기
  busy?: Record<string, [number, number][]>; // 다른 밴드 확정 합주 [start, end) → 불가 처리
};

export type Block = {
  date: string;
  start: number; // 슬롯 인덱스
  end: number; // exclusive
  members: string[]; // 블록 전체 시간 동안 계속 가능한 멤버
};

const EMPTY = "m".repeat(48);

// YYYY-MM-DD 문자열을 UTC로 다뤄서 타임존 영향 없게
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = new Date(start + "T00:00Z"); d <= new Date(end + "T00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// 그 날짜의 최종 상태: 예외 > 기본 시간표, 다른 밴드 확정 일정은 불가로 덮음
export function memberDay(m: Member, date: string): string {
  const day = (new Date(date + "T00:00Z").getUTCDay() + 6) % 7;
  const row = [...(m.exceptions[date] ?? m.base[day] ?? EMPTY)];
  for (const [s, e] of m.busy?.[date] ?? []) row.fill("n", s, e);
  return row.join("");
}

const popcount = (n: number) => {
  let c = 0;
  for (; n; n &= n - 1) c++;
  return c;
};

// 같은 멤버 집합이 처음부터 끝까지 계속 가능한 연속 구간만 블록으로 인정
// (중간에 사람이 바뀌는 구간은 합주 불가). 시간 방향으로 더 늘릴 수 없는 블록만 남김.
// 정렬: 인원 많은 순 → 긴 순 → 날짜/시간 빠른 순
export function findBlocks(
  members: Member[],
  dates: string[],
  { minSlots, minPeople }: { minSlots: number; minPeople: number },
): Block[] {
  const blocks: Block[] = [];
  for (const date of dates) {
    // masks[slot] = 그 슬롯에 가능한 멤버 비트마스크
    const masks = new Array<number>(48).fill(0);
    members.forEach((m, i) => {
      const row = memberDay(m, date);
      for (let s = 0; s < 48; s++) if (row[s] === "y") masks[s] |= 1 << i;
    });

    for (let s = 0; s < 48; s++) {
      let m = ~0;
      for (let e = s; e < 48; e++) {
        m &= masks[e];
        if (popcount(m) < Math.max(minPeople, 1)) break;
        const len = e + 1 - s;
        const extendsLeft = s > 0 && (masks[s - 1] & m) === m;
        const extendsRight = e + 1 < 48 && (masks[e + 1] & m) === m;
        if (len >= minSlots && !extendsLeft && !extendsRight) {
          blocks.push({ date, start: s, end: e + 1, members: members.filter((_, i) => m & (1 << i)).map((x) => x.id) });
        }
      }
    }
  }
  return blocks.sort(
    (a, b) =>
      b.members.length - a.members.length ||
      b.end - b.start - (a.end - a.start) ||
      a.date.localeCompare(b.date) ||
      a.start - b.start,
  );
}
