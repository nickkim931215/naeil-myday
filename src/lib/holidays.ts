// ============================================================================
// 나만의 공휴일 — 공휴일 데이터 & 순수 평일 필터링 로직
// ----------------------------------------------------------------------------
// 대체공휴일까지 모두 포함한 2026/2027 법정 공휴일을 상수로 하드코딩했습니다.
// (한국천문연구원 기준 · 요일/대체공휴일 규칙으로 검증 완료)
//   - 설날/추석: 일요일과 겹칠 때만 대체공휴일
//   - 그 외(삼일절·어린이날·부처님오신날·광복절·개천절·한글날·성탄절): 토·일과 겹치면 대체공휴일
//   - 신정·현충일: 대체공휴일 없음
// ============================================================================

export type SupportedYear = 2026 | 2027;

export const SUPPORTED_YEARS: SupportedYear[] = [2026, 2027];

/**
 * 연도별 '시즌 시작일' — 이 날짜(포함) 이후의 날만 나만의 공휴일로 고를 수 있다.
 * 2026년은 서비스 공개 시점(2026년 8월)을 고려해 8/1부터 선택 가능하도록 제한한다.
 * (이미 지나간 1~7월은 후보에서 제외 — 달력 이동·랜덤 룰렛 모두에 적용)
 */
export const SEASON_START: Record<SupportedYear, string> = {
  2026: "2026-08-01",
  2027: "2027-01-01",
};

/** 해당 연도에 선택 가능한 첫 달 (1~12) */
export function getStartMonth(year: SupportedYear): number {
  return Number(SEASON_START[year].split("-")[1]);
}

export interface Holiday {
  /** "YYYY-MM-DD" */
  date: string;
  name: string;
  /** 대체공휴일 여부 */
  substitute?: boolean;
}

/** 2026년 법정 공휴일 + 대체공휴일 */
export const HOLIDAYS_2026: Holiday[] = [
  { date: "2026-01-01", name: "신정" },
  { date: "2026-02-16", name: "설날 연휴" },
  { date: "2026-02-17", name: "설날" },
  { date: "2026-02-18", name: "설날 연휴" },
  { date: "2026-03-01", name: "삼일절" },
  { date: "2026-03-02", name: "삼일절 대체공휴일", substitute: true },
  { date: "2026-05-05", name: "어린이날" },
  { date: "2026-05-24", name: "부처님오신날" },
  { date: "2026-05-25", name: "부처님오신날 대체공휴일", substitute: true },
  { date: "2026-06-06", name: "현충일" },
  { date: "2026-08-15", name: "광복절" },
  { date: "2026-08-17", name: "광복절 대체공휴일", substitute: true },
  { date: "2026-09-24", name: "추석 연휴" },
  { date: "2026-09-25", name: "추석" },
  { date: "2026-09-26", name: "추석 연휴" },
  { date: "2026-10-03", name: "개천절" },
  { date: "2026-10-05", name: "개천절 대체공휴일", substitute: true },
  { date: "2026-10-09", name: "한글날" },
  { date: "2026-12-25", name: "성탄절" },
];

/** 2027년 법정 공휴일 + 대체공휴일 */
export const HOLIDAYS_2027: Holiday[] = [
  { date: "2027-01-01", name: "신정" },
  { date: "2027-02-06", name: "설날 연휴" },
  { date: "2027-02-07", name: "설날" },
  { date: "2027-02-08", name: "설날 연휴" },
  { date: "2027-02-09", name: "설날 대체공휴일", substitute: true },
  { date: "2027-03-01", name: "삼일절" },
  { date: "2027-05-05", name: "어린이날" },
  { date: "2027-05-13", name: "부처님오신날" },
  { date: "2027-06-06", name: "현충일" },
  { date: "2027-08-15", name: "광복절" },
  { date: "2027-08-16", name: "광복절 대체공휴일", substitute: true },
  { date: "2027-09-14", name: "추석 연휴" },
  { date: "2027-09-15", name: "추석" },
  { date: "2027-09-16", name: "추석 연휴" },
  { date: "2027-10-03", name: "개천절" },
  { date: "2027-10-04", name: "개천절 대체공휴일", substitute: true },
  { date: "2027-10-09", name: "한글날" },
  { date: "2027-10-11", name: "한글날 대체공휴일", substitute: true },
  { date: "2027-12-25", name: "성탄절" },
  { date: "2027-12-27", name: "성탄절 대체공휴일", substitute: true },
];

export const HOLIDAYS_BY_YEAR: Record<SupportedYear, Holiday[]> = {
  2026: HOLIDAYS_2026,
  2027: HOLIDAYS_2027,
};

