export type Status = "yes" | "no" | "maybe";

// 가능 → 불가능 → 미정 → 가능
export const NEXT: Record<Status, Status> = { yes: "no", no: "maybe", maybe: "yes" };

export const STATUS_LABEL: Record<Status, string> = { yes: "가능", no: "불가능", maybe: "미정" };

export const STATUS_COLOR: Record<Status, string> = {
  yes: "bg-yes",
  no: "bg-rose-300",
  maybe: "bg-zinc-100 dark:bg-zinc-800",
};

export const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

// 00:00 ~ 23:30, 30분 단위 48칸
export const TIMES = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
);

// 요일별 슬롯 상태. basePattern[dayIdx][slotIdx], dayIdx 0 = 월
export type Week = Status[][];

export const emptyColumn = (): Status[] => TIMES.map(() => "maybe");
export const emptyWeek = (): Week => DAYS.map(emptyColumn);

// JS getDay()는 일=0 → 월=0 기준으로 변환
export const dayIndex = (d: Date) => (d.getDay() + 6) % 7;

// 로컬 기준 YYYY-MM-DD (toISOString은 UTC라 날짜가 밀림)
export const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// DB 저장 형식: 48글자 문자열 (y/n/m)
const TO_CHAR: Record<Status, string> = { yes: "y", no: "n", maybe: "m" };
const FROM_CHAR: Record<string, Status> = { y: "yes", n: "no", m: "maybe" };
export const encodeSlots = (col: Status[]) => col.map((s) => TO_CHAR[s]).join("");
export const decodeSlots = (row: string): Status[] => [...row].map((c) => FROM_CHAR[c]);

// 슬롯 경계 → "HH:MM". 48 = "24:00"
export const slotLabel = (i: number) => (i === 48 ? "24:00" : TIMES[i]);

// "2026-10-03" → "10/3 (토)"
export const dateLabel = (date: string) => {
  const d = new Date(date + "T00:00Z");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} (${DAYS[(d.getUTCDay() + 6) % 7]})`;
};

// 오늘 날짜 (한국 기준) YYYY-MM-DD. 서버가 UTC여도 맞게
export const kstToday = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

// 225 → "3:45"
export const durationLabel = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
