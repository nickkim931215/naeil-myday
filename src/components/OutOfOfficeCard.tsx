"use client";

import { useEffect, useRef, useState } from "react";
import { formatKoreanDate } from "@/lib/holidays";
import { NAME_PRESETS } from "@/lib/proclamation";
import { OOO_H, OOO_W, VIBES, drawOutOfOffice } from "@/lib/ooo";
import ShareIcon from "./ShareIcon";
import { fallbackHint, shareCanvas, shareLink, siteHost, siteUrl } from "@/lib/share";

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
    drawOutOfOffice(ctx, {
      date,
      holiday: name,
      message,
      emoji: vibe.emoji,
      site: siteHost(),
    });
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
      url: siteUrl(),
    });
    if (result.status === "downloaded") {
      setShareMsg(fallbackHint("프로필", result.reason));
      window.setTimeout(() => setShareMsg(null), 6000);
    }
  };

  // 사이트 링크 자체를 퍼뜨려 친구도 만들게 (바이럴 초대)
  const handleInvite = async () => {
    const r = await shareLink({
      title: "나만의 공휴일",
      text: "나라가 안 주면 내가 만든다! 너도 평일 하루 골라 공휴일 선포해봐 👇",
    });
    if (r === "copied") setShareMsg("초대 링크를 복사했어요! 친구에게 붙여넣기 하세요 📋");
    else if (r === "failed") setShareMsg("링크 공유에 실패했어요. 주소창의 URL을 복사해 보내주세요!");
    if (r === "copied" || r === "failed")
      window.setTimeout(() => setShareMsg(null), 5000);
  };

  return (
    <div className="flex w-full max-w-5xl flex-col items-start gap-8 md:flex-row">
      {/* 미리보기 */}
      <div className="flex w-full flex-col items-center gap-3 md:w-auto">
        <div className="animate-stamp-in rounded-2xl bg-white/5 p-2 shadow-2xl shadow-black/50 ring-1 ring-gold/15">
          <canvas
            ref={canvasRef}
            width={OOO_W}
            height={OOO_H}
            className="h-auto w-[300px] rounded-xl sm:w-[340px]"
          />
        </div>
        <p className="text-xs text-muted">
          정사각(1:1) · 카톡 프로필/피드에 딱
        </p>
      </div>

      {/* 입력 패널 */}
      <div className="w-full flex-1 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
        <div className="mb-5">
          <div className="text-sm font-semibold text-gold">
            {formatKoreanDate(date)}
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-ivory">
            부재중(OOO) 짤 만들기
          </h2>
          <p className="mt-1 text-sm text-muted">
            말투를 고르면 멘트가 자동으로 채워져요. 직접 고쳐도 됩니다.
          </p>
        </div>

        {/* 공휴일 명칭 (선포문과 공유) */}
        <div className="mb-2">
          <label className="mb-1.5 block text-sm font-semibold text-ivory/90">
            공휴일 명칭
          </label>
          <input
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="예: 엑셀 쳐다보지 않기의 날"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-ivory outline-none transition placeholder:text-muted/50 focus:border-gold"
          />
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {NAME_PRESETS.slice(0, 4).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onNameChange(p.slice(0, NAME_MAX))}
              className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition hover:bg-gold/20"
            >
              {p}
            </button>
          ))}
        </div>

        {/* 말투(무드) 선택 */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-semibold text-ivory/90">
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
                      ? "border-gold bg-gold text-ink shadow-sm"
                      : "border-white/10 bg-white/5 text-muted hover:border-gold/40 hover:text-ivory"
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
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ivory/90">
            <span>부재중 멘트</span>
            <span className="font-normal text-muted">
              {message.length}/{MSG_MAX}
            </span>
          </label>
          <textarea
            value={message}
            maxLength={MSG_MAX}
            onChange={(e) => setCustomMsg(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 leading-6 text-ivory outline-none transition placeholder:text-muted/50 focus:border-gold"
          />
        </div>

        {/* 액션 */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-crimson px-6 py-4 text-lg font-extrabold text-ink shadow-lg shadow-crimson/20 transition hover:brightness-110 active:scale-[0.99]"
          >
            <ShareIcon /> 기록 이미지로 공유
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-base font-bold text-ivory/90 transition hover:border-gold/40 hover:text-gold"
          >
            {saved ? "저장 완료! 프로필에 올려보세요 🎉" : "이미지 저장 (1:1) ⬇"}
          </button>
          <button
            type="button"
            onClick={randomVibe}
            className="w-full rounded-2xl px-6 py-2.5 text-sm font-semibold text-muted transition hover:text-gold"
          >
            🎲 말투 랜덤으로 바꾸기
          </button>
        </div>
        {shareMsg && (
          <p className="mt-3 rounded-xl border border-gold/15 bg-gold/10 px-4 py-3 text-center text-xs leading-5 text-gold">
            {shareMsg}
          </p>
        )}

        <button
          type="button"
          onClick={handleInvite}
          className="mt-3 w-full rounded-2xl border border-gold/30 bg-gold/10 px-6 py-3 text-sm font-bold text-gold transition hover:bg-gold/20"
        >
          🔗 친구 소환하기 (초대 링크 공유)
        </button>

        <p className="mt-4 rounded-xl border border-gold/15 bg-gold/[0.07] px-4 py-3 text-center text-xs leading-5 text-gold/90">
          카톡 프로필·업무 메일 서명(물론 장난용)에 걸어두고
          <br /> 오늘 하루 <b>합법적으로 잠수</b>하세요. 🤿
        </p>

        {/* 네비게이션 */}
        <div className="mt-5 flex items-center justify-between text-sm">
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
    </div>
  );
}
