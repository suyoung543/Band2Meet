import { dateLabel, slotLabel } from "@/lib/schedule";

type Schedule = { date: string; start_slot: number; end_slot: number; place: string | null; todo: string | null; memo: string | null };

// 합주 공지 본문 (제목 줄 제외). 빈 항목은 줄째로 생략. 공지 복사와 알림 보내기가 같이 씀
export function noticeBody(s: Schedule) {
  const todos = (s.todo ?? "").split("\n").map((t) => t.trim()).filter(Boolean);
  return [
    `일정: ${dateLabel(s.date)} ${slotLabel(s.start_slot)}–${slotLabel(s.end_slot)} (${(s.end_slot - s.start_slot) / 2}시간)`,
    s.place && `합주실: ${s.place}`,
    todos.length > 0 && `\n할 일:\n${todos.map((t) => `- ${t.replace(/^[-•]\s*/, "")}`).join("\n")}`,
    s.memo && `\n메모: ${s.memo}`,
  ]
    .filter(Boolean)
    .join("\n");
}
