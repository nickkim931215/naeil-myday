"use client";

import { useState } from "react";
import { SUPPORTED_YEARS, SupportedYear, daysInMonth } from "@/lib/holidays";

export interface BirthdaySetup {
  year: SupportedYear;
  month: number;
  day: number;
}

interface BirthdayFormProps {
  /** 유효한 입력이 확정되면 호출 */
  onSubmit: (setup: BirthdaySetup) => void;
}

export default function BirthdayForm({ onSubmit }: BirthdayFormProps) {
  const [year, setYear] = useState<SupportedYear>(SUPPORTED_YEARS[0]);
  const [month, setMonth] = useState<number>(1);
  const [day, setDay] = useState<number>(1);

  const maxDay = daysInMonth(year, month);
  // 월을 바꿔 일수가 초과되면 보정
  const safeDay = Math.min(day, maxDay);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ year, month, day: safeDay });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-3xl border border-black/5 bg-white/80 p-8 shadow-xl shadow-indigo-100 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none"
    >
      <div className="mb-6 space-y-2">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          어느 해의 공휴일을 만들까요?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {SUPPORTED_YEARS.map((y) => {
            const active = y === year;
            return (
              <button
                key={y}
                type="button"
                onClick={() => setYear(y)}
                className={`rounded-2xl border px-4 py-3 text-lg font-bold transition ${
                  active
                    ? "border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                    : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                }`}
                aria-pressed={active}
              >
                {y}년
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-8 space-y-2">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          당신의 생일은 언제인가요?
          <span className="ml-1 font-normal text-slate-400">
            (생일은 공휴일 후보에서 제외돼요)
          </span>
        </label>
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-lg font-semibold text-slate-800 outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              aria-label="생일 월"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-slate-500 dark:text-slate-300">월</span>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <select
              value={safeDay}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-lg font-semibold text-slate-800 outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              aria-label="생일 일"
            >
              {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <span className="text-slate-500 dark:text-slate-300">일</span>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:brightness-110 active:scale-[0.99] dark:shadow-none"
      >
        나만의 공휴일 찾으러 가기 →
      </button>
    </form>
  );
}
