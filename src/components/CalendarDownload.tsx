"use client";

// ============================================================================
// CalendarDownload — 나만의 공휴일이 포함된 인쇄용 월간 달력.
// 월을 넘겨보며 미리보기 → 마음에 들면 이 달 또는 전체(시즌 전체)를 A4 이미지로 저장.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { SupportedYear } from "@/lib/holidays";
import {
  CAL_H,
  CAL_W,
  drawMonthCalendar,
  getPrintableMonths,
  type MyHoliday,
} from "@/lib/printCalendar";
import { siteHost } from "@/lib/share";
import { sfx } from "@/lib/sfx";

interface CalendarDownloadProps {
  year: SupportedYear;
  birthdayKey?: string;
  myHoliday: MyHoliday;
  onBack: () => void;
  onRestart: () => void;
}

export default function CalendarDownload({
  year,
  birthdayKey,
  myHoliday,
  onBack,
  onRestart,
}: CalendarDownloadProps) {
  const months = getPrintableMonths(year);
  // 나만의 공휴일이 있는 달을 기본으로 열어준다
  const myMonth = Number(myHoliday.date.split("-")[1]);
  const initialIdx = Math.max(0, months.indexOf(myMonth));
  const [idx, setIdx] = useState(initialIdx);
  const [savedAll, setSavedAll] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const month = months[idx];

  // 미리보기 렌더
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawMonthCalendar(ctx, {
      year,
      month,
      birthdayKey,
      myHoliday,
      site: siteHost(),
    });
  }, [year, month, birthdayKey, myHoliday]);

  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(months.length - 1, i + 1));

  const filename = (m: number) =>
    `나만의공휴일_달력_${year}-${String(m).padStart(2, "0")}.png`;

  const downloadDataUrl = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 현재 보고 있는 달 저장
  const saveCurrent = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadDataUrl(canvas.toDataURL("image/png"), filename(month));
    sfx("sparkle");
  };

  // 시즌 전체(모든 달) 저장 — 오프스크린 캔버스에 순차 렌더 후 하나씩 내려받기
  const saveAll = () => {
    const off = document.createElement("canvas");
    off.width = CAL_W;
    off.height = CAL_H;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    const site = siteHost();
    months.forEach((m, i) => {
      // 브라우저가 연속 다운로드를 막지 않도록 약간의 간격을 둔다
      window.setTimeout(() => {
        drawMonthCalendar(ctx, { year, month: m, birthdayKey, myHoliday, site });
        downloadDataUrl(off.toDataURL("image/png"), filename(m));
      }, i * 350);
    });
    sfx("sparkle");
    setSavedAll(true);
    window.setTimeout(() => setSavedAll(false), 3000);
  };

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-5">
      {/* 월 네비게이션 */}
      <div className="flex w-full max-w-md items-center justify-between">
        <button
          type="button"
          onClick={prev}
          disabled={idx === 0}
          data-sfx="pop"
          aria-label="이전 달"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-ivory transition hover:border-gold/40 hover:text-gold disabled:opacity-30"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-lg font-extrabold text-ivory">
            {year}년 {month}월
          </div>
          <div className="text-xs text-muted">
            {idx + 1} / {months.length}개월 · 넘겨서 확인하세요
          </div>
        </div>
        <button
          type="button"
          onClick={next}
          disabled={idx === months.length - 1}
          data-sfx="pop"
          aria-label="다음 달"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-ivory transition hover:border-gold/40 hover:text-gold disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {/* 미리보기 (캔버스 = 저장 이미지) */}
      <div className="rounded-2xl bg-white/5 p-2 shadow-2xl shadow-black/50 ring-1 ring-gold/15">
        <canvas
          ref={canvasRef}
          width={CAL_W}
          height={CAL_H}
          className="h-auto w-[300px] rounded-lg bg-white sm:w-[360px]"
        />
      </div>
      <p className="text-xs text-muted">
        A4 세로 · 프린트해서 벽에 걸어도 좋아요
      </p>

      {/* 액션 */}
      <div className="flex w-full max-w-md flex-col gap-3">
        <button
          type="button"
          onClick={saveAll}
          className="w-full rounded-2xl bg-gradient-to-r from-gold to-crimson px-6 py-4 text-lg font-extrabold text-ink shadow-lg shadow-crimson/20 transition hover:brightness-110 active:scale-[0.99]"
        >
          {savedAll
            ? `저장 완료! (${months.length}장) 🎉`
            : `📅 전체 달력 저장 (${months.length}장 · A4)`}
        </button>
        <button
          type="button"
          onClick={saveCurrent}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-base font-bold text-ivory/90 transition hover:border-gold/40 hover:text-gold"
        >
          이 달만 저장 ({month}월) ⬇
        </button>
      </div>

      <p className="w-full max-w-md text-balance rounded-xl border border-gold/15 bg-gold/[0.07] px-4 py-3 text-center text-xs leading-5 text-gold/90">
        ⭐ 나만의 공휴일과 🎂 생일이 특별한 테두리로 표시돼요. 인쇄해서 나만의
        한 해 달력으로 써보세요!
      </p>

      {/* 네비게이션 */}
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="font-medium text-muted transition hover:text-ivory"
        >
          ← 날짜 다시 고르기
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="font-medium text-muted transition hover:text-ivory"
        >
          처음부터
        </button>
      </div>
    </div>
  );
}