/** 연도별 "YYYY-MM-DD" → 공휴일 이름 조회 맵 */
const holidayMaps: Record<SupportedYear, Map<string, Holiday>> = {
  2026: new Map(HOLIDAYS_2026.map((h) => [h.date, h])),
  2027: new Map(HOLIDAYS_2027.map((h) => [h.date, h])),
};

// ---------------------------------------------------------------------------
// 날짜 유틸 (로컬 타임존 이슈를 피하려고 문자열/숫자 기반으로만 계산)
// ---------------------------------------------------------------------------

/** (year, month=1~12, day) → "YYYY-MM-DD" */
export function toDateString(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** "YYYY-MM-DD" → 요일 (0=일 … 6=토). UTC 기준으로 계산해 타임존 영향 제거 */
export function getWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 해당 월의 일수 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

// ---------------------------------------------------------------------------
// 핵심 판정 로직
// ---------------------------------------------------------------------------

export type DayStatus = "valid" | "weekend" | "holiday" | "birthday";

export interface DayInfo {
  date: string;
  day: number;
  weekday: number;
  status: DayStatus;
  /** 공휴일/생일 등 비활성 사유 (사용자 표시용) */
  reason?: string;
}

/** 생일 문자열 정규화: 사용자가 입력한 (month, day) → "MM-DD" */
export function toBirthdayKey(month: number, day: number): string {
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isWeekend(weekday: number): boolean {
  return weekday === 0 || weekday === 6;
}

/**
 * 특정 날짜가 "순수 평일"인지 판정한다.
 * @param dateStr    "YYYY-MM-DD"
 * @param year       기준 연도
 * @param birthdayKey "MM-DD" (선택)
 */
export function classifyDate(
  dateStr: string,
  year: SupportedYear,
  birthdayKey?: string
): DayInfo {
  const weekday = getWeekday(dateStr);
  const day = Number(dateStr.split("-")[2]);
  const mmdd = dateStr.slice(5); // "MM-DD"

  // 1) 생일 제외 (가장 먼저 안내해주는 게 자연스러움)
  if (birthdayKey && mmdd === birthdayKey) {
    return { date: dateStr, day, weekday, status: "birthday", reason: "당신의 생일" };
  }

  // 2) 주말 제외
  if (isWeekend(weekday)) {
    return {
      date: dateStr,
      day,
      weekday,
      status: "weekend",
      reason: weekday === 0 ? "일요일" : "토요일",
    };
  }

  // 3) 공휴일/대체공휴일 제외
  const holiday = holidayMaps[year].get(dateStr);
  if (holiday) {
    return { date: dateStr, day, weekday, status: "holiday", reason: holiday.name };
  }

  // 4) 순수 평일 ✅
  return { date: dateStr, day, weekday, status: "valid" };
}

/** 해당 월(1~12)의 모든 날짜 정보 */
export function getMonthDays(
  year: SupportedYear,
  month: number,
  birthdayKey?: string
): DayInfo[] {
  const total = daysInMonth(year, month);
  const result: DayInfo[] = [];
  for (let d = 1; d <= total; d++) {
    result.push(classifyDate(toDateString(year, month, d), year, birthdayKey));
  }
  return result;
}

/** 한 해 전체의 "순수 평일" 풀(pool) 반환 */
export function getValidWeekdays(
  year: SupportedYear,
  birthdayKey?: string
): string[] {
  const start = SEASON_START[year];
  const pool: string[] = [];
  for (let month = 1; month <= 12; month++) {
    const total = daysInMonth(year, month);
    for (let d = 1; d <= total; d++) {
      const dateStr = toDateString(year, month, d);
      // 시즌 시작 이전(예: 2026년 1~7월)은 후보에서 제외
      if (dateStr < start) continue;
      if (classifyDate(dateStr, year, birthdayKey).status === "valid") {
        pool.push(dateStr);
      }
    }
  }
  return pool;
}

/**
 * 순수 평일 풀에서 무작위로 하루를 뽑는다. (운명의 룰렛)
 * seed를 넘기면 결정적으로 동작(테스트/SSR 안전), 없으면 Math.random 사용.
 */
export function pickRandomWeekday(
  year: SupportedYear,
  birthdayKey?: string,
  seed?: number
): string | null {
  const pool = getValidWeekdays(year, birthdayKey);
  if (pool.length === 0) return null;
  const r = seed === undefined ? Math.random() : seed;
  const idx = Math.floor(r * pool.length) % pool.length;
  return pool[idx];
}

/** "YYYY-MM-DD" → "2026년 3월 17일 (화)" 형태의 한글 표기 */
export function formatKoreanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = WEEKDAY_LABELS[getWeekday(dateStr)];
  return `${y}년 ${m}월 ${d}일 (${weekday})`;
}
