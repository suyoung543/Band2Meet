// 실행: npx tsx src/lib/availability.test.ts
import assert from "node:assert/strict";
import { Member, dateRange, findBlocks, memberDay } from "./availability";

// [from, to) 슬롯만 c, 나머지 m
const row = (from: number, to: number, c = "y") => "m".repeat(from) + c.repeat(to - from) + "m".repeat(48 - to);
const week = (r: string) => Array(7).fill(r);

assert.deepEqual(dateRange("2026-09-29", "2026-10-02"), ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);

// 2026-09-28은 월요일
const a: Member = { id: "a", base: week(row(20, 30)), exceptions: {} }; // 10:00~15:00
const b: Member = { id: "b", base: week(row(24, 34)), exceptions: { "2026-09-29": row(0, 48, "n") } }; // 12:00~17:00, 화요일은 전부 불가
const c: Member = { id: "c", base: week(row(20, 26)), exceptions: {}, busy: { "2026-09-28": [[22, 24]] } }; // 10:00~13:00, 월 11~12시 다른 밴드

assert.equal(memberDay(b, "2026-09-29"), "n".repeat(48));
assert.equal(memberDay(c, "2026-09-28").slice(20, 26), "yynnyy");

const mon = ["2026-09-28"];
// 전원 가능: 월요일엔 c가 11~12시에 빠져서 a∩b∩c = 12:00~13:00 (24~26) 한 시간
assert.deepEqual(findBlocks([a, b, c], mon, { minSlots: 2, minPeople: 3 }), [
  { date: "2026-09-28", start: 24, end: 26, members: ["a", "b", "c"] },
]);
// 최소 2시간(4칸)이면 전원 블록 없음
assert.deepEqual(findBlocks([a, b, c], mon, { minSlots: 4, minPeople: 3 }), []);
// 2명 이상: a+b 12:00~15:00이 가장 길고, 사람이 바뀌는 구간은 한 블록으로 합치지 않음
const two = findBlocks([a, b, c], mon, { minSlots: 4, minPeople: 2 });
assert.deepEqual(two[0], { date: "2026-09-28", start: 24, end: 30, members: ["a", "b"] });
assert.ok(two.every((x) => x.members.length >= 2 && x.end - x.start >= 4));
// 화요일엔 b가 전부 불가 → 전원 블록 없음, 월요일 것만
assert.deepEqual(
  findBlocks([a, b, c], ["2026-09-28", "2026-09-29"], { minSlots: 2, minPeople: 3 }).map((x) => x.date),
  ["2026-09-28"],
);
// 아무도 입력 안 했으면 결과 없음
assert.deepEqual(findBlocks([{ id: "x", base: [], exceptions: {} }], mon, { minSlots: 1, minPeople: 1 }), []);

console.log("availability ok");
