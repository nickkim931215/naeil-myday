"use client";

// ============================================================================
// SignaturePad — 마우스/터치로 자필 서명을 그리는 패드.
// 캔버스 픽셀은 투명(잉크 획만) → 그대로 선포문 종이 위에 자연스럽게 합성된다.
// 획이 바뀔 때마다 PNG dataURL을 onChange로 올려보낸다.
// ============================================================================

import { useRef } from "react";

const PAD_W = 680;
const PAD_H = 240;
const INK = "#181c26"; // 펜 잉크색

interface SignaturePadProps {
  /** 서명이 바뀔 때 PNG dataURL(없으면 null) */
  onChange: (dataUrl: string | null) => void;
}

export default function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const dirty = useRef(false);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * PAD_W,
      y: ((e.clientY - r.top) / r.height) * PAD_H,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    dirty.current = true;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (dirty.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, PAD_W, PAD_H);
    dirty.current = false;
    onChange(null);
  };

  return (
    <div className="w-full">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={PAD_W}
          height={PAD_H}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          style={{ aspectRatio: `${PAD_W} / ${PAD_H}` }}
          className="w-full touch-none cursor-crosshair rounded-xl border border-white/15 bg-ivory/95 shadow-inner"
        />
        {/* 서명 기준선 (실제 이미지에는 포함되지 않는 가이드) */}
        <div className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-dashed border-ink/25" />
        <span className="pointer-events-none absolute bottom-3 left-6 text-xs font-medium text-ink/40">
          여기에 서명하세요 ✍️
        </span>
      </div>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          data-sfx="pop"
          onClick={clear}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-crimson"
        >
          🧽 지우고 다시
        </button>
      </div>
    </div>
  );
}
