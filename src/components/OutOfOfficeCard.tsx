"use client";

import { useEffect, useRef, useState } from "react";
import { formatKoreanDate } from "@/lib/holidays";
import { NAME_PRESETS } from "@/lib/proclamation";
import { OOO_H, OOO_W, VIBES, drawOutOfOffice } from "@/lib/ooo";
import ShareIcon from "./ShareIcon";
import { fallbackHint, shareCanvas } from "@/lib/share";

interface OutOfOfficeCardProps {
  /** 선택된 "YYYY-MM-DD" */
  date: string;
  /** 공휴일 명칭 (선포문 탭과 공유) */
  name: string;
  onNameChange: (v: string) => void;
  onBack: () => void;
  onRestart: () => void;
}

const NAME_MAX = 22;
const MSG_MAX = 100;

export default function OutOfOfficeCard({
  date,
  name,
  onNameChange,
  onBack,
  onRestart,
}: OutOfOfficeCardProps) {
  const [vibeKey, setVibeKey] = useState(VIBES[0].key);
  // null이면 현재 무드 템플릿을 사용, 값이 있으면 사용자가 직접 수정한 것
  const [customMsg, setCustomMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const vibe = VIBES.find((v) => v.key === vibeKey) ?? VIBES[0];
  const holiday = name.trim() || "나만의 공휴일";
  const message = customMsg ?? vibe.message(holiday);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawOutOfOffice(ctx, { date, holiday: name, message, emoji: vibe.emoji });
  }, [date, name, message, vibe.emoji]);

  const pickVibe = (key: string) => {
    setVibeKey(key);
    setCustomMsg(null); // 무드를 바꾸면 해당 템플릿으로 초기화
  };

  const randomVibe = () => {
    const v = VIBES[Math.floor(Math.random() * VIBES.length)];
    pickVibe(v.key);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `나만의공휴일_부재중_${date}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  // 네이티브 공유 시트로 이미지 공유 (모바일: 인스타 등 바로 선택)
  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const result = await shareCanvas(canvas, `나만의공휴일_부재중_${date}.png`, {
      title: "나만의 공휴일 · 부재중",
      text: "오늘은 저의 셀프 국경일입니다. #나만의공휴일",
    });
    if (result === "downloaded") {
      setShareMsg(fallbackHint("프로필"));
      window.setTimeout(() => setShareMsg(null), 6000);
    }
  };

  return (
    <div className="flex w-full max-w-5xl flex-col items-start gap-8 md:flex-row">
      {/* 미리보기 */}
      <div className="flex w-full flex-col items-center gap-3 md:w-auto">
        <div className="animate-stamp-in rounded-2xl bg-white/60 p-2 shadow-2xl shadow-indigo-200/60 ring-1 ring-black/5 dark:bg-white/5 dark:shadow-black/40">
          <canvas
            ref={canvasRef}
            width={OOO_W}
            height={OOO_H}
            className="h-auto w-[300px] rounded-xl sm:w-[340px]"
          />
        </div>
        <p className="text-xs text-slate-400">
          정사각(1:1) · 카톡 프로필/피드에 딱
        </p>
      </div>

      {/* 입력 패널 */}
      <div className="w-full flex-1 rounded-3xl border border-black/5 bg-white/80 p-6 shadow-xl shadow-indigo-100 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-8">
        <div className="mb-5">
          <div className="text-sm font-semibold text-indigo-500">
            {formatKoreanDate(date)}
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
            부재중(OOO) 짤 만들기
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            말투를 고르면 멘트가 자동으로 채워져요. 직접 고쳐도 됩니다.
          </p>
        </div>

        {/* 공휴일 명칭 (선포문과 공유) */}
        <div className="mb-2">
          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            공휴일 명칭
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
          {NAME_PRESETS.slice(0, 4).map((p) => (
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

        {/* 말투(무드) 선택 */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            말투 고르기
          </label>
          <div className="flex flex-wrap gap-2">
            {VIBES.map((v) => {
              const active = v.key === vibeKey;
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => pickVibe(v.key)}
                  className={`flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-indigo-500 bg-indigo-500 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  }`}
                  aria-pressed={active}
                >
                  <span>{v.emoji}</span>
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 멘트 (수정 가능) */}
        <div className="mb-6">
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span>부재중 멘트</span>
            <span className="font-normal text-slate-400">
              {message.length}/{MSG_MAX}
            </span>
          </label>
          <textarea
            value={message}
            maxLength={MSG_MAX}
            onChange={(e) => setCustomMsg(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 leading-6 text-slate-800 outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
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
            {saved ? "저장 완료! 프로필에 올려보세요 🎉" : "이미지 저장 (1:1) ⬇"}
          </button>
          <button
            type="button"
            onClick={randomVibe}
            className="w-full rounded-2xl px-6 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-indigo-600 dark:text-slate-400"
          >
            🎲 말투 랜덤으로 바꾸기
          </button>
        </div>
        {shareMsg && (
          <p className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-center text-xs leading-5 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            {shareMsg}
          </p>
        )}

        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-center text-xs leading-5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300/90">
          카톡 프로필·업무 메일 서명(물론 장난용)에 걸어두고
          <br /> 오늘 하루 <b>합법적으로 잠수</b>하세요. 🤿
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
