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
import SignaturePad from "./SignaturePad";
import { fallbackHint, shareCanvas, shareLink, siteHost, siteUrl } from "@/lib/share";
import { sfx } from "@/lib/sfx";

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
  const [sigImg, setSigImg] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 서명 dataURL → 로드된 이미지로 변환 (캔버스에 그리려면 로드가 끝나야 함)
  const handleSignature = (dataUrl: string | null) => {
    if (!dataUrl) {
      setSigImg(null);
      return;
    }
    const img = new Image();
    img.onload = () => setSigImg(img);
    img.src = dataUrl;
  };

  // 입력이 바뀔 때마다 캔버스 다시 그리기 (미리보기 = 저장 이미지)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawProclamation(ctx, {
      date,
      name,
      reason,
      holder,
      site: siteHost(),
      signature: sigImg,
    });
  }, [date, name, reason, holder, sigImg]);

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
    sfx("sparkle"); // 저장 완료 축포음
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
        url: siteUrl(),
      }
    );
    if (result.status === "shared") sfx("sparkle");
    if (result.status === "downloaded") {
      setShareMsg(fallbackHint("인스타 스토리", result.reason));
      window.setTimeout(() => setShareMsg(null), 6000);
    }
  };

  // 사이트 링크 자체를 퍼뜨려 친구도 만들게 (바이럴 초대)
  const handleInvite = async () => {
    const r = await shareLink({
      title: "나만의 공휴일",
      text: "나라가 안 주면 내가 만든다! 너도 평일 하루 골라 공휴일 선포해봐 👇",
    });
    if (r === "shared" || r === "copied") sfx("sparkle");
    if (r === "copied") setShareMsg("초대 링크를 복사했어요! 친구에게 붙여넣기 하세요 📋");
    else if (r === "failed") setShareMsg("링크 공유에 실패했어요. 주소창의 URL을 복사해 보내주세요!");
    if (r === "copied" || r === "failed")
      window.setTimeout(() => setShareMsg(null), 5000);
  };

  return (
    <div className="flex w-full max-w-5xl flex-col items-start gap-8 md:flex-row">
      {/* 미리보기 (캔버스 자체가 곧 저장 이미지) */}
      <div className="flex w-full flex-col items-center gap-3 md:w-auto">
        <div className="animate-stamp-in rounded-2xl bg-white/5 p-2 shadow-2xl shadow-black/50 ring-1 ring-gold/15">
          <canvas
            ref={canvasRef}
            width={CARD_W}
            height={CARD_H}
            className="h-auto w-[280px] rounded-xl sm:w-[320px]"
          />
        </div>
        <p className="text-xs text-muted">
          인스타 스토리 비율(9:16) · 실시간 미리보기
        </p>
      </div>

      {/* 입력 패널 */}
      <div className="w-full flex-1 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
        <div className="mb-5">
          <div className="text-sm font-semibold text-gold">
            {formatKoreanDate(date)}
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-ivory">
            나만의 공휴일 선포문 작성
          </h2>
          <p className="mt-1 text-sm text-muted">
            아래를 채우면 오른쪽… 아니 위쪽 선포문이 실시간으로 완성돼요.
          </p>
        </div>

        {/* 선포 대상 */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-semibold text-ivory/90">
            선포 대상 <span className="font-normal text-muted">(이름·별명)</span>
          </label>
          <input
            value={holder}
            maxLength={HOLDER_MAX}
            onChange={(e) => setHolder(e.target.value)}
            placeholder="본인"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-ivory outline-none transition placeholder:text-muted/50 focus:border-gold"
          />
        </div>

        {/* 공휴일 명칭 */}
        <div className="mb-2">
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ivory/90">
            <span>공휴일 명칭</span>
            <span className="font-normal text-muted">
              {name.length}/{NAME_MAX}
            </span>
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
          {NAME_PRESETS.slice(0, 5).map((p) => (
            <button
              key={p}
              type="button"
              data-sfx="select"
              onClick={() => onNameChange(p.slice(0, NAME_MAX))}
              className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition hover:bg-gold/20"
            >
              {p}
            </button>
          ))}
        </div>

        {/* 선포 사유 */}
        <div className="mb-2">
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ivory/90">
            <span>선포 사유</span>
            <span className="font-normal text-muted">
              {reason.length}/{REASON_MAX}
            </span>
          </label>
          <textarea
            value={reason}
            maxLength={REASON_MAX}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="예: 3일 연속 야근으로 인한 인류애 상실"
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-ivory outline-none transition placeholder:text-muted/50 focus:border-gold"
          />
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          {REASON_PRESETS.slice(0, 4).map((p) => (
            <button
              key={p}
              type="button"
              data-sfx="select"
              onClick={() => setReason(p.slice(0, REASON_MAX))}
              className="rounded-full border border-crimson/25 bg-crimson/10 px-3 py-1.5 text-xs font-medium text-crimson transition hover:bg-crimson/20"
            >
              {p}
            </button>
          ))}
        </div>

        {/* 결재 서명 — 공문서에 사인하듯 */}
        <div className="mb-6">
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ivory/90">
            <span>✍️ 결재 서명</span>
            <span className="font-normal text-muted">선포문 하단에 새겨져요</span>
          </label>
          <SignaturePad onChange={handleSignature} />
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
            {saved ? "저장 완료! 스토리에 올려보세요 🎉" : "이미지 저장 (9:16) ⬇"}
          </button>
          <button
            type="button"
            data-sfx="dice"
            onClick={fillRandom}
            className="w-full rounded-2xl px-6 py-2.5 text-sm font-semibold text-muted transition hover:text-gold"
          >
            🎲 문구 랜덤으로 채우기
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
          저장한 선포문을 인스타 스토리에 올리고 친구를 태그해{" "}
          <b>“너도 선포해라”</b> 해보세요.
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
