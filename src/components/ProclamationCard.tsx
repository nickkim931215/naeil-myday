"use client";

import { useEffect, useRef, useState } from "react";
import { formatKoreanDate } from "@/lib/holidays";
import {
  CARD_H,
  CARD_W,
  NAME_PRESETS,
  REASON_PRESETS,
  drawProclamation,
} from "@/lib/proclamation";
import ShareIcon from "./ShareIcon";
import { fallbackHint, shareCanvas } from "@/lib/share";

interface ProclamationCardProps {
  /** 선택된 "YYYY-MM-DD" */
  date: string;
  /** 공휴일 명칭 (부재중 탭과 공유) */
  name: string;
  onNameChange: (v: string) => void;
  onBack: () => void;
  onRestart: () => void;
}

const NAME_MAX = 22;
const REASON_MAX = 60;
const HOLDER_MAX = 12;

export default function ProclamationCard({
  date,
  name,
  onNameChange,
  onBack,
  onRestart,
}: ProclamationCardProps) {
  const [reason, setReason] = useState("");
  const [holder, setHolder] = useState("본인");
  const [saved, setSaved] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 입력이 바뀔 때마다 캔버스 다시 그리기 (미리보기 = 저장 이미지)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawProclamation(ctx, { date, name, reason, holder });
  }, [date, name, reason, holder]);

  const fillRandom = () => {
    const n = NAME_PRESETS[Math.floor(Math.random() * NAME_PRESETS.length)];
    const r = REASON_PRESETS[Math.floor(Math.random() * REASON_PRESETS.length)];
    onNameChange(n);
    setReason(r);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `나만의공휴일_선포문_${date}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  // 이미지를 네이티브 공유 시트로 (모바일: 인스타 스토리 등 바로 선택 가능)
  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const result = await shareCanvas(
      canvas,
      `나만의공휴일_선포문_${date}.png`,
      {
        title: "나만의 공휴일 선포문",
        text: "나라가 안 주면 내가 만드는 셀프 국경일! #나만의공휴일",
      }
    );
    if (result === "downloaded") {
      setShareMsg(fallbackHint("인스타 스토리"));
      window.setTimeout(() => setShareMsg(null), 6000);
    }
  };

  return (
    <div className="flex w-full max-w-5xl flex-col items-start gap-8 md:flex-row">
      {/* 미리보기 (캔버스 자체가 곧 저장 이미지) */}
      <div className="flex w-full flex-col items-center gap-3 md:w-auto">
        <div className="animate-stamp-in rounded-2xl bg-white/60 p-2 shadow-2xl shadow-indigo-200/60 ring-1 ring-black/5 dark:bg-white/5 dark:shadow-black/40">
          <canvas
            ref={canvasRef}
            width={CARD_W}
            height={CARD_H}
            className="h-auto w-[280px] rounded-xl sm:w-[320px]"
          />
        </div>
        <p className="text-xs text-slate-400">
          인스타 스토리 비율(9:16) · 실시간 미리보기
        </p>
      </div>

      {/* 입력 패널 */}
      <div className="w-full flex-1 rounded-3xl border border-black/5 bg-white/80 p-6 shadow-xl shadow-indigo-100 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-8">
        <div className="mb-5">
          <div className="text-sm font-semibold text-indigo-500">
            {formatKoreanDate(date)}
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
            나만의 공휴일 선포문 작성
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            아래를 채우면 오른쪽… 아니 위쪽 선포문이 실시간으로 완성돼요.
          </p>
        </div>

        {/* 선포 대상 */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            선포 대상 <span className="font-normal text-slate-400">(이름·별명)</span>
          </label>
          <input
            value={holder}
            maxLength={HOLDER_MAX}
            onChange={(e) => setHolder(e.target.value)}
            placeholder="본인"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
        </div>

        {/* 공휴일 명칭 */}
        <div className="mb-2">
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span>공휴일 명칭</span>
            <span className="font-normal text-slate-400">
              {name.length}/{NAME_MAX}
            </span>
          </label>
          <input
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="예: 엑셀 쳐다보지 않기의 날"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {NAME_PRESETS.slice(0, 5).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onNameChange(p.slice(0, NAME_MAX))}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-300"
            >
              {p}
            </button>
          ))}
        </div>

        {/* 선포 사유 */}
        <div className="mb-2">
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span>선포 사유</span>
            <span className="font-normal text-slate-400">
              {reason.length}/{REASON_MAX}
            </span>
          </label>
          <textarea
            value={reason}
            maxLength={REASON_MAX}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="예: 3일 연속 야근으로 인한 인류애 상실"
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          {REASON_PRESETS.slice(0, 4).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setReason(p.slice(0, REASON_MAX))}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300"
            >
              {p}
            </button>
          ))}
        </div>

        {/* 액션 */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:brightness-110 active:scale-[0.99] dark:shadow-none"
          >
            <ShareIcon /> 기록 이미지로 공유
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-base font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            {saved ? "저장 완료! 스토리에 올려보세요 🎉" : "이미지 저장 (9:16) ⬇"}
          </button>
          <button
            type="button"
            onClick={fillRandom}
            className="w-full rounded-2xl px-6 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-indigo-600 dark:text-slate-400"
          >
            🎲 문구 랜덤으로 채우기
          </button>
        </div>
        {shareMsg && (
          <p className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-center text-xs leading-5 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            {shareMsg}
          </p>
        )}

        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-center text-xs leading-5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300/90">
          저장한 선포문을 인스타 스토리에 올리고 친구를 태그해{" "}
          <b>“너도 선포해라”</b> 해보세요.
        </p>

        {/* 네비게이션 */}
        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={onBack}
            className="font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
          >
            ← 날짜 다시 고르기
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            처음부터
          </button>
        </div>
      </div>
    </div>
  );
}
