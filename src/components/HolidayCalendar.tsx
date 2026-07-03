"use client";

import { useMemo, useState } from "react";
import {
  DayInfo,
  DayStatus,
  SupportedYear,
  WEEKDAY_LABELS,
  getMonthDays,
  getStartMonth,
  getWeekday,
  toDateString,
} from "@/lib/holidays";

interface HolidayCalendarProps {
  year: SupportedYear;
  birthdayKey: string;
  selected: string | null;
  /** 유효한 순수 평일을 선택했을 때 */
  onSelect: (date: string) => void;
  /** 비활성 날짜를 클릭했을 때(철벽 방어 토스트용) */
  onReject: (info: DayInfo) => void;
}

// 상태별 유쾌한 거절 메시지
const REJECT_MESSAGE: Record<Exclude<DayStatus, "valid">, (r?: string) => string> =
  {
    weekend: (r) =>
      `${r}은 원래 쉬는 날이잖아요! 🙅 진정한 '나만의 공휴일'은 평범한 평일이어야 합니다.`,
    holiday: (r) =>
      `이미 ${r}이에요! 🎌 남들 다 쉬는 날 말고, 나만 쉬는 특별한 평일을 골라주세요.`,
    birthday: () =>
      `그날은 당신의 생일이잖아요! 🎂 생일은 이미 특별하니까, 지루한 평일 하나를 구제해줍시다.`,
  };

export function rejectMessage(info: DayInfo): string {
  if (info.status === "valid") return "";
  return REJECT_MESSAGE[info.status](info.reason);
}

const STATUS_STYLE: Record<DayStatus, string> = {
  valid:
    "bg-white/5 text-ivory hover:border-gold/50 hover:bg-gold/10 cursor-pointer",
  weekend:
    "bg-white/[0.02] text-muted/40 cursor-not-allowed",
  holiday:
    "bg-crimson/10 text-crimson/50 cursor-not-allowed",
  birthday:
    "bg-gold/[0.08] text-gold/55 cursor-not-allowed",
};

export default function HolidayCalendar({
  year,
  birthdayKey,
  selected,
  onSelect,
  onReject,
}: HolidayCalendarProps) {
  const startMonth = getStartMonth(year); // 시즌 시작 달 (2026: 8월)
  const [month, setMonth] = useState(startMonth); // 1~12
  const [shakeDate, setShakeDate] = useState<string | null>(null);

  const days = useMemo(
    () => getMonthDays(year, month, birthdayKey),
    [year, month, birthdayKey]
  );

  // 1일의 요일만큼 앞쪽 빈칸
  const leadingBlanks = getWeekday(toDateString(year, month, 1));

  const handleClick = (info: DayInfo) => {
    if (info.status === "valid") {
      onSelect(info.date);
      return;
    }
    // 철벽 방어: 흔들림 + 토스트
    setShakeDate(info.date);
    window.setTimeout(() => setShakeDate((cur) => (cur === info.date ? null : cur)), 400);
    onReject(info);
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/40 backdrop-blur">
      {/* 월 네비게이션 */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => Math.max(startMonth, m - 1))}
          disabled={month === startMonth}
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted transition hover:bg-white/10 hover:text-ivory disabled:opacity-30"
          aria-label="이전 달"
        >
          ‹
        </button>
        <div className="text-lg font-extrabold text-ivory">
          {year}년 {month}월
        </div>
        <button
          type="button"
          onClick={() => setMonth((m) => Math.min(12, m + 1))}
          disabled={month === 12}
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted transition hover:bg-white/10 hover:text-ivory disabled:opacity-30"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-bold">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={
              i === 0
                ? "text-crimson/80"
                : "text-muted/70"
            }
          >
            {label}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((info) => {
          const isSelected = selected === info.date;
          const isShaking = shakeDate === info.date;
          return (
            <button
              key={info.date}
              type="button"
              onClick={() => handleClick(info)}
              title={info.reason ?? "순수 평일 — 선택 가능!"}
              className={`relative aspect-square rounded-xl border text-sm font-semibold transition ${
                isSelected
                  ? "border-gold bg-gold text-ink shadow-md shadow-gold/20"
                  : `border-transparent ${STATUS_STYLE[info.status]}`
              } ${isShaking ? "animate-shake" : ""}`}
            >
              {info.day}
              {info.status === "valid" && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold" />
              )}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-gold" /> 선택 가능(순수 평일)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-crimson/70" /> 공휴일
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-gold/40" /> 생일
        </span>
      </div>
    </div>
  );
}
